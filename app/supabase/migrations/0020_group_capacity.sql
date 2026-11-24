-- 그룹 인원 한도를 앱에 알려 준다 (FR-111). 한도는 그룹장의 은행 단계를 따른다(0019)
-- 돌려주는 칸이 늘어나 함수를 지우고 다시 만든다.

drop function public.group_preview(text);
create function public.group_preview(p_code text)
returns table (id uuid, name text, members integer, owner_nickname text, is_member boolean, theme text, theme_label text, max_members integer)
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  perform public.check_invite_attempts(uid);
  return query
    select g.id, g.name,
           (select count(*) from public.group_members m where m.group_id = g.id)::integer,
           (select m.nickname from public.group_members m where m.group_id = g.id and m.user_id = g.owner_id),
           exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = uid),
           g.theme, g.theme_label,
           public.bank_max_members(public.bank_stage(g.owner_id))
      from public.groups g
     where g.invite_code = upper(btrim(p_code));
  if not found then
    insert into public.invite_attempts (user_id) values (uid);
  end if;
end;
$$;
revoke all on function public.group_preview(text) from public, anon;
grant execute on function public.group_preview(text) to authenticated;

drop function public.my_groups();
create function public.my_groups()
returns table (id uuid, name text, invite_code text, is_owner boolean, members integer, new_proofs integer, joined_at timestamptz, theme text, theme_label text, max_members integer)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.name, g.invite_code, g.owner_id = me.user_id,
         (select count(*) from public.group_members m where m.group_id = g.id)::integer,
         (select count(*) from public.proofs p
           where p.group_id = g.id and p.user_id <> me.user_id and p.hidden_at is null
             and p.created_at > me.last_seen_at
             and not exists (select 1 from public.blocks b where b.blocker_id = me.user_id and b.blocked_id = p.user_id))::integer,
         me.joined_at, g.theme, g.theme_label,
         public.bank_max_members(public.bank_stage(g.owner_id))
    from public.group_members me
    join public.groups g on g.id = me.group_id
   where me.user_id = auth.uid()
   order by me.joined_at
$$;
revoke all on function public.my_groups() from public, anon;
grant execute on function public.my_groups() to authenticated;
