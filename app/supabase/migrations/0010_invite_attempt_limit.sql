-- 초대 코드 맞히기 막기 (그룹기획서 8절)
-- 없는 코드를 넣은 기록을 남기고, 한 사람이 1시간에 10번 넘게 틀리면 잠시 막는다.
-- 오류를 내면 기록도 함께 취소되므로, 못 찾았을 때는 오류 대신 빈 결과(null)를 돌려준다.

create table public.invite_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index invite_attempts_user_at on public.invite_attempts (user_id, at);
alter table public.invite_attempts enable row level security;
-- 정책 없음: 앱에서는 읽거나 쓸 수 없고, 아래 함수만 쓴다

-- 너무 많이 틀렸으면 막는다. 하루 지난 기록은 이참에 지운다.
create function public.check_invite_attempts(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.invite_attempts where user_id = p_user and at < now() - interval '1 day';
  if (select count(*) from public.invite_attempts where user_id = p_user and at > now() - interval '1 hour') >= 10 then
    raise exception '초대 코드를 너무 많이 틀렸어요' using errcode = 'P0001', hint = 'too_many_attempts';
  end if;
end;
$$;
revoke all on function public.check_invite_attempts(uuid) from public, anon, authenticated;

drop function public.group_preview(text);
create function public.group_preview(p_code text)
returns table (id uuid, name text, members integer, owner_nickname text, is_member boolean)
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
           exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = uid)
      from public.groups g
     where g.invite_code = upper(btrim(p_code));
  if not found then
    insert into public.invite_attempts (user_id) values (uid);
  end if;
end;
$$;

-- 못 찾으면 null을 돌려준다(앱은 "초대 코드를 찾을 수 없어요"로 보여 준다)
create or replace function public.join_group(p_code text, p_nickname text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
begin
  if uid is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  perform public.check_invite_attempts(uid);
  -- 동시에 여러 명이 들어와도 10명을 넘지 않게 그룹 행을 잠근다
  select g.id into gid from public.groups g where g.invite_code = upper(btrim(p_code)) for update;
  if gid is null then
    insert into public.invite_attempts (user_id) values (uid);
    return null;
  end if;
  if exists (select 1 from public.group_members where group_id = gid and user_id = uid) then
    return gid;
  end if;
  if (select count(*) from public.group_members where group_id = gid) >= 10 then
    raise exception '그룹이 꽉 찼어요' using errcode = 'P0001', hint = 'group_full';
  end if;
  if (select count(*) from public.group_members where user_id = uid) >= 3 then
    raise exception '그룹은 3개까지 들 수 있어요' using errcode = 'P0001', hint = 'too_many_groups';
  end if;
  insert into public.group_members (group_id, user_id, nickname) values (gid, uid, btrim(p_nickname));
  return gid;
end;
$$;

revoke all on function public.group_preview(text) from public, anon;
grant execute on function public.group_preview(text) to authenticated;
