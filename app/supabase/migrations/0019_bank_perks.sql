-- 은행 7단계 혜택 (FR-110, FR-111, 상점기획서 11.2절)
-- 은행 단계는 산 기록(purchases)에서 계산한다. 앱의 domain/bank.ts와 같은 표를 쓴다.
-- 물건 코드의 뜻은 바꾸지 않는다: bank-4는 처음부터 "시간은행 본점"이라 5단계, 읍내 금고는 bank-vault(4), 중앙은행은 bank-central(6).

create function public.bank_stage(p_user uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(max(case p.item_code
           when 'bank-1' then 1 when 'bank-2' then 2 when 'bank-3' then 3
           when 'bank-vault' then 4 when 'bank-4' then 5 when 'bank-central' then 6 end), 0)
    from public.purchases p
   where p.user_id = p_user and p.deleted_at is null;
$$;

-- 단계별 혜택 수치. domain/bank.ts perksOf와 같다
create function public.bank_max_groups(p_stage integer)
returns integer language sql immutable set search_path = ''
as $$ select case when p_stage >= 6 then 7 when p_stage >= 4 then 5 when p_stage >= 2 then 4 else 3 end $$;

create function public.bank_max_members(p_stage integer)
returns integer language sql immutable set search_path = ''
as $$ select case when p_stage >= 6 then 20 when p_stage >= 3 then 15 else 10 end $$;

create function public.bank_credit_weeks(p_stage integer)
returns integer language sql immutable set search_path = ''
as $$ select case when p_stage >= 5 then 52 when p_stage >= 2 then 13 else 5 end $$;

create function public.bank_pot_boost(p_stage integer)
returns numeric language sql immutable set search_path = ''
as $$ select case when p_stage >= 5 then 0.1 else 0 end $$;

revoke all on function public.bank_stage(uuid), public.bank_max_groups(integer), public.bank_max_members(integer),
  public.bank_credit_weeks(integer), public.bank_pot_boost(integer) from public, anon;
grant execute on function public.bank_stage(uuid) to authenticated;

-- 내 은행 단계와 그에 따른 그룹 한도. 앱이 그룹 만들기·들어가기 전에 보여 준다
create function public.my_bank()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  s integer;
begin
  if uid is null then return null; end if;
  s := public.bank_stage(uid);
  return jsonb_build_object('stage', s, 'max_groups', public.bank_max_groups(s), 'max_members', public.bank_max_members(s));
end;
$$;
revoke all on function public.my_bank() from public, anon;
grant execute on function public.my_bank() to authenticated;

-- 그룹 만들기: 들 수 있는 그룹 수는 내 은행 단계를 따른다
create or replace function public.create_group(p_name text, p_nickname text, p_theme text default 'etc', p_theme_label text default null)
returns table (id uuid, invite_code text)
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
  code text;
  lim integer;
begin
  if uid is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  lim := public.bank_max_groups(public.bank_stage(uid));
  if (select count(*) from public.group_members where user_id = uid) >= lim then
    raise exception '그룹은 %개까지 들 수 있어요', lim using errcode = 'P0001', hint = 'too_many_groups';
  end if;
  code := public.new_invite_code();
  insert into public.groups (name, owner_id, invite_code, theme, theme_label)
  values (btrim(p_name), uid, code, coalesce(p_theme, 'etc'), case when p_theme = 'etc' then nullif(btrim(coalesce(p_theme_label, '')), '') end)
  returning groups.id into gid;
  insert into public.group_members (group_id, user_id, nickname) values (gid, uid, btrim(p_nickname));
  return query select gid, code;
end;
$$;

-- 그룹 들어가기: 그룹 인원은 그룹장의 은행 단계, 들 수 있는 그룹 수는 내 은행 단계를 따른다
create or replace function public.join_group(p_code text, p_nickname text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
  owner uuid;
  lim integer;
begin
  if uid is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  perform public.check_invite_attempts(uid);
  select g.id, g.owner_id into gid, owner from public.groups g where g.invite_code = upper(btrim(p_code)) for update;
  if gid is null then
    insert into public.invite_attempts (user_id) values (uid);
    return null;
  end if;
  if exists (select 1 from public.group_members where group_id = gid and user_id = uid) then
    return gid;
  end if;
  if (select count(*) from public.group_members where group_id = gid) >= public.bank_max_members(public.bank_stage(owner)) then
    raise exception '그룹이 꽉 찼어요' using errcode = 'P0001', hint = 'group_full';
  end if;
  lim := public.bank_max_groups(public.bank_stage(uid));
  if (select count(*) from public.group_members where user_id = uid) >= lim then
    raise exception '그룹은 %개까지 들 수 있어요', lim using errcode = 'P0001', hint = 'too_many_groups';
  end if;
  insert into public.group_members (group_id, user_id, nickname) values (gid, uid, btrim(p_nickname));
  return gid;
end;
$$;

-- 주간 금고 정산: 그룹장이 본점(5단계) 이상이면 그 주에 모인 몰수금에 10%를 더한다(이월분에는 붙이지 않는다)
create or replace function public.settle_group_pots(p_week_start date)
returns integer
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_variable
declare
  g record;
  collected integer;
  boost integer;
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
  for g in select id, name, owner_id from public.groups loop
    continue when exists (select 1 from public.group_pot_weeks x where x.group_id = g.id and x.week_start = p_week_start);
    select coalesce(sum(f.amount), 0)::integer into collected
      from public.group_forfeits() f
     where f.group_id = g.id and (f.decided_at at time zone 'Asia/Seoul')::date between p_week_start and week_end;
    boost := floor(collected * public.bank_pot_boost(public.bank_stage(g.owner_id)))::integer;
    select coalesce((select x.carried_out from public.group_pot_weeks x where x.group_id = g.id and x.week_start = p_week_start - 7), 0) into carry;
    pot := collected + boost + carry;
    paid := 0;
    if pot > 0 then
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
    -- collected에는 그룹장 보너스까지 넣어 둔다(금고에 들어온 돈)
    insert into public.group_pot_weeks (group_id, week_start, collected, carried_in, paid, carried_out)
    values (g.id, p_week_start, collected + boost, carry, paid, pot - paid);
    done := done + 1;
  end loop;
  if jsonb_array_length(msgs) > 0 then perform public.send_expo_push(msgs); end if;
  return done;
end;
$$;

-- 내 신용 (FR-097~100, 0019에서 그래프 주 수를 은행 단계로). 어제까지 확정이 안 됐으면 이참에 확정하고 오늘 몫을 더해 돌려준다
create or replace function public.my_credit()
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
  n integer;
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

  -- 주말 점수(이번 주는 지금 점수). 보이는 주 수는 은행 단계를 따른다: 5주, 동네 창구부터 13주, 본점부터 52주 (FR-111)
  n := public.bank_credit_weeks(public.bank_stage(uid));
  select jsonb_agg(jsonb_build_object('week_end', we, 'score',
           case when we >= today then t.score else public.credit_at(uid, we) end) order by we)
    into weeks
    from generate_series(0, n - 1) as k, lateral (select today - (n - 1 - k) * 7 as we) w;

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
