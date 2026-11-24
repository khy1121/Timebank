-- 친구 (FR-103~107, 친구기획서 TI-FRD-001 1·2단계)
--
-- 원칙
-- - 친구는 신청하고 상대가 수락해야 맺어진다. 거절은 신청한 사람에게 알리지 않는다.
-- - 친구에게는 이름과 숫자 기록(이번 주 끝낸 수, 지금 연체 수, 마지막 활동일)만 보인다. 할 일 제목은 보이지 않는다.
-- - 차단(blocks)은 그룹과 같은 목록을 쓴다. 어느 쪽이든 차단했으면 신청할 수 없다.
-- - 다른 사람의 행을 모으는 일은 관리자 권한 함수가 하고 필요한 칸만 돌려준다.

-- ---------------------------------------------------------------------------
-- 프로필: 표시 이름, 친구 코드
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 10),
  add column friend_code text unique check (friend_code is null or friend_code ~ '^[A-Z2-9]{6}$');

comment on column public.profiles.display_name is '친구와 순위표에 쓰는 이름. 가입할 때 카카오 닉네임으로 채운다 (FR-103)';
comment on column public.profiles.friend_code is '6자리 친구 코드 (FR-104)';

-- 6자리 친구 코드. 그룹 초대 코드와 같은 글자(헷갈리는 0·O·1·I·L 제외)
create function public.new_friend_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end;
$$;

-- 카카오 닉네임(Supabase가 name 등에 넣어 준다). 없으면 "친구"
create function public.default_display_name(p_meta jsonb)
returns text
language sql immutable set search_path = ''
as $$
  select coalesce(nullif(left(btrim(coalesce(p_meta->>'name', p_meta->>'full_name', p_meta->>'user_name', p_meta->>'preferred_username', '')), 10), ''), '친구')
$$;

-- 새 프로필에 이름과 코드를 채운다
create function public.fill_profile_defaults()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.display_name is null then
    select public.default_display_name(u.raw_user_meta_data) into new.display_name from auth.users u where u.id = new.id;
    new.display_name := coalesce(new.display_name, '친구');
  end if;
  if new.friend_code is null then
    new.friend_code := public.new_friend_code();
  end if;
  return new;
end;
$$;

create trigger profiles_fill_defaults
  before insert on public.profiles
  for each row execute function public.fill_profile_defaults();

-- 이미 가입한 사람 채우기
update public.profiles p
   set display_name = public.default_display_name(u.raw_user_meta_data)
  from auth.users u
 where u.id = p.id and p.display_name is null;

do $$
declare r record;
begin
  for r in select id from public.profiles where friend_code is null loop
    update public.profiles set friend_code = public.new_friend_code() where id = r.id;
  end loop;
end;
$$;

-- 틀린 코드 기록을 그룹 초대와 함께 쓴다(같은 한도)
alter table public.invite_attempts
  add column kind text not null default 'group' check (kind in ('group', 'friend'));

-- ---------------------------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------------------------
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  via text not null check (via in ('code', 'kakao', 'group')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);
create index friend_requests_to_idx on public.friend_requests (to_id);
comment on table public.friend_requests is '답을 기다리는 친구 신청. 수락·거절·취소하면 지우고, 7일 지나면 지운다 (FR-105)';

create table public.friendships (
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index friendships_b_idx on public.friendships (user_b);
comment on table public.friendships is '친구 관계 한 줄(작은 ID가 user_a). 끊으면 지운다 (FR-105, 107)';

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

create policy "friend_requests: 내가 들어간 것만 조회" on public.friend_requests
  for select to authenticated using ((select auth.uid()) in (from_id, to_id));
create policy "friendships: 내가 들어간 것만 조회" on public.friendships
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));
-- 추가·수정·삭제는 아래 함수로만 한다

-- ---------------------------------------------------------------------------
-- 내부 도우미
-- ---------------------------------------------------------------------------
create function public.is_friend(p_a uuid, p_b uuid)
returns boolean
language sql stable set search_path = ''
as $$
  select exists (select 1 from public.friendships where user_a = least(p_a, p_b) and user_b = greatest(p_a, p_b))
$$;

create function public.friend_count(p_user uuid)
returns integer
language sql stable set search_path = ''
as $$
  select count(*)::integer from public.friendships where p_user in (user_a, user_b)
$$;

-- 친구 수 한도. 은행 5단계(시간은행 본점)에서 100명으로 늘린다(상점기획서 11절, 은행 7단계를 만들 때)
create function public.friend_limit(p_user uuid)
returns integer
language sql stable set search_path = ''
as $$
  select 50
$$;

create function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql stable set search_path = ''
as $$
  select exists (select 1 from public.blocks
                  where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a))
$$;

