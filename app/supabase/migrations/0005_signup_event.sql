-- 가입 기록 (FR-053)
-- 가입은 앱이 아니라 서버에서 남긴다. 앱이 기록을 올리기 전에 꺼져도 가입 수가 빠지지 않게 하려는 것이다.

create or replace function public.log_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.events (user_id, event, props) values (new.id, 'signup', '{}'::jsonb);
  return new;
end;
$$;

revoke execute on function public.log_signup() from public, anon, authenticated;

create trigger on_profile_created_log_signup
  after insert on public.profiles
  for each row execute function public.log_signup();

-- 이미 가입한 사람의 가입 기록을 프로필 생성 시각으로 채운다
insert into public.events (user_id, event, props, ts)
select p.id, 'signup', '{}'::jsonb, p.created_at
  from public.profiles p
 where not exists (select 1 from public.events e where e.user_id = p.id and e.event = 'signup');
