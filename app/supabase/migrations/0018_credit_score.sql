-- 신용 점수 (FR-097~102, 신용점수기획서 TI-CRD-001)
--
-- 원칙
-- - 점수는 서버 한 곳에서만 계산한다(credit_day). 앱은 점수를 받아 등급·칭호·꼬리표를 보여 준다.
-- - 하루 한 번(0시 10분, 한국) 어제까지 확정해 credit_daily에 남긴다. 인증은 24시간 뒤에 결과가 정해지므로
--   매번 최근 3일을 다시 계산한다. 오늘 점수는 부를 때(my_credit) 계산한다.
-- - 기존 사용자는 이 마이그레이션 날 600점에서 시작한다(2026-11-24 사용자 결정). 새 사용자는 가입한 날 600점.
-- - 다른 사람의 이름은 전체 순위표에서 서버가 첫 글자만 남겨 돌려준다.
--
-- 한계: 기한을 미룬 할 일은 지금 기한으로 연체를 되짚는다(데이터설계서 3.7절과 같은 한계).

alter table public.profiles
  add column credit_start date not null default (now() at time zone 'Asia/Seoul')::date,
  add column credit_score integer not null default 600 check (credit_score between 0 and 1000);

comment on column public.profiles.credit_start is '신용 점수를 세기 시작한 날(한국 날짜). 이날 600점에서 시작한다 (FR-097)';
comment on column public.profiles.credit_score is '어제까지 확정한 신용 점수. 순위표 정렬에 쓴다 (FR-097, 101)';

create table public.credit_daily (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  score integer not null check (score between 0 and 1000),
  delta integer not null,
  gained integer not null,
  lost integer not null,
  parts jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  primary key (user_id, day)
);
comment on table public.credit_daily is '하루 끝 신용 점수와 내역. 서버만 쓴다 (FR-097, 100)';

alter table public.credit_daily enable row level security;
create policy "credit_daily: 본인 것만 조회" on public.credit_daily
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 하루 계산. p_prev: 그날 시작 점수
-- ---------------------------------------------------------------------------
create function public.credit_day(p_user uuid, p_day date, p_prev integer)
returns table (score integer, gained integer, lost integer, parts jsonb)
language plpgsql stable security definer set search_path = ''
as $$
declare
  on_time integer;
  late_done integer;
  verified integer;
  streak_bonus integer;
  overdue integer;
  give_up integer;
  idle integer := 0;
  is_bankrupt boolean;
  last_active date;
  has_open boolean;
  g integer;
  l integer;
  s integer;
