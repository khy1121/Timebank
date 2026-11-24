-- 시간 적금 (시간적금기획서 TI-SAV-001)
-- 잔고는 여전히 저장하지 않는다. 앱이 할 일, 상환, 구매, 장부 사건에서 계산한다(app/src/domain/savings.ts).
-- 여기서는 계산에 필요한 기록만 더한다.
--   todos.stake_group_id: 그룹 보증금으로 걸었으면 그 그룹 (4.7)
--   todos.created_at: 기기에서 등록한 시각을 그대로 받는다. 1시간 무료 수정과 원금을 건 날에 쓴다 (4.2, 4.3)
--   ledger_events: 기한 연장 수수료, 파산, 금고 배당 (4.3, 4.6, 4.7)

-- ---------------------------------------------------------------------------
-- todos
-- ---------------------------------------------------------------------------
alter table public.todos
  add column stake_group_id uuid references public.groups (id) on delete set null;

drop function public.upsert_todo(uuid, text, smallint, date, text, timestamptz, timestamptz);

create function public.upsert_todo(
  p_id uuid,
  p_title text,
  p_importance smallint,
  p_due_date date,
  p_status text,
  p_updated_at timestamptz,
  p_deleted_at timestamptz default null,
  p_created_at timestamptz default null,
  p_stake_group_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- 내가 든 그룹에만 보증금을 건다
  if p_stake_group_id is not null and not public.is_group_member(p_stake_group_id::text) then
    raise exception '그룹에 들어가 있지 않아요' using errcode = '42501';
  end if;
  insert into public.todos (id, title, importance, due_date, status, updated_at, deleted_at, created_at, stake_group_id)
  values (p_id, p_title, p_importance, p_due_date, p_status, p_updated_at, p_deleted_at, coalesce(p_created_at, now()), p_stake_group_id)
  on conflict (id) do update
    set title = excluded.title,
        importance = excluded.importance,
        due_date = excluded.due_date,
        status = excluded.status,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        stake_group_id = excluded.stake_group_id
    where excluded.updated_at > public.todos.updated_at;
end;
$$;

revoke all on function public.upsert_todo(uuid, text, smallint, date, text, timestamptz, timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.upsert_todo(uuid, text, smallint, date, text, timestamptz, timestamptz, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- ledger_events
-- ---------------------------------------------------------------------------
create table public.ledger_events (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('extend', 'bankrupt', 'payout')),
  -- extend: 미룬 할 일
  todo_id uuid references public.todos (id) on delete cascade,
  -- extend: 미룬 날 수
  days integer check (days is null or days > 0),
  -- extend: 수수료(양수), payout: 받은 냥(양수), bankrupt: 0
  amount integer not null default 0 check (amount >= 0),
  happened_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  deleted_at timestamptz,
  check (kind <> 'extend' or (todo_id is not null and days is not null))
);
create index ledger_events_user_updated_idx on public.ledger_events (user_id, updated_at);

alter table public.ledger_events enable row level security;

create policy "ledger_events: 본인만 조회" on public.ledger_events
  for select to authenticated using ((select auth.uid()) = user_id);

-- 금고 배당(payout)은 서버만 넣는다
create policy "ledger_events: 본인만 추가" on public.ledger_events
  for insert to authenticated with check ((select auth.uid()) = user_id and kind in ('extend', 'bankrupt'));

create policy "ledger_events: 본인만 수정" on public.ledger_events
  for update to authenticated
  using ((select auth.uid()) = user_id and kind in ('extend', 'bankrupt'))
  with check ((select auth.uid()) = user_id and kind in ('extend', 'bankrupt'));

-- 동기화용: 들어온 행의 updated_at이 더 늦을 때만 덮어쓴다 (FR-042와 같은 규칙)
create function public.upsert_ledger_event(
  p_id uuid,
  p_kind text,
  p_todo_id uuid,
  p_days integer,
  p_amount integer,
  p_happened_on date,
  p_updated_at timestamptz,
  p_deleted_at timestamptz default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.ledger_events (id, kind, todo_id, days, amount, happened_on, updated_at, deleted_at)
  values (p_id, p_kind, p_todo_id, p_days, p_amount, p_happened_on, p_updated_at, p_deleted_at)
  on conflict (id) do update
    set days = excluded.days,
        amount = excluded.amount,
        happened_on = excluded.happened_on,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
    where public.ledger_events.updated_at < excluded.updated_at;
$$;

revoke all on function public.upsert_ledger_event(uuid, text, uuid, integer, integer, date, timestamptz, timestamptz) from public, anon;
grant execute on function public.upsert_ledger_event(uuid, text, uuid, integer, integer, date, timestamptz, timestamptz) to authenticated;
