-- 방장을 넘길 때 "가장 먼저 들어온 사람"이 항상 하나로 정해지도록 실제 시각을 쓴다 (FR-077)
-- 같은 트랜잭션 안에서 들어오면 now()가 같아 순서가 정해지지 않는다
alter table public.group_members alter column joined_at set default clock_timestamp();
