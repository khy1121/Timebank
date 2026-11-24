-- 카카오톡 친구 찾기 (FR-108, 친구기획서 3.3절)
--
-- 앱이 카카오 친구 목록 API에서 받은 카카오 회원 번호를 넘기면,
-- 카카오로 가입한 앱 사용자(auth.identities, provider = kakao)와 맞춰 이름과 친구 상태를 돌려준다.
-- 받은 회원 번호는 저장하지 않는다. 차단 관계인 사람과 나 자신은 뺀다.

create function public.match_kakao_friends(p_kakao_ids text[])
returns table (user_id uuid, kakao_id text, name text, state text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  -- 카카오 친구 목록은 한 번에 많아야 수백 명이다. 너무 크면 앞부분만 본다
  return query
    select i.user_id, i.provider_id, coalesce(p.display_name, '친구'),
           case
             when public.is_friend(uid, i.user_id) then 'friend'
             when exists (select 1 from public.friend_requests r where r.from_id = uid and r.to_id = i.user_id
                            and r.created_at > now() - interval '7 days') then 'sent'
             when exists (select 1 from public.friend_requests r where r.from_id = i.user_id and r.to_id = uid
                            and r.created_at > now() - interval '7 days') then 'received'
             else 'none'
           end
      from auth.identities i
      join public.profiles p on p.id = i.user_id
     where i.provider = 'kakao'
       and i.provider_id = any (p_kakao_ids[1:1000])
       and i.user_id <> uid
       and not public.is_blocked_between(uid, i.user_id);
end;
$$;

revoke all on function public.match_kakao_friends(text[]) from public, anon;
grant execute on function public.match_kakao_friends(text[]) to authenticated;
