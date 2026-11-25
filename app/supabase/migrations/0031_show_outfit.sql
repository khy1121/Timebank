-- 꾸민 캐릭터를 순위표와 그룹에서도 보여 준다 (2026-11-25 사용자 요청)
-- 남에게 보일 옷(머리·얼굴·몸)은 그 사람이 실제로 산 물건만 돌려준다. 산 기록이 없는 코드가 저장돼 있으면 빈칸(안 씀)
-- 전체·친구 순위표, 그룹원 목록, 그룹 순위가 outfit 칸을 함께 돌려준다. 그룹 피드는 그룹원 목록의 user_id로 앱이 맞춘다

create function public.shown_outfit(p_user uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
           'head', case when exists (select 1 from public.purchases pu where pu.user_id = p.id and pu.item_code = p.equipped->>'head' and pu.deleted_at is null) then p.equipped->>'head' end,
           'face', case when exists (select 1 from public.purchases pu where pu.user_id = p.id and pu.item_code = p.equipped->>'face' and pu.deleted_at is null) then p.equipped->>'face' end,
           'body', case when exists (select 1 from public.purchases pu where pu.user_id = p.id and pu.item_code = p.equipped->>'body' and pu.deleted_at is null) then p.equipped->>'body' end)
    from public.profiles p where p.id = p_user
$$;
revoke all on function public.shown_outfit(uuid) from public, anon, authenticated;

-- 아래는 0021의 네 함수에 outfit 칸을 더한 것. 돌려주는 칸이 늘어 지우고 다시 만든다
drop function public.global_leaderboard(integer);
create function public.global_leaderboard(p_limit integer default 20)
returns table (rank integer, name text, score integer, week_delta integer, is_me boolean, nameplate text, outfit jsonb)
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
         r.id = auth.uid(),
         public.shown_nameplate(r.id),
         public.shown_outfit(r.id)
    from ranked r
   where auth.uid() is not null and (r.rn <= least(greatest(p_limit, 1), 100) or r.id = auth.uid())
   order by r.rn
$$;
revoke all on function public.global_leaderboard(integer) from public, anon;
grant execute on function public.global_leaderboard(integer) to authenticated;

drop function public.friends_leaderboard();
create function public.friends_leaderboard()
returns table (rank integer, user_id uuid, name text, score integer, week_delta integer, is_me boolean, nameplate text, outfit jsonb)
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
         p.credit_score - public.credit_at(p.id, (select d from today) - 8), p.id = auth.uid(),
         public.shown_nameplate(p.id),
         public.shown_outfit(p.id)
    from people x
    join public.profiles p on p.id = x.id
   where auth.uid() is not null
     and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.id)
   order by p.credit_score desc, p.created_at
$$;
revoke all on function public.friends_leaderboard() from public, anon;
grant execute on function public.friends_leaderboard() to authenticated;

drop function public.group_members_of(uuid);
create function public.group_members_of(p_group_id uuid)
returns table (user_id uuid, nickname text, is_owner boolean, is_me boolean, joined_at timestamptz, status_code text, blocked boolean, credit_score integer, nameplate text, outfit jsonb)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, m.nickname, g.owner_id = m.user_id, m.user_id = auth.uid(), m.joined_at,
         case when pr.status_on >= (now() at time zone 'Asia/Seoul')::date - 6 then pr.status_code end,
         exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = m.user_id),
         pr.credit_score,
         public.shown_nameplate(m.user_id),
         public.shown_outfit(m.user_id)
    from public.group_members m
    join public.groups g on g.id = m.group_id
    join public.profiles pr on pr.id = m.user_id
   where m.group_id = p_group_id
     and exists (select 1 from public.group_members x where x.group_id = p_group_id and x.user_id = auth.uid())
   order by m.joined_at
$$;
revoke all on function public.group_members_of(uuid) from public, anon;
grant execute on function public.group_members_of(uuid) to authenticated;

drop function public.group_standing(uuid);
create function public.group_standing(p_group_id uuid)
returns table (user_id uuid, nickname text, is_me boolean, status_code text, score integer, passed integer, rank integer, credit_score integer, nameplate text, outfit jsonb)
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
  select c.user_id, c.nickname, c.user_id = auth.uid(),
         case when pr.status_on >= (select d from today) - 6 then pr.status_code end,
         c.passed_n, c.passed_n,
         (rank() over (order by c.passed_n desc))::integer,
         pr.credit_score,
         public.shown_nameplate(c.user_id),
         public.shown_outfit(c.user_id)
    from counted c
    join public.profiles pr on pr.id = c.user_id
   order by c.passed_n desc, c.last_at asc nulls last, c.nickname
$$;
revoke all on function public.group_standing(uuid) from public, anon;
grant execute on function public.group_standing(uuid) to authenticated;
