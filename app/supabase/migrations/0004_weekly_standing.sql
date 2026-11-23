-- 이번 주 순위와 지난 주들의 순위, 말투 설정 (FR-065~069)
--
-- 다른 사용자의 행은 행 단위 보안으로 읽을 수 없으므로, 관리자 권한 함수가 모아서 계산하고
-- 부른 사람 자신의 주별 순위·참여자 수·점수·1등 점수만 돌려준다. 다른 사람의 ID나 내용은 돌려주지 않는다.
--
-- 한 주 = 그 주의 마지막 날(E)까지 7일. 이번 주는 E = 오늘(한국 날짜).
-- 점수(냥) = 그 7일 동안 기한 안 상환 보상(원금의 10%)
--          − 그 7일 동안 연체 상환·탕감으로 낸 이자
--          − E 시점에 연체 중이던 할 일에 붙어 있던 이자
-- 참여자 = E 시점에 끝내지 않은 할 일이 있었거나 그 7일 동안 상환·탕감한 사람 + 부른 사람

create or replace function public.standing_history(p_weeks integer default 5)
returns table (week_end date, rank integer, participants integer, score integer, top_score integer)
language sql
stable
security definer
set search_path = ''
as $$
  with weeks as (
    select ((now() at time zone 'Asia/Seoul')::date - 7 * g) as e
      from generate_series(0, least(greatest(p_weeks, 1), 12) - 1) as g
  ),
  todo_state as (
    select t.user_id, t.principal, t.due_date,
           (t.created_at at time zone 'Asia/Seoul')::date as created_on,
           (t.deleted_at at time zone 'Asia/Seoul')::date as deleted_on,
           (select min(r.settled_on) from public.repayments r
              where r.todo_id = t.id and r.deleted_at is null) as settled_on
      from public.todos t
  ),
  -- E 시점에 끝나지 않은 할 일
  open_at as (
    select w.e, s.user_id, s.principal, s.due_date
      from weeks w
      join todo_state s
        on s.created_on <= w.e
       and (s.deleted_on is null or s.deleted_on > w.e)
       and (s.settled_on is null or s.settled_on > w.e)
  ),
  settled_in as (
    select w.e, r.user_id,
           case when r.kind = 'repaid' and r.overdue_days = 0 then r.principal / 10 else -r.interest end as v
      from weeks w
      join public.repayments r
        on r.deleted_at is null and r.settled_on > w.e - 7 and r.settled_on <= w.e
  ),
  people as (
    select e, user_id from open_at
    union select e, user_id from settled_in
    union select e, auth.uid() from weeks
  ),
  scores as (
    select p.e, p.user_id,
           (coalesce((select sum(si.v) from settled_in si where si.e = p.e and si.user_id = p.user_id), 0)
            - coalesce((select sum(least(floor(o.principal * power(1.1::numeric, p.e - o.due_date)), o.principal * 10) - o.principal)
                          from open_at o where o.e = p.e and o.user_id = p.user_id and o.due_date < p.e), 0))::integer as score
      from people p
      where p.user_id is not null
  ),
  ranked as (
    select s.e, s.user_id, s.score,
           rank() over (partition by s.e order by s.score desc) as rk,
           count(*) over (partition by s.e) as n,
           max(s.score) over (partition by s.e) as top
      from scores s
  )
  select r.e, r.rk::integer, r.n::integer, r.score, r.top::integer
    from ranked r
    where r.user_id = auth.uid()
    order by r.e;
$$;

comment on function public.standing_history(integer) is '부른 사람의 주별 순위·참여자 수·점수·1등 점수, 최근 N주(최대 12) (FR-065, FR-068). 다른 사용자의 정보는 돌려주지 않는다';

revoke all on function public.standing_history(integer) from public, anon;
grant execute on function public.standing_history(integer) to authenticated;

-- 상태 문구 말투 (FR-067). spicy = 매운맛(기본), mild = 순한맛
alter table public.profiles
  add column voice text not null default 'spicy'
  constraint profiles_voice_check check (voice in ('spicy', 'mild'));
