-- 계정 삭제 (FR-004)
-- 로그인한 사용자가 자기 계정을 지운다. 참조 관계(on delete cascade)에 따라
-- profiles → todos, repayments, events가 함께 지워진다.
--
-- 인증 사용자 삭제는 관리자 권한이 필요하다. 관리자 키를 앱에 넣지 않으려고,
-- 권한을 가진 함수로 두고 "자기 자신만" 지울 수 있게 한다.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end;
$$;

comment on function public.delete_account() is '로그인한 사용자 자신의 계정과 모든 데이터를 삭제한다 (FR-004)';

-- 로그인한 사용자만 부를 수 있다
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
