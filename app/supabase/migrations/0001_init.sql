-- 할 일 이자: 초기 스키마 (데이터설계서 TI-DBD-001 3~4절)
-- 원칙: 이자와 부채는 저장하지 않는다. 상환·탕감 시점의 금액만 기록으로 남긴다.

-- ---------------------------------------------------------------------------
-- profiles: 사용자 설정
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  signup_source text not null default 'unknown'
    check (signup_source in ('friend', 'store', 'sns', 'etc', 'unknown')),
  notify_enabled boolean not null default true,
  notify_time time not null default '09:00',
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: 본인만 조회" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "profiles: 본인만 수정" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 가입하면 프로필을 자동으로 만든다
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- todos: 할 일
-- ---------------------------------------------------------------------------
create table public.todos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  importance smallint not null default 3 check (importance between 1 and 5),
  principal integer generated always as (importance * 1000) stored,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'repaid', 'forgiven')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create index todos_user_updated_idx on public.todos (user_id, updated_at);
create index todos_user_status_idx on public.todos (user_id, status) where deleted_at is null;

alter table public.todos enable row level security;

create policy "todos: 본인만 조회" on public.todos
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "todos: 본인만 추가" on public.todos
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "todos: 본인만 수정" on public.todos
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 연체된 할 일은 기한을 바꿀 수 없다 (FR-011). 앱에서도 막지만 서버에서 한 번 더 막는다.
-- 기기의 현지 날짜와 서버 날짜(UTC)가 다를 수 있어 하루의 여유를 둔다.
create function public.guard_overdue_due_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.due_date is distinct from old.due_date
     and old.status = 'open'
     and old.due_date < (current_date - 1) then
    raise exception '연체된 할 일은 기한을 바꿀 수 없습니다';
  end if;
  return new;
end;
$$;

create trigger todos_guard_due_date
  before update on public.todos
  for each row execute function public.guard_overdue_due_date();

-- ---------------------------------------------------------------------------
-- repayments: 상환·탕감 기록
-- ---------------------------------------------------------------------------
create table public.repayments (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  todo_id uuid not null references public.todos (id) on delete cascade,
  kind text not null check (kind in ('repaid', 'forgiven')),
  title text not null,
  principal integer not null check (principal > 0),
  interest integer not null default 0 check (interest >= 0),
  overdue_days integer not null default 0 check (overdue_days >= 0),
  settled_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  deleted_at timestamptz,
  -- 부채 상한은 원금의 10배이므로 이자는 원금의 9배를 넘지 않는다 (FR-022)
  constraint repayments_interest_cap check (interest <= principal * 9)
);

-- 한 할 일에 유효한 기록은 1건
create unique index repayments_one_per_todo on public.repayments (todo_id) where deleted_at is null;
create index repayments_user_settled_idx on public.repayments (user_id, settled_on desc) where deleted_at is null;
create index repayments_user_updated_idx on public.repayments (user_id, updated_at);

alter table public.repayments enable row level security;

create policy "repayments: 본인만 조회" on public.repayments
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "repayments: 본인만 추가" on public.repayments
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "repayments: 본인만 수정" on public.repayments
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- events: 사용 기록. 앱은 추가만 할 수 있고 읽을 수 없다.
-- 할 일 제목은 props에 넣지 않는다 (NFR-009).
-- ---------------------------------------------------------------------------
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  event text not null,
  ts timestamptz not null default now(),
  props jsonb not null default '{}'::jsonb
);

create index events_event_ts_idx on public.events (event, ts);
create index events_user_ts_idx on public.events (user_id, ts);

alter table public.events enable row level security;

create policy "events: 본인 것만 추가" on public.events
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 동기화용 함수: 들어온 행의 updated_at이 더 늦을 때만 덮어쓴다 (FR-042)
-- security invoker이므로 위의 행 단위 보안이 그대로 적용된다.
-- ---------------------------------------------------------------------------
create function public.upsert_todo(
  p_id uuid,
  p_title text,
  p_importance smallint,
  p_due_date date,
  p_status text,
  p_updated_at timestamptz,
  p_deleted_at timestamptz default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.todos (id, title, importance, due_date, status, updated_at, deleted_at)
  values (p_id, p_title, p_importance, p_due_date, p_status, p_updated_at, p_deleted_at)
  on conflict (id) do update
    set title = excluded.title,
        importance = excluded.importance,
        due_date = excluded.due_date,
        status = excluded.status,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
    where excluded.updated_at > public.todos.updated_at;
$$;

create function public.upsert_repayment(
  p_id uuid,
  p_todo_id uuid,
  p_kind text,
  p_title text,
  p_principal integer,
  p_interest integer,
  p_overdue_days integer,
  p_settled_on date,
  p_updated_at timestamptz,
  p_deleted_at timestamptz default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.repayments
    (id, todo_id, kind, title, principal, interest, overdue_days, settled_on, updated_at, deleted_at)
  values
    (p_id, p_todo_id, p_kind, p_title, p_principal, p_interest, p_overdue_days, p_settled_on, p_updated_at, p_deleted_at)
  on conflict (id) do update
    set kind = excluded.kind,
        title = excluded.title,
        principal = excluded.principal,
        interest = excluded.interest,
        overdue_days = excluded.overdue_days,
        settled_on = excluded.settled_on,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
    where excluded.updated_at > public.repayments.updated_at;
$$;

revoke execute on function public.upsert_todo(uuid, text, smallint, date, text, timestamptz, timestamptz) from public, anon;
revoke execute on function public.upsert_repayment(uuid, uuid, text, text, integer, integer, integer, date, timestamptz, timestamptz) from public, anon;
grant execute on function public.upsert_todo(uuid, text, smallint, date, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.upsert_repayment(uuid, uuid, text, text, integer, integer, integer, date, timestamptz, timestamptz) to authenticated;
