-- 주간 지표 (NFR-011). Supabase SQL 편집기에서 관리자 권한으로 실행한다. 읽기만 한다.
-- 주는 월요일 시작, 한국 시각 기준. 최근 8주.
--
-- 열 설명
--   signups          그 주에 가입한 사람
--   activated        그중 가입 7일 안에 "이자가 붙은 할 일을 상환"한 사람 (활성화 이벤트)
--   week2_return     그중 가입 7~13일째에 앱을 다시 연 사람 (2주차 재방문)
--   week2_rate       week2_return ÷ signups (%)
--   weekly_active    그 주에 앱을 연 사람
--   buyers           그 주에 상점에서 산 사람
--   bad_status       그 주 마지막으로 본 상태가 나쁜 쪽(나태·게으름·빚더미·잠수·파산)인 사람
--   bad_next_return  그중 다음 주에도 앱을 연 사람
--   voice_mild       그 주에 말투를 순한맛으로 바꾼 사람

with ev as (
  select user_id, event, props, (ts at time zone 'Asia/Seoul') as at
    from public.events
),
weeks as (
  select generate_series(
           date_trunc('week', (now() at time zone 'Asia/Seoul')) - interval '7 weeks',
           date_trunc('week', (now() at time zone 'Asia/Seoul')),
           interval '1 week') as w
),
signup as (
  select user_id, min(at) as signed_at from ev where event = 'signup' group by user_id
),
activation as (
  select user_id, min(at) as activated_at
    from ev
   where event = 'repay' and coalesce((props->>'overdue_days')::int, 0) > 0
   group by user_id
),
opens as (
  select distinct user_id, date_trunc('day', at) as day from ev where event = 'app_open'
),
last_status as (
  select distinct on (user_id, date_trunc('week', at))
         user_id, date_trunc('week', at) as w, props->>'status' as status
    from ev
   where event = 'standing_view'
   order by user_id, date_trunc('week', at), at desc
)
select
  to_char(weeks.w, 'YYYY-MM-DD') as week_start,
  (select count(*) from signup s where s.signed_at >= weeks.w and s.signed_at < weeks.w + interval '1 week') as signups,
  (select count(*) from signup s join activation a using (user_id)
    where s.signed_at >= weeks.w and s.signed_at < weeks.w + interval '1 week'
      and a.activated_at < s.signed_at + interval '7 days') as activated,
  (select count(distinct s.user_id) from signup s join opens o using (user_id)
    where s.signed_at >= weeks.w and s.signed_at < weeks.w + interval '1 week'
      and o.day >= date_trunc('day', s.signed_at) + interval '7 days'
      and o.day < date_trunc('day', s.signed_at) + interval '14 days') as week2_return,
  round(100.0 * (select count(distinct s.user_id) from signup s join opens o using (user_id)
    where s.signed_at >= weeks.w and s.signed_at < weeks.w + interval '1 week'
      and o.day >= date_trunc('day', s.signed_at) + interval '7 days'
      and o.day < date_trunc('day', s.signed_at) + interval '14 days')
    / nullif((select count(*) from signup s where s.signed_at >= weeks.w and s.signed_at < weeks.w + interval '1 week'), 0), 1) as week2_rate,
  (select count(distinct o.user_id) from opens o where o.day >= weeks.w and o.day < weeks.w + interval '1 week') as weekly_active,
  (select count(distinct e.user_id) from ev e where e.event = 'item_buy' and e.at >= weeks.w and e.at < weeks.w + interval '1 week') as buyers,
  (select count(*) from last_status ls where ls.w = weeks.w
      and ls.status in ('slothful', 'lazy', 'debtPile', 'dormant', 'bankrupt')) as bad_status,
  (select count(distinct ls.user_id) from last_status ls join opens o using (user_id)
    where ls.w = weeks.w and ls.status in ('slothful', 'lazy', 'debtPile', 'dormant', 'bankrupt')
      and o.day >= weeks.w + interval '1 week' and o.day < weeks.w + interval '2 weeks') as bad_next_return,
  (select count(distinct e.user_id) from ev e
    where e.event = 'voice_change' and e.props->>'voice' = 'mild'
      and e.at >= weeks.w and e.at < weeks.w + interval '1 week') as voice_mild
from weeks
order by weeks.w desc;
