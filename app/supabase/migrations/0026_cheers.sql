-- 응원 보내기 (FR-109, 친구기획서 3.5절). 같은 친구에게 하루 한 번(한국 날짜). 친구 알림 설정을 따른다.
create table public.cheers (
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, day)
);
alter table public.cheers enable row level security;
-- 직접 읽고 쓰지 않는다. 아래 함수로만

create function public.send_cheer(p_to uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  name text;
begin
  if uid is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  if not public.is_friend(uid, p_to) or public.is_blocked_between(uid, p_to) then return 'not_friend'; end if;
  insert into public.cheers (from_id, to_id, day) values (uid, p_to, today) on conflict do nothing;
  if not found then return 'already'; end if;
  select coalesce(display_name, '친구') into name from public.profiles where id = uid;
  perform public.friend_push(uid, p_to, name || '님이 응원을 보냈어요. 오늘도 미루지 말아요!');
  return 'sent';
end;
$$;

-- 오늘 내가 응원한 친구들
create function public.my_cheers_today()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select to_id from public.cheers where from_id = auth.uid() and day = (now() at time zone 'Asia/Seoul')::date
$$;

revoke all on function public.send_cheer(uuid), public.my_cheers_today() from public, anon;
grant execute on function public.send_cheer(uuid), public.my_cheers_today() to authenticated;
