-- 보안 점검(2026-11-25): 카카오톡 친구 찾기(match_kakao_friends)에 하루 호출 제한을 둔다.
-- 전에는 카카오 회원번호를 마음대로 넣어 끝없이 부를 수 있어, 번호를 돌려 보며 우리 앱 사용자를 찾아낼 수 있었다.
-- 한 사람이 하루(24시간)에 10번까지. 앱은 "카카오톡 친구 찾기"를 누를 때 한 번 부른다.

alter table public.invite_attempts drop constraint invite_attempts_kind_check;
alter table public.invite_attempts add constraint invite_attempts_kind_check check (kind in ('group', 'friend', 'kakao'));

-- 초대 코드 틀린 횟수에는 카카오 친구 찾기를 세지 않는다
create or replace function public.check_invite_attempts(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.invite_attempts where user_id = p_user and at < now() - interval '1 day';
  if (select count(*) from public.invite_attempts
       where user_id = p_user and kind in ('group', 'friend') and at > now() - interval '1 hour') >= 10 then
    raise exception '초대 코드를 너무 많이 틀렸어요' using errcode = 'P0001', hint = 'too_many_attempts';
  end if;
end;
$$;

-- 부를 때마다 기록을 남기므로 STABLE에서 VOLATILE로 바뀐다
create or replace function public.match_kakao_friends(p_kakao_ids text[])
returns table (user_id uuid, kakao_id text, name text, state text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  delete from public.invite_attempts a where a.user_id = uid and a.kind = 'kakao' and a.at < now() - interval '1 day';
  if (select count(*) from public.invite_attempts a where a.user_id = uid and a.kind = 'kakao') >= 10 then
    raise exception '카카오톡 친구 찾기를 너무 많이 했어요' using errcode = 'P0001', hint = 'too_many_kakao';
  end if;
  insert into public.invite_attempts (user_id, kind) values (uid, 'kakao');
  return query
    select i.user_id, i.provider_id, coalesce(p.display_name, '친구'),
           case when public.is_friend(uid, i.user_id) then 'friend'
                when exists (select 1 from public.friend_requests r where r.from_id = uid and r.to_id = i.user_id and r.created_at > now() - interval '7 days') then 'sent'
                when exists (select 1 from public.friend_requests r where r.from_id = i.user_id and r.to_id = uid and r.created_at > now() - interval '7 days') then 'received'
                else 'none' end
      from auth.identities i
      join public.profiles p on p.id = i.user_id
     where i.provider = 'kakao'
       and i.provider_id = any (p_kakao_ids[1:1000])
       and i.user_id <> uid
       and not public.is_blocked_between(uid, i.user_id);
end;
$$;
