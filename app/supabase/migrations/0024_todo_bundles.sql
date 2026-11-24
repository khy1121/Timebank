-- 할 일 묶음 (FR-111, 시장 지점 혜택). 자주 같이 하는 할 일을 묶어 두고 한 번에 넣는다.
-- [{ "id": "...", "name": "아침 루틴", "items": [{ "title": "물 마시기", "importance": 1 }] }] 최대 10개
alter table public.profiles add column todo_bundles jsonb not null default '[]'::jsonb
  check (jsonb_typeof(todo_bundles) = 'array' and jsonb_array_length(todo_bundles) <= 10);
