-- 친구 목록과 친구 프로필에도 이름표를 보낸다 (FR-113, 상점기획서 11.4절 "보이는 곳")
-- 돌려주는 칸이 늘어 지우고 다시 만든다. 이름표는 연 은행보다 높으면 '없음'으로 보인다(shown_nameplate)

drop function public.my_friends();
create function public.my_friends()
returns table (user_id uuid, name text, since timestamptz, done_week integer, overdue_now integer, last_active date, nameplate text)
language sql stable security definer set search_path = ''
as $$
  with me as (select auth.uid() as id, (now() at time zone 'Asia/Seoul')::date as today),
  f as (
    select case when fs.user_a = me.id then fs.user_b else fs.user_a end as uid, fs.created_at
      from public.friendships fs, me
     where me.id in (fs.user_a, fs.user_b)
  )
  select f.uid, coalesce(p.display_name, '친구'), f.created_at,
         (select count(*) from public.repayments r
           where r.user_id = f.uid and r.kind = 'repaid' and r.deleted_at is null and r.settled_on > me.today - 7)::integer,
         (select count(*) from public.todos t
           where t.user_id = f.uid and t.status = 'open' and t.deleted_at is null and t.due_date < me.today)::integer,
         (select (max(e.ts) at time zone 'Asia/Seoul')::date from public.events e where e.user_id = f.uid),
         public.shown_nameplate(f.uid)
    from f
    join public.profiles p on p.id = f.uid
    cross join me
   where not exists (select 1 from public.blocks b where b.blocker_id = me.id and b.blocked_id = f.uid)
   order by f.created_at
$$;
revoke all on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;

drop function public.friend_profile(uuid);
create function public.friend_profile(p_user uuid)
returns table (user_id uuid, name text, since timestamptz, done_week integer, overdue_now integer, verified_week integer, last_active date, common_groups text[], nameplate text)
language sql stable security definer set search_path = ''
as $$
  with me as (select auth.uid() as id, (now() at time zone 'Asia/Seoul')::date as today)
  select p.id, coalesce(p.display_name, '친구'), fs.created_at,
         (select count(*) from public.repayments r
           where r.user_id = p.id and r.kind = 'repaid' and r.deleted_at is null and r.settled_on > me.today - 7)::integer,
         (select count(*) from public.todos t
           where t.user_id = p.id and t.status = 'open' and t.deleted_at is null and t.due_date < me.today)::integer,
         (select count(*) from public.proofs pr
           where pr.user_id = p.id and pr.hidden_at is null and pr.created_at > now() - interval '7 days'
             and public.proof_state(pr.created_at,
                   (select count(*)::integer from public.proof_votes v where v.proof_id = pr.id and v.vote = 'approve'),
                   (select count(*)::integer from public.proof_votes v where v.proof_id = pr.id and v.vote = 'doubt')) = 'passed')::integer,
         (select (max(e.ts) at time zone 'Asia/Seoul')::date from public.events e where e.user_id = p.id),
         array(select g.name from public.group_members a
                 join public.group_members b on b.group_id = a.group_id
                 join public.groups g on g.id = a.group_id
                where a.user_id = me.id and b.user_id = p.id
                order by g.name),
         public.shown_nameplate(p.id)
    from me
    join public.friendships fs on fs.user_a = least(me.id, p_user) and fs.user_b = greatest(me.id, p_user)
    join public.profiles p on p.id = p_user
$$;
revoke all on function public.friend_profile(uuid) from public, anon;
grant execute on function public.friend_profile(uuid) to authenticated;
