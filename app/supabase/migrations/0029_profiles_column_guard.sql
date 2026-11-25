-- 보안 점검(2026-11-25): 본인 프로필이라도 서버가 정하는 칸은 앱에서 바로 고치지 못하게 한다.
-- 전에는 profiles UPDATE 권한이 모든 칸에 있어서, 로그인한 사람이 자기 신용 점수(credit_score)를 1000으로 바꾸면
-- 전체 순위표 1등이 될 수 있었다. 이름·이름표·친구 코드도 검사 함수를 거치지 않고 바꿀 수 있었다.
--
-- 앱이 직접 고치는 칸만 열어 둔다(domain/profile.ts profilePatchToRow, store/standing.tsx, store/groups.tsx).
-- 나머지는 함수로만 바뀐다:
--   display_name → set_display_name, nameplate → set_nameplate, friend_code → rotate_friend_code,
--   credit_score·credit_start → settle_credit(예약 작업), id·created_at → 바뀌지 않음
revoke update on table public.profiles from authenticated, anon;
grant update (
  notify_enabled, notify_time, onboarded_at, signup_source, equipped, voice,
  push_friends, todo_bundles, proof_rules_at, status_code, status_on, updated_at
) on table public.profiles to authenticated;