begin
  -- 기한 안에 끝냄: 10 + 중요도 × 2, 늦게 끝냄: +3
  select coalesce(sum(10 + greatest(1, least(5, r.principal / 1000)) * 2) filter (where r.overdue_days = 0), 0)::integer,
         (count(*) filter (where r.overdue_days > 0) * 3)::integer
    into on_time, late_done
    from public.repayments r
   where r.user_id = p_user and r.kind = 'repaid' and r.deleted_at is null and r.settled_on = p_day;

  -- 그룹 인증 통과: 그날 끝낸 상환마다 한 번 +5 (여러 그룹에 올려도 한 번)
  select (count(distinct r.id) * 5)::integer into verified
    from public.repayments r
    join public.proofs p on p.repayment_id = r.id and p.hidden_at is null
   where r.user_id = p_user and r.deleted_at is null and r.settled_on = p_day
     and public.proof_state(p.created_at,
           (select count(*)::integer from public.proof_votes v where v.proof_id = p.id and v.vote = 'approve'),
           (select count(*)::integer from public.proof_votes v where v.proof_id = p.id and v.vote = 'doubt')) = 'passed';

  -- 기한 안에 5번 연속: 5번마다 +10. 늦게 끝내거나 포기하면 끊긴다(savings.ts의 연속 기록과 같은 순서)
  with ev as (
    select r.id, r.settled_on as d, (r.kind = 'repaid' and r.overdue_days = 0) as ok
      from public.repayments r
     where r.user_id = p_user and r.deleted_at is null and r.settled_on <= p_day
  ),
  grouped as (
    select ev.*, sum(case when ev.ok then 0 else 1 end) over (order by ev.d, (not ev.ok), ev.id rows unbounded preceding) as grp
      from ev
  ),
  counted as (
    select grouped.*, sum(case when grouped.ok then 1 else 0 end) over (partition by grouped.grp order by grouped.d, (not grouped.ok), grouped.id rows unbounded preceding) as run
      from grouped
  )
  select (count(*) * 10)::integer into streak_bonus
    from counted c where c.d = p_day and c.ok and c.run % 5 = 0;

  -- 연체 중인 할 일: 하나마다 하루 −(4 + 중요도), 하나당 최대 −60
  select coalesce(sum(greatest(0, least(4 + t.importance, 60 - (p_day - t.due_date - 1) * (4 + t.importance)))), 0)::integer
    into overdue
    from public.todos t
   where t.user_id = p_user
     and (t.created_at at time zone 'Asia/Seoul')::date <= p_day
     and t.due_date < p_day
     and (t.deleted_at is null or (t.deleted_at at time zone 'Asia/Seoul')::date > p_day)
     and not exists (select 1 from public.repayments r where r.todo_id = t.id and r.deleted_at is null and r.settled_on <= p_day);

  -- 포기: −30
  select (count(*) * 30)::integer into give_up
    from public.repayments r
   where r.user_id = p_user and r.kind = 'forgiven' and r.deleted_at is null and r.settled_on = p_day;

  -- 할 일이 남았는데 3일 넘게 안 들어옴: 4일째부터 −5
  select exists (
    select 1 from public.todos t
     where t.user_id = p_user
       and (t.created_at at time zone 'Asia/Seoul')::date <= p_day
       and (t.deleted_at is null or (t.deleted_at at time zone 'Asia/Seoul')::date > p_day)
       and not exists (select 1 from public.repayments r where r.todo_id = t.id and r.deleted_at is null and r.settled_on <= p_day)
  ) into has_open;
  if has_open then
    select max((e.ts at time zone 'Asia/Seoul')::date) into last_active
      from public.events e where e.user_id = p_user and (e.ts at time zone 'Asia/Seoul')::date <= p_day;
    if last_active is not null and p_day - last_active >= 4 then idle := 5; end if;
  end if;

  select exists (select 1 from public.ledger_events le
                  where le.user_id = p_user and le.kind = 'bankrupt' and le.deleted_at is null and le.happened_on = p_day)
    into is_bankrupt;

  -- 하루 오르는 점수는 40점까지, 850점부터는 절반. 깎이는 점수에는 한도가 없다
  g := least(on_time + late_done + verified + streak_bonus, 40);
  if p_prev >= 850 then g := g / 2; end if;
  l := overdue + give_up + idle;
  s := greatest(0, least(1000, p_prev + g - l));
  if is_bankrupt then s := 150; end if;

  return query select s, g, l, jsonb_build_object(
    'on_time', on_time, 'late_done', late_done, 'verified', verified, 'streak', streak_bonus,
    'overdue', overdue, 'give_up', give_up, 'idle', idle, 'bankrupt', is_bankrupt);
end;
$$;

-- 한 사람의 점수를 p_until까지 확정한다. 인증 결과가 늦게 정해지므로 마지막 3일은 다시 계산한다
create function public.settle_credit_user(p_user uuid, p_until date)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  start_day date;
  last_day date;
  prev integer;
  d date;
  r record;
begin
  select credit_start into start_day from public.profiles where id = p_user;
  if start_day is null then return null; end if;
  select max(day) into last_day from public.credit_daily where user_id = p_user;
  if last_day is not null then start_day := greatest(start_day, last_day - 2); end if;
  if start_day > p_until then
    return (select credit_score from public.profiles where id = p_user);
  end if;
  delete from public.credit_daily where user_id = p_user and day >= start_day;
  select score into prev from public.credit_daily where user_id = p_user and day = start_day - 1;
  prev := coalesce(prev, 600);
  d := start_day;
  while d <= p_until loop
    select * into r from public.credit_day(p_user, d, prev);
    insert into public.credit_daily (user_id, day, score, delta, gained, lost, parts)
    values (p_user, d, r.score, r.score - prev, r.gained, r.lost, r.parts);
    prev := r.score;
    d := d + 1;
  end loop;
  update public.profiles set credit_score = prev where id = p_user;
  return prev;
end;
$$;

-- 모두 어제까지 확정 (매일 0시 10분, 한국)
create function public.settle_credit()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  yesterday date := (now() at time zone 'Asia/Seoul')::date - 1;
  n integer := 0;
  u record;
begin
  for u in select id from public.profiles loop
    perform public.settle_credit_user(u.id, yesterday);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- 점수 d일 끝 (확정 기록이 없으면 그 앞의 마지막 기록, 시작 전이면 600)
