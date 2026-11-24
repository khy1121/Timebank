-- 그룹 보증금 규칙 (시간적금기획서 4.7, 그룹기획서 9절)
-- 1. 자동 통과를 없앤다: 친구 인정 1명 이상 + 인정 > 의심이어야 통과. 24시간이 지나면 불인정
-- 2. 서버에 먼저 켜 두었던 자동 통과 알림(PR #20, 합치지 않음)을 지운다
-- 3. 몰수: 보증금으로 건 상환이 늦었거나, 24시간 안에 인정을 못 받았거나, 포기했으면 잃은 원금이 그룹 금고로 간다
-- 4. 금고 배당: 월요일 0시 10분(한국)에 지난주 금고를 그 주에 인정받은 사람끼리 인정 수만큼 나눈다. 받을 사람이 없으면 다음 주로
-- 5. 알림: 몰수되면 알리고(매시 5분), 보증금이 통과하면 돌아온 냥을 알린다

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. 인증 상태: 자동 통과 없음. domain/groups.ts proofState와 같은 규칙
-- ---------------------------------------------------------------------------
create or replace function public.proof_state(p_created timestamptz, p_approve integer, p_doubt integer)
returns text
language sql stable set search_path = ''
as $$
  select case
    when p_approve >= 1 and p_approve > p_doubt then 'passed'
    when now() < p_created + interval '24 hours' then 'pending'
    else 'rejected'
  end
$$;

-- ---------------------------------------------------------------------------
-- 2. 자동 통과 알림 지우기
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'auto-passed-push') then
    perform cron.unschedule('auto-passed-push');
  end if;
end;
$$;
drop function if exists public.send_auto_passed_push();
drop function if exists public.claim_auto_passed(integer);

