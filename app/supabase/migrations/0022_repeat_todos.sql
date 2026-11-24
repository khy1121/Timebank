-- 반복 할 일 (FR-111, 시장 지점 혜택, 상점기획서 11.2절)
-- 반복하는 할 일을 끝내면 앱이 다음 할 일을 새로 만든다. 새 할 일은 repeat_from에 앞 할 일을 적어 둔다(끝내기를 되돌리면 같이 지운다).

alter table public.todos add column repeat text check (repeat in ('daily', 'weekly'));
alter table public.todos add column repeat_from uuid;

drop function public.upsert_todo(uuid, text, smallint, date, text, timestamptz, timestamptz, timestamptz, uuid);
create function public.upsert_todo(
  p_id uuid, p_title text, p_importance smallint, p_due_date date, p_status text, p_updated_at timestamptz,
  p_deleted_at timestamptz default null, p_created_at timestamptz default null, p_stake_group_id uuid default null,
  p_repeat text default null, p_repeat_from uuid default null)
returns void
language plpgsql set search_path = ''
as $$
begin
  if p_stake_group_id is not null and not public.is_group_member(p_stake_group_id::text) then
    raise exception '그룹에 들어가 있지 않아요' using errcode = '42501';
  end if;
  insert into public.todos (id, title, importance, due_date, status, updated_at, deleted_at, created_at, stake_group_id, repeat, repeat_from)
  values (p_id, p_title, p_importance, p_due_date, p_status, p_updated_at, p_deleted_at, coalesce(p_created_at, now()), p_stake_group_id, p_repeat, p_repeat_from)
  on conflict (id) do update
    set title = excluded.title,
        importance = excluded.importance,
        due_date = excluded.due_date,
        status = excluded.status,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        stake_group_id = excluded.stake_group_id,
        repeat = excluded.repeat,
        repeat_from = excluded.repeat_from
    where excluded.updated_at > public.todos.updated_at;
end;
$$;
revoke all on function public.upsert_todo(uuid, text, smallint, date, text, timestamptz, timestamptz, timestamptz, uuid, text, uuid) from public, anon;
grant execute on function public.upsert_todo(uuid, text, smallint, date, text, timestamptz, timestamptz, timestamptz, uuid, text, uuid) to authenticated;