create function public.credit_at(p_user uuid, p_day date)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce((select c.score from public.credit_daily c where c.user_id = p_user and c.day <= p_day order by c.day desc limit 1), 600)
$$;

-- ---------------------------------------------------------------------------
-- 앱이 부르는 함수
-- ---------------------------------------------------------------------------

-- 내 신용 (FR-097~100). 어제까지 확정이 안 됐으면 이참에 확정하고 오늘 몫을 더해 돌려준다
create function public.my_credit()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  confirmed integer;
  t record;
  pr record;
  week jsonb;
  weeks jsonb;
  week_parts jsonb;
  rk integer;
  total integer;
  last_active date;
begin
  if uid is null then return null; end if;
  confirmed := public.settle_credit_user(uid, today - 1);
  select * into pr from public.profiles where id = uid;
  confirmed := coalesce(confirmed, pr.credit_score);
  select * into t from public.credit_day(uid, today, confirmed);

  -- 최근 7일 하루별 변화(오늘 포함)
  select jsonb_agg(jsonb_build_object('day', d, 'delta',
           case when d = today then t.score - confirmed
                else coalesce((select c.delta from public.credit_daily c where c.user_id = uid and c.day = d), 0) end) order by d)
    into week
    from generate_series(today - 6, today, interval '1 day') as g(x), lateral (select g.x::date as d) dd;

  -- 최근 5주 주말 점수(이번 주는 지금 점수)
  select jsonb_agg(jsonb_build_object('week_end', we, 'score',
           case when we >= today then t.score else public.credit_at(uid, we) end) order by we)
    into weeks
    from generate_series(0, 4) as k, lateral (select today - (4 - k) * 7 as we) w;

  -- 최근 7일 내역 합계(오늘 포함)
  select jsonb_build_object(
           'on_time', coalesce(sum((c.parts->>'on_time')::int), 0) + (t.parts->>'on_time')::int,
           'late_done', coalesce(sum((c.parts->>'late_done')::int), 0) + (t.parts->>'late_done')::int,
           'verified', coalesce(sum((c.parts->>'verified')::int), 0) + (t.parts->>'verified')::int,
           'streak', coalesce(sum((c.parts->>'streak')::int), 0) + (t.parts->>'streak')::int,
           'overdue', coalesce(sum((c.parts->>'overdue')::int), 0) + (t.parts->>'overdue')::int,
           'give_up', coalesce(sum((c.parts->>'give_up')::int), 0) + (t.parts->>'give_up')::int,
           'idle', coalesce(sum((c.parts->>'idle')::int), 0) + (t.parts->>'idle')::int)
    into week_parts
    from public.credit_daily c where c.user_id = uid and c.day between today - 6 and today - 1;

  select count(*) + 1 into rk from public.profiles p where p.credit_score > confirmed and p.id <> uid;
  select count(*) into total from public.profiles;
  select max((e.ts at time zone 'Asia/Seoul')::date) into last_active from public.events e where e.user_id = uid;

  return jsonb_build_object(
    'score', t.score,
    'confirmed', confirmed,
    'week_delta', t.score - public.credit_at(uid, today - 7),
    'today', jsonb_build_object('gained', t.gained, 'lost', t.lost, 'parts', t.parts),
    'week', coalesce(week, '[]'::jsonb),
    'weeks', coalesce(weeks, '[]'::jsonb),
    'week_parts', week_parts,
    'rank', rk,
    'participants', total,
    'last_active', last_active,
    'joined_on', (pr.created_at at time zone 'Asia/Seoul')::date,
    'start', pr.credit_start
  );
end;
$$;

-- 전체 순위표 (FR-101). 위 p_limit명과 나. 다른 사람 이름은 첫 글자만
create function public.global_leaderboard(p_limit integer default 20)
returns table (rank integer, name text, score integer, week_delta integer, is_me boolean)
language sql stable security definer set search_path = ''
as $$
  with today as (select (now() at time zone 'Asia/Seoul')::date as d),
  ranked as (
    select p.id, p.display_name, p.credit_score,
           (rank() over (order by p.credit_score desc))::integer as rk,
           row_number() over (order by p.credit_score desc, p.created_at) as rn
      from public.profiles p
  )
  select r.rk,
         case when r.id = auth.uid() then coalesce(r.display_name, '나')
              else left(coalesce(r.display_name, '친구'), 1) || '*' end,
         r.credit_score,
         r.credit_score - public.credit_at(r.id, (select d from today) - 8),
         r.id = auth.uid()
    from ranked r
   where auth.uid() is not null and (r.rn <= least(greatest(p_limit, 1), 100) or r.id = auth.uid())
   order by r.rn