-- ---------------------------------------------------------------------------
-- Expo 푸시 보내기 (서버 안에서만 부른다). messages: Expo 메시지 배열
-- ---------------------------------------------------------------------------
create function public.send_expo_push(p_messages jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  i integer := 0;
  n integer := coalesce(jsonb_array_length(p_messages), 0);
begin
  while i < n loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := (select jsonb_agg(e) from jsonb_array_elements(p_messages) with ordinality as x(e, k) where k > i and k <= i + 100),
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
    i := i + 100;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. 몰수된 보증금
-- decided_at: 몰수가 정해진 시각. 늦음·포기는 상환 시각, 인정 못 받음은 상환 24시간 뒤
-- ---------------------------------------------------------------------------
create function public.group_forfeits()
returns table (group_id uuid, user_id uuid, repayment_id uuid, title text, amount integer, reason text, decided_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select t.stake_group_id, r.user_id, r.id, r.title,
         case when r.kind = 'forgiven' and r.overdue_days = 0 then r.principal - ceil(r.principal / 2.0)::integer else r.principal end,
         case when r.kind = 'forgiven' then 'forgive' when r.overdue_days > 0 then 'late' else 'unverified' end,
         case when r.kind = 'repaid' and r.overdue_days = 0 then r.created_at + interval '24 hours' else r.created_at end
    from public.repayments r
    join public.todos t on t.id = r.todo_id
   where t.stake_group_id is not null and r.deleted_at is null
     and (
       r.kind = 'forgiven'
       or r.overdue_days > 0
       or (r.created_at <= now() - interval '24 hours'
           and not exists (
             select 1 from public.proofs p
              where p.repayment_id = r.id and p.group_id = t.stake_group_id and p.hidden_at is null
                and public.proof_state(p.created_at,
                      (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'approve')::integer,
                      (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'doubt')::integer) = 'passed'))
     )
$$;

-- ---------------------------------------------------------------------------
-- 4. 주간 금고
-- ---------------------------------------------------------------------------
create table public.group_pot_weeks (
  group_id uuid not null references public.groups (id) on delete cascade,
  week_start date not null,
  collected integer not null default 0,
  carried_in integer not null default 0,
  paid integer not null default 0,
  carried_out integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (group_id, week_start)
);
alter table public.group_pot_weeks enable row level security;
-- 그룹원만 본다 (이번 주 금고 표시용)
create policy "group_pot_weeks: 그룹원만 조회" on public.group_pot_weeks
  for select to authenticated using (group_id in (select public.my_group_ids()));

-- 이번 주(아직 안 나눈) 금고: 지난주에서 넘어온 냥 + 이번 주에 몰수된 냥
create function public.group_pot_now(p_group_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  with w as (select date_trunc('week', now() at time zone 'Asia/Seoul')::date as start)
  select case when public.is_group_member(p_group_id::text) then
    coalesce((select carried_out from public.group_pot_weeks g where g.group_id = p_group_id and g.week_start = (select start from w) - 7), 0)
    + coalesce((select sum(f.amount) from public.group_forfeits() f
                 where f.group_id = p_group_id
                   and (f.decided_at at time zone 'Asia/Seoul')::date >= (select start from w)), 0)::integer
  else 0 end
$$;

-- p_week_start(월요일) 주의 금고를 나눈다. 이미 나눈 주는 건너뛴다
create function public.settle_group_pots(p_week_start date)
returns integer
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_variable
declare
  g record;
  collected integer;
  carry integer;
  pot integer;
  total integer;
  paid integer;
  w record;
  amount integer;
  msgs jsonb := '[]'::jsonb;
  done integer := 0;
  week_end date := p_week_start + 6;
begin
  for g in select id, name from public.groups loop
    continue when exists (select 1 from public.group_pot_weeks x where x.group_id = g.id and x.week_start = p_week_start);
    select coalesce(sum(f.amount), 0)::integer into collected
      from public.group_forfeits() f
     where f.group_id = g.id and (f.decided_at at time zone 'Asia/Seoul')::date between p_week_start and week_end;
    select coalesce((select x.carried_out from public.group_pot_weeks x where x.group_id = g.id and x.week_start = p_week_start - 7), 0) into carry;
    pot := collected + carry;
    paid := 0;
    if pot > 0 then
      -- 그 주에 올려 인정받은 인증 수
      select coalesce(sum(cnt), 0)::integer into total from (
        select count(*) as cnt from public.proofs p
         where p.group_id = g.id and p.hidden_at is null
           and (p.created_at at time zone 'Asia/Seoul')::date between p_week_start and week_end
           and public.proof_state(p.created_at,
                 (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'approve')::integer,
                 (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'doubt')::integer) = 'passed'
         group by p.user_id) s;
      if total > 0 then
        for w in
          select p.user_id, count(*)::integer as cnt from public.proofs p
           where p.group_id = g.id and p.hidden_at is null
             and (p.created_at at time zone 'Asia/Seoul')::date between p_week_start and week_end
             and public.proof_state(p.created_at,
                   (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'approve')::integer,
                   (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'doubt')::integer) = 'passed'
           group by p.user_id
        loop
          amount := floor(pot::numeric * w.cnt / total);
          continue when amount <= 0;
          insert into public.ledger_events (id, user_id, kind, amount, happened_on, updated_at)
          values (gen_random_uuid(), w.user_id, 'payout', amount, week_end + 1, now());
          paid := paid + amount;
          msgs := msgs || coalesce((
            select jsonb_agg(jsonb_build_object('to', t.token, 'title', g.name,
                     'body', '지난주 금고에서 ' || to_char(amount, 'FM999,999,999') || '냥을 받았어요. 인정받은 인증 ' || w.cnt || '개 몫이에요.',
                     'data', jsonb_build_object('groupId', g.id), 'sound', 'default', 'channelId', 'friends'))
              from public.push_tokens t join public.profiles pf on pf.id = t.user_id and pf.push_friends
             where t.user_id = w.user_id), '[]'::jsonb);
        end loop;
      end if;
    end if;
    insert into public.group_pot_weeks (group_id, week_start, collected, carried_in, paid, carried_out)
    values (g.id, p_week_start, collected, carry, paid, pot - paid);
    done := done + 1;
  end loop;
  if jsonb_array_length(msgs) > 0 then perform public.send_expo_push(msgs); end if;
  return done;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. 몰수 알림
-- ---------------------------------------------------------------------------
create table public.forfeit_notices (
  repayment_id uuid primary key references public.repayments (id) on delete cascade,
  notified_at timestamptz not null default now()
);
alter table public.forfeit_notices enable row level security;
-- 정책 없음: 서버만 쓴다

create function public.notify_forfeits()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  msgs jsonb;
  n integer;
begin
  with fresh as (
    insert into public.forfeit_notices (repayment_id)
    select f.repayment_id from public.group_forfeits() f
     where f.decided_at > now() - interval '2 days'
    on conflict do nothing
    returning repayment_id
  ), info as (
    select f.*, gr.name as group_name from public.group_forfeits() f
      join fresh on fresh.repayment_id = f.repayment_id
      join public.groups gr on gr.id = f.group_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('to', t.token, 'title', i.group_name,
           'body', '"' || i.title || '" '
             || case i.reason when 'late' then '늦게 끝내서' when 'forgive' then '포기해서' else '24시간 안에 인정을 못 받아' end
             || ' 보증금 ' || to_char(i.amount, 'FM999,999,999') || '냥이 그룹 금고로 갔어요.',
           'data', jsonb_build_object('groupId', i.group_id), 'sound', 'default', 'channelId', 'friends')), '[]'::jsonb),
         count(*)
    into msgs, n
    from info i
    join public.push_tokens t on t.user_id = i.user_id
    join public.profiles pf on pf.id = i.user_id and pf.push_friends;
  if jsonb_array_length(msgs) > 0 then perform public.send_expo_push(msgs); end if;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 보증금이 통과하면 돌아온 냥을 알린다 (claim_push의 vote 부분만 바뀜)
-- ---------------------------------------------------------------------------
create or replace function public.claim_push(p_user uuid, p_kind text, p_id uuid)
returns table (token text, title text, body text, group_id uuid)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  p record;
  g record;
  a integer;
  d integer;
  my_vote text;
  msg text;
  staked boolean;
begin
  if p_kind = 'proof' then
    update public.proofs pr set notified_at = now()
     where pr.id = p_id and pr.user_id = p_user and pr.notified_at is null
       and pr.hidden_at is null and pr.created_at > now() - interval '10 minutes'
    returning pr.* into p;
    if not found then return; end if;
    select gr.name, m.nickname into g
      from public.groups gr join public.group_members m on m.group_id = gr.id and m.user_id = p_user
     where gr.id = p.group_id;
    return query
      select t.token, g.name, g.nickname || '님이 "' || p.todo_title || '" 인증을 올렸어요. 인정해 줄까요?', p.group_id
        from public.group_members m
        join public.profiles pf on pf.id = m.user_id and pf.push_friends
        join public.push_tokens t on t.user_id = m.user_id
       where m.group_id = p.group_id and m.user_id <> p_user
         and not exists (select 1 from public.blocks b where b.blocker_id = m.user_id and b.blocked_id = p_user);

  elsif p_kind = 'vote' then
    select pr.* into p from public.proofs pr where pr.id = p_id and pr.hidden_at is null;
    if not found then return; end if;
    select v.vote into my_vote from public.proof_votes v where v.proof_id = p_id and v.voter_id = p_user;
    if my_vote is null then return; end if;
    select count(*) filter (where v.vote = 'approve'), count(*) filter (where v.vote = 'doubt')
      into a, d from public.proof_votes v where v.proof_id = p_id;
    if public.proof_state(p.created_at, a, d) = 'passed' and p.passed_notified_at is null then
      update public.proofs set passed_notified_at = now() where id = p_id;
      -- 이 그룹에 보증금으로 건 상환이면 돌아온 냥을 알려 준다 (시간적금기획서 4.7)
      select tt.stake_group_id = p.group_id into staked
        from public.repayments rr join public.todos tt on tt.id = rr.todo_id where rr.id = p.repayment_id;
      msg := '"' || p.todo_title || '" 인증이 통과했어요.'
        || case
             when coalesce(staked, false) and p.overdue_days = 0
               then ' 보증금과 이자 ' || to_char(p.principal + floor(p.principal / 10) + floor(floor(p.principal / 10) / 2), 'FM999,999,999') || '냥이 돌아왔어요.'
             when p.overdue_days = 0 then ' 이자를 받았어요.'
             else ' 그룹 순위에 들어가요.'
           end;
    elsif my_vote = 'doubt' and p.doubt_notified_at is null then
      update public.proofs set doubt_notified_at = now() where id = p_id;
      msg := '"' || p.todo_title || '" 인증에 의심이 달렸어요. 인정이 더 많아야 통과해요.';
    else
      return;
    end if;
    return query
      select t.token, gr.name, msg, p.group_id
        from public.push_tokens t
        join public.profiles pf on pf.id = t.user_id and pf.push_friends
        join public.groups gr on gr.id = p.group_id
       where t.user_id = p.user_id;

  elsif p_kind = 'join' then
    update public.group_members m set join_notified_at = now()
     where m.group_id = p_id and m.user_id = p_user and m.join_notified_at is null
       and m.joined_at > now() - interval '10 minutes'
    returning m.nickname into msg;
    if not found then return; end if;
    return query
      select t.token, gr.name, msg || '님이 그룹에 들어왔어요. 같이 해 봐요!', p_id
        from public.group_members m
        join public.groups gr on gr.id = m.group_id
        join public.profiles pf on pf.id = m.user_id and pf.push_friends
        join public.push_tokens t on t.user_id = m.user_id
       where m.group_id = p_id and m.user_id <> p_user
         and not exists (select 1 from public.blocks b where b.blocker_id = m.user_id and b.blocked_id = p_user);
  end if;
end;
$$;

revoke all on function public.send_expo_push(jsonb) from public, anon, authenticated;
revoke all on function public.group_forfeits() from public, anon, authenticated;
revoke all on function public.settle_group_pots(date) from public, anon, authenticated;
revoke all on function public.notify_forfeits() from public, anon, authenticated;
revoke all on function public.claim_push(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_push(uuid, text, uuid) to service_role;
revoke all on function public.group_pot_now(uuid) from public, anon;
grant execute on function public.group_pot_now(uuid) to authenticated;

-- 월요일 0시 10분(한국) = 일요일 15시 10분(UTC): 지난주 금고를 나눈다
select cron.schedule('settle-group-pots', '10 15 * * 0',
  $job$select public.settle_group_pots(date_trunc('week', now() at time zone 'Asia/Seoul')::date - 7)$job$);
-- 매시 5분: 몰수 알림
select cron.schedule('notify-forfeits', '5 * * * *', 'select public.notify_forfeits()');
