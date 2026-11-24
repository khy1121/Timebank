-- 신용 점수 확정이 동시에 돌면 같은 날을 두 번 넣어 중복 키 오류가 났다.
-- 사용자마다 잠금을 걸어 한 번에 하나만 계산하고, 같은 날이 있으면 덮어쓴다.
create or replace function public.settle_credit_user(p_user uuid, p_until date)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  start_day date;
  last_day date;
  prev integer;
  d date;
  r record;
begin
  perform pg_advisory_xact_lock(hashtextextended('credit:' || p_user::text, 0));
  select credit_start into start_day from public.profiles where id = p_user;
  if start_day is null then return null; end if;
  select max(day) into last_day from public.credit_daily where user_id = p_user;
  if last_day is not null then start_day := greatest(start_day, last_day - 2); end if;
  if start_day > p_until then
    return (select credit_score from public.profiles where id = p_user);
  end if;
  delete from public.credit_daily where user_id = p_user and day >= start_day;
  select score into prev from public.credit_daily where user_id = p_user and day = start_day - 1;
  prev := coalesce(prev, 600);
  d := start_day;
  while d <= p_until loop
    select * into r from public.credit_day(p_user, d, prev);
    insert into public.credit_daily (user_id, day, score, delta, gained, lost, parts)
    values (p_user, d, r.score, r.score - prev, r.gained, r.lost, r.parts)
    on conflict (user_id, day) do update
      set score = excluded.score, delta = excluded.delta, gained = excluded.gained, lost = excluded.lost, parts = excluded.parts, computed_at = now();
    prev := r.score;
    d := d + 1;
  end loop;
  update public.profiles set credit_score = prev where id = p_user;
  return prev;
end;
$$;
