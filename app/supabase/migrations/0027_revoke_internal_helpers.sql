-- NFR-003 점검: 다른 사람 아이디를 받는 내부 도우미 함수를 앱에서 바로 부르지 못하게 한다.
-- bank_stage(p_user)는 아무 사용자의 은행 단계를, shown_nameplate(p_user)는 이름표를 알려 준다.
-- 둘 다 security definer 함수(순위표, 그룹, 개설 제한) 안에서만 쓰므로 함수 소유자 권한으로 계속 돈다.
revoke execute on function public.bank_stage(uuid) from authenticated;
revoke execute on function public.shown_nameplate(uuid) from authenticated;
