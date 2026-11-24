-- 그룹 테마(카테고리) (시간적금기획서 11절)
-- 그룹을 만들 때 하나를 고른다: 공부, 운동, 독서, 요리, 생활 습관, 일, 취미, 기타(이름 직접 입력)
-- 그룹 목록·그룹 화면의 테마 표시, 인증 화면 문구에 쓴다. 방장은 나중에 바꿀 수 있다.

alter table public.groups
  add column theme text not null default 'etc'
    check (theme in ('study', 'workout', 'reading', 'cooking', 'habit', 'work', 'hobby', 'etc')),
  add column theme_label text
    check (theme_label is null or char_length(theme_label) between 1 and 10);

-- 만들기: 테마를 함께 받는다 (예전처럼 이름·별명만 넘겨도 된다)
drop function public.create_group(text, text);
create function public.create_group(p_name text, p_nickname text, p_theme text default 'etc', p_theme_label text default null)
returns table (id uuid, invite_code text)
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
  code text;
begin
  if uid is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  if (select count(*) from public.group_members where user_id = uid) >= 3 then
    raise exception '그룹은 3개까지 들 수 있어요' using errcode = 'P0001', hint = 'too_many_groups';
  end if;
  code := public.new_invite_code();
  insert into public.groups (name, owner_id, invite_code, theme, theme_label)
  values (btrim(p_name), uid, code, coalesce(p_theme, 'etc'), case when p_theme = 'etc' then nullif(btrim(coalesce(p_theme_label, '')), '') end)
  returning groups.id into gid;
  insert into public.group_members (group_id, user_id, nickname) values (gid, uid, btrim(p_nickname));
  return query select gid, code;
end;
$$;

-- 방장이 테마를 바꾼다
create function public.set_group_theme(p_group_id uuid, p_theme text, p_theme_label text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.groups where id = p_group_id and owner_id = auth.uid()) then
    raise exception '방장만 바꿀 수 있어요' using errcode = '42501';
  end if;
  update public.groups
     set theme = p_theme,
         theme_label = case when p_theme = 'etc' then nullif(btrim(coalesce(p_theme_label, '')), '') end
   where id = p_group_id;
end;
$$;

-- 내 그룹 목록: 테마를 더한다
drop function public.my_groups();
create function public.my_groups()
returns table (id uuid, name text, invite_code text, is_owner boolean, members integer, new_proofs integer, joined_at timestamptz, theme text, theme_label text)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.name, g.invite_code, g.owner_id = me.user_id,
         (select count(*) from public.group_members m where m.group_id = g.id)::integer,
         (select count(*) from public.proofs p
           where p.group_id = g.id and p.user_id <> me.user_id and p.hidden_at is null
             and p.created_at > me.last_seen_at
             and not exists (select 1 from public.blocks b where b.blocker_id = me.user_id and b.blocked_id = p.user_id))::integer,
         me.joined_at, g.theme, g.theme_label
    from public.group_members me
    join public.groups g on g.id = me.group_id
   where me.user_id = auth.uid()
   order by me.joined_at
$$;

-- 들어가기 전 미리 보기: 테마를 더한다 (틀린 코드 횟수 제한은 0010 그대로)
drop function public.group_preview(text);
create function public.group_preview(p_code text)
returns table (id uuid, name text, members integer, owner_nickname text, is_member boolean, theme text, theme_label text)
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
           g.theme, g.theme_label
      from public.groups g
     where g.invite_code = upper(btrim(p_code));
  if not found then
    insert into public.invite_attempts (user_id) values (uid);
  end if;
end;
$$;

revoke all on function public.create_group(text, text, text, text) from public, anon;
grant execute on function public.create_group(text, text, text, text) to authenticated;
revoke all on function public.set_group_theme(uuid, text, text) from public, anon;
grant execute on function public.set_group_theme(uuid, text, text) to authenticated;
revoke all on function public.my_groups() from public, anon;
grant execute on function public.my_groups() to authenticated;
revoke all on function public.group_preview(text) from public, anon;
grant execute on function public.group_preview(text) to authenticated;