-- 친구 알림 한 건 보내기(친구 알림을 켠 사람, 보낸 사람을 차단하지 않은 사람에게만)
create function public.friend_push(p_from uuid, p_to uuid, p_body text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  msgs jsonb;
begin
  if public.is_blocked_between(p_from, p_to) then return; end if;
  select jsonb_agg(jsonb_build_object('to', t.token, 'title', '친구', 'body', p_body,
           'data', jsonb_build_object('friends', true), 'sound', 'default', 'channelId', 'friends'))
    into msgs
    from public.push_tokens t
    join public.profiles pf on pf.id = t.user_id and pf.push_friends
   where t.user_id = p_to;
  if msgs is not null then perform public.send_expo_push(msgs); end if;
end;
$$;

-- 둘을 친구로 만든다. 신청은 양쪽 모두 지운다
create function public.make_friends(p_a uuid, p_b uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if public.friend_count(p_a) >= public.friend_limit(p_a) then
    raise exception '친구가 가득 찼어요' using errcode = 'P0001', hint = 'friend_limit';
  end if;
  if public.friend_count(p_b) >= public.friend_limit(p_b) then
    raise exception '상대의 친구가 가득 찼어요' using errcode = 'P0001', hint = 'friend_target_limit';
  end if;
  insert into public.friendships (user_a, user_b) values (least(p_a, p_b), greatest(p_a, p_b)) on conflict do nothing;
  delete from public.friend_requests where (from_id = p_a and to_id = p_b) or (from_id = p_b and to_id = p_a);
end;
$$;

-- ---------------------------------------------------------------------------
-- 앱이 부르는 함수
-- ---------------------------------------------------------------------------

-- 친구 신청 (FR-105). 코드(p_code) 또는 사람(p_user, 같은 그룹일 때)으로.
-- 돌려주는 값: sent(신청함) / friends(바로 친구가 됨: 이미 친구이거나 상대가 먼저 신청했음) / not_found(없는 코드)
-- 못 찾았을 때는 오류 대신 not_found를 돌려준다(오류를 내면 틀린 기록도 취소되기 때문)
create function public.send_friend_request(p_code text default null, p_user uuid default null, p_via text default 'code')
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target uuid;
  my_name text;
  inserted boolean;
begin
  if uid is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  if p_via not in ('code', 'kakao', 'group') then raise exception '알 수 없는 방법이에요' using errcode = '22023'; end if;

  if p_code is not null then
    perform public.check_invite_attempts(uid);
    select p.id into target from public.profiles p where p.friend_code = upper(btrim(p_code));
    if target is null then
      insert into public.invite_attempts (user_id, kind) values (uid, 'friend');
      return 'not_found';
    end if;
  elsif p_user is not null then
    target := p_user;
    if p_via = 'group' and not exists (
      select 1 from public.group_members a join public.group_members b on b.group_id = a.group_id
       where a.user_id = uid and b.user_id = target) then
      return 'not_found';
    end if;
  else
    raise exception '코드나 사람이 필요해요' using errcode = '22023';
  end if;

  if target = uid then
    raise exception '내 코드예요' using errcode = 'P0001', hint = 'friend_self';
  end if;
  if public.is_blocked_between(uid, target) then
    raise exception '신청할 수 없는 사람이에요' using errcode = 'P0001', hint = 'friend_blocked';
  end if;
  if public.is_friend(uid, target) then return 'friends'; end if;

  -- 지난 신청 정리
  delete from public.friend_requests where created_at < now() - interval '7 days' and uid in (from_id, to_id);

  -- 상대가 이미 나에게 신청했으면 바로 친구
  if exists (select 1 from public.friend_requests where from_id = target and to_id = uid) then
    perform public.make_friends(uid, target);
    select display_name into my_name from public.profiles where id = uid;
    perform public.friend_push(uid, target, coalesce(my_name, '친구') || '님과 친구가 됐어요.');
    return 'friends';
  end if;

  if public.friend_count(uid) >= public.friend_limit(uid) then
    raise exception '친구가 가득 찼어요' using errcode = 'P0001', hint = 'friend_limit';
  end if;

  insert into public.friend_requests (from_id, to_id, via) values (uid, target, p_via)
  on conflict (from_id, to_id) do nothing
  returning true into inserted;

  -- 처음 보낸 신청만 알린다(같은 신청을 여러 번 눌러도 한 번)
  if inserted then
    select display_name into my_name from public.profiles where id = uid;
    perform public.friend_push(uid, target, coalesce(my_name, '친구') || '님이 친구 신청을 보냈어요.');
  end if;
  return 'sent';
end;
$$;

-- 받은 신청에 답하기 (FR-105). 거절은 알리지 않는다
create function public.respond_friend_request(p_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r record;
  my_name text;
begin
  if uid is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  select * into r from public.friend_requests where id = p_id and to_id = uid;
  if not found or r.created_at < now() - interval '7 days' then
    delete from public.friend_requests where id = p_id and to_id = uid;
    raise exception '이미 없어진 신청이에요' using errcode = 'P0001', hint = 'request_gone';
  end if;
  if not p_accept then
    delete from public.friend_requests where id = p_id;
    return;
  end if;
  if public.is_blocked_between(uid, r.from_id) then
    delete from public.friend_requests where id = p_id;
    raise exception '신청할 수 없는 사람이에요' using errcode = 'P0001', hint = 'friend_blocked';
  end if;
  perform public.make_friends(uid, r.from_id);
  select display_name into my_name from public.profiles where id = uid;
  perform public.friend_push(uid, r.from_id, coalesce(my_name, '친구') || '님이 친구 신청을 받았어요.');
end;
$$;

-- 보낸 신청 취소
create function public.cancel_friend_request(p_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.friend_requests where id = p_id and from_id = auth.uid()
$$;

-- 친구 끊기 (FR-107). 알리지 않는다
create function public.remove_friend(p_user uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.friendships
   where user_a = least(auth.uid(), p_user) and user_b = greatest(auth.uid(), p_user)
$$;

-- 친구 코드 바꾸기 (FR-104)
create function public.rotate_friend_code()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  code text := public.new_friend_code();
begin
  if auth.uid() is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  update public.profiles set friend_code = code, updated_at = now() where id = auth.uid();
  return code;
end;
$$;

-- 표시 이름 바꾸기 (FR-103)
create function public.set_display_name(p_name text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 10 then
    raise exception '이름은 1~10자로 적어 주세요' using errcode = 'P0001', hint = 'bad_display_name';
  end if;
  update public.profiles set display_name = btrim(p_name), updated_at = now() where id = auth.uid();
end;
$$;

-- 내 친구 목록 (FR-106). 내가 차단한 사람은 빼고, 이름과 숫자 기록만 돌려준다.
-- 날짜는 한국 날짜 기준. 이번 주 = 오늘 포함 최근 7일
create function public.my_friends()
returns table (user_id uuid, name text, since timestamptz, done_week integer, overdue_now integer, last_active date)
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
         (select (max(e.ts) at time zone 'Asia/Seoul')::date from public.events e where e.user_id = f.uid)
    from f
    join public.profiles p on p.id = f.uid
    cross join me
   where not exists (select 1 from public.blocks b where b.blocker_id = me.id and b.blocked_id = f.uid)
   order by f.created_at
$$;

-- 받은 신청과 보낸 신청 (FR-105). 7일 지난 것은 이참에 지운다
create function public.my_friend_requests()
returns table (id uuid, user_id uuid, name text, via text, incoming boolean, created_at timestamptz, common_group text)
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  delete from public.friend_requests fr where fr.created_at < now() - interval '7 days' and uid in (fr.from_id, fr.to_id);
  return query
    select r.id, o.id, coalesce(o.display_name, '친구'), r.via, r.to_id = uid, r.created_at,
           (select g.name from public.group_members a
              join public.group_members b on b.group_id = a.group_id
              join public.groups g on g.id = a.group_id
             where a.user_id = uid and b.user_id = o.id
             order by a.joined_at limit 1)
      from public.friend_requests r
      join public.profiles o on o.id = case when r.to_id = uid then r.from_id else r.to_id end
     where uid in (r.from_id, r.to_id)
       and not exists (select 1 from public.blocks b where b.blocker_id = uid and b.blocked_id = o.id)
     order by r.created_at desc;
end;
$$;

-- 친구 프로필 (FR-106). 친구일 때만 돌려준다
create function public.friend_profile(p_user uuid)
returns table (user_id uuid, name text, since timestamptz, done_week integer, overdue_now integer,
               verified_week integer, last_active date, common_groups text[])
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
                order by g.name)
    from me
    join public.friendships fs on fs.user_a = least(me.id, p_user) and fs.user_b = greatest(me.id, p_user)
    join public.profiles p on p.id = p_user
$$;

-- 여러 사람과의 친구 상태 (그룹원 화면의 "친구 신청" 버튼)
-- friend / sent(내가 신청함) / received(받은 신청) / blocked(어느 쪽이든 차단) / none
create function public.my_friend_states(p_users uuid[])
returns table (user_id uuid, state text)
language sql stable security definer set search_path = ''
as $$
  select u, case
    when public.is_blocked_between(auth.uid(), u) then 'blocked'
    when public.is_friend(auth.uid(), u) then 'friend'
    when exists (select 1 from public.friend_requests r where r.from_id = auth.uid() and r.to_id = u
                   and r.created_at > now() - interval '7 days') then 'sent'
    when exists (select 1 from public.friend_requests r where r.from_id = u and r.to_id = auth.uid()
                   and r.created_at > now() - interval '7 days') then 'received'
    else 'none' end
    from unnest(p_users) as u
   where auth.uid() is not null and u <> auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- 권한
-- ---------------------------------------------------------------------------
revoke all on function public.new_friend_code() from public, anon, authenticated;
revoke all on function public.fill_profile_defaults() from public, anon, authenticated;
revoke all on function public.friend_push(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.make_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_friend(uuid, uuid) from public, anon, authenticated;
revoke all on function public.friend_count(uuid) from public, anon, authenticated;
revoke all on function public.friend_limit(uuid) from public, anon, authenticated;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'send_friend_request(text, uuid, text)', 'respond_friend_request(uuid, boolean)', 'cancel_friend_request(uuid)',
    'remove_friend(uuid)', 'rotate_friend_code()', 'set_display_name(text)', 'my_friends()', 'my_friend_requests()',
    'friend_profile(uuid)', 'my_friend_states(uuid[])'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
