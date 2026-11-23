-- 상점 구매 기록과 착용 정보 (FR-063, FR-064)
-- 잔고는 저장하지 않는다. 앱이 상환 기록과 구매 기록에서 계산한다 (FR-060~062).

-- ---------------------------------------------------------------------------
-- purchases: 산 물건. 한 사람은 같은 물건을 한 번만 산다.
-- ---------------------------------------------------------------------------
create table public.purchases (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_code text not null check (char_length(item_code) between 1 and 40),
  price integer not null check (price > 0),
  purchased_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create unique index purchases_one_per_item on public.purchases (user_id, item_code) where deleted_at is null;
create index purchases_user_updated_idx on public.purchases (user_id, updated_at);

alter table public.purchases enable row level security;

create policy "purchases: 본인만 조회" on public.purchases
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "purchases: 본인만 추가" on public.purchases
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "purchases: 본인만 수정" on public.purchases
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 동기화용: 들어온 행의 updated_at이 더 늦을 때만 덮어쓴다 (FR-042와 같은 규칙)
create function public.upsert_purchase(
  p_id uuid,
  p_item_code text,
  p_price integer,
  p_purchased_on date,
  p_updated_at timestamptz,
  p_deleted_at timestamptz default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.purchases (id, item_code, price, purchased_on, updated_at, deleted_at)
  values (p_id, p_item_code, p_price, p_purchased_on, p_updated_at, p_deleted_at)
  on conflict (id) do update
    set item_code = excluded.item_code,
        price = excluded.price,
        purchased_on = excluded.purchased_on,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
    where public.purchases.updated_at < excluded.updated_at;
$$;

revoke all on function public.upsert_purchase(uuid, text, integer, date, timestamptz, timestamptz) from public, anon;
grant execute on function public.upsert_purchase(uuid, text, integer, date, timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- profiles.equipped: 칸마다 착용한 물건 코드. 예: {"stampInk": "ink-blue"}
-- 가지지 않은 물건이면 앱이 기본 물건으로 보여준다.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column equipped jsonb not null default '{}'::jsonb
  constraint profiles_equipped_object check (jsonb_typeof(equipped) = 'object');