$$;

-- 친구 순위표 (FR-102). 나와 친구(내가 차단한 사람 빼고)
create function public.friends_leaderboard()
returns table (rank integer, user_id uuid, name text, score integer, week_delta integer, is_me boolean)
language sql stable security definer set search_path = ''
as $$
  with today as (select (now() at time zone 'Asia/Seoul')::date as d),
  people as (
    select auth.uid() as id
    union
    select case when f.user_a = auth.uid() then f.user_b else f.user_a end
      from public.friendships f
     where auth.uid() in (f.user_a, f.user_b)
  )
  select (rank() over (order by p.credit_score desc))::integer, p.id, coalesce(p.display_name, '친구'), p.credit_score,
         p.credit_score - public.credit_at(p.id, (select d from today) - 8), p.id = auth.uid()
    from people x
    join public.profiles p on p.id = x.id
   where auth.uid() is not null
     and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.id)
   order by p.credit_score desc, p.created_at
$$;

-- ---------------------------------------------------------------------------
-- 그룹: 그룹원 목록에 신용 점수, 그룹 순위는 인증받은 횟수로 (FR-081 변경)
-- ---------------------------------------------------------------------------
drop function public.group_members_of(uuid);
create function public.group_members_of(p_group_id uuid)
returns table (user_id uuid, nickname text, is_owner boolean, is_me boolean, joined_at timestamptz, status_code text, blocked boolean, credit_score integer)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, m.nickname, g.owner_id = m.user_id, m.user_id = auth.uid(), m.joined_at,
         case when pr.status_on >= (now() at time zone 'Asia/Seoul')::date - 6 then pr.status_code end,
         exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = m.user_id),
         pr.credit_score
    from public.group_members m
    join public.groups g on g.id = m.group_id
    join public.profiles pr on pr.id = m.user_id
   where m.group_id = p_group_id
     and exists (select 1 from public.group_members x where x.group_id = p_group_id and x.user_id = auth.uid())
   order by m.joined_at
$$;

drop function public.group_standing(uuid);
create function public.group_standing(p_group_id uuid)
returns table (user_id uuid, nickname text, is_me boolean, status_code text, score integer, passed integer, rank integer, credit_score integer)
language sql stable security definer set search_path = ''
as $$
  with today as (select (now() at time zone 'Asia/Seoul')::date as d),
  mem as (
    select m.user_id, m.nickname from public.group_members m
     where m.group_id = p_group_id
       and exists (select 1 from public.group_members x where x.group_id = p_group_id and x.user_id = auth.uid())
  ),
  passed as (
    select p.user_id, p.created_at
      from public.proofs p
      join public.repayments r on r.id = p.repayment_id and r.deleted_at is null
     cross join today
     where p.group_id = p_group_id and p.hidden_at is null
       and r.settled_on > today.d - 7 and r.settled_on <= today.d
       and public.proof_state(p.created_at,
             (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'approve')::integer,
             (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'doubt')::integer) = 'passed'
  ),
  counted as (
    select mem.user_id, mem.nickname,
           (select count(*) from passed ps where ps.user_id = mem.user_id)::integer as passed_n,
           (select max(ps.created_at) from passed ps where ps.user_id = mem.user_id) as last_at
      from mem
  )
  -- 이번 주에 인정받은 인증이 많은 순. 같으면 먼저 채운 사람이 위
  select c.user_id, c.nickname, c.user_id = auth.uid(),
         case when pr.status_on >= (select d from today) - 6 then pr.status_code end,
         c.passed_n, c.passed_n,
         (rank() over (order by c.passed_n desc))::integer,
         pr.credit_score
    from counted c
    join public.profiles pr on pr.id = c.user_id
   order by c.passed_n desc, c.last_at asc nulls last, c.nickname
$$;

-- ---------------------------------------------------------------------------
-- 권한과 주기 작업
-- ---------------------------------------------------------------------------
revoke all on function public.credit_day(uuid, date, integer) from public, anon, authenticated;
revoke all on function public.settle_credit_user(uuid, date) from public, anon, authenticated;
revoke all on function public.settle_credit() from public, anon, authenticated;
revoke all on function public.credit_at(uuid, date) from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array['my_credit()', 'global_leaderboard(integer)', 'friends_leaderboard()', 'group_members_of(uuid)', 'group_standing(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- 0시 10분(한국) = 15시 10분(UTC)
select cron.schedule('settle-credit', '10 15 * * *', 'select public.settle_credit()');
