-- 자동 통과한 인증도 알리기 (그룹기획서 9절, #4)
-- 투표 없이 24시간이 지나 통과한 인증은 앱이 투표할 때 보내는 알림(push-notify)을 타지 않는다.
-- 15분마다 그런 인증을 찾아 올린 사람에게 "통과했어요"를 보낸다.
-- Expo 푸시 서버는 인증 키가 필요 없으므로, Edge Function을 거치지 않고 pg_net으로 바로 보낸다.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 보낼 것을 정하고 보낸 시각을 남긴다. 배포 전에 오래된 인증까지 한꺼번에 알리지 않도록 3일 안의 것만 본다.
create function public.claim_auto_passed(p_limit integer default 500)
returns table (token text, title text, body text, group_id uuid)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select p.id
      from public.proofs p
     where p.passed_notified_at is null and p.hidden_at is null
       and p.created_at <= now() - interval '24 hours'
       and p.created_at > now() - interval '3 days'
       and public.proof_state(p.created_at,
             (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'approve')::integer,
             (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'doubt')::integer) = 'passed'
     order by p.created_at
     limit p_limit
     for update skip locked
  ), marked as (
    update public.proofs p set passed_notified_at = now()
      from due where p.id = due.id
    returning p.user_id, p.group_id, p.todo_title, p.overdue_days
  )
  select t.token, gr.name,
         '"' || m.todo_title || '" 인증이 24시간 동안 의심 없이 통과했어요.'
           || case when m.overdue_days = 0 then ' 보너스 냥을 받았어요.' else ' 그룹 순위에 들어가요.' end,
         m.group_id
    from marked m
    join public.groups gr on gr.id = m.group_id
    join public.profiles pf on pf.id = m.user_id and pf.push_friends
    join public.push_tokens t on t.user_id = m.user_id;
end;
$$;

-- 100개씩 묶어 Expo 푸시 서버로 보낸다. 보낸 알림 수를 돌려준다.
create function public.send_auto_passed_push()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  batch jsonb;
  total integer := 0;
begin
  create temp table if not exists pending_push (token text, title text, body text, group_id uuid) on commit drop;
  insert into pending_push select * from public.claim_auto_passed();
  for batch in
    select jsonb_agg(jsonb_build_object(
             'to', token, 'title', title, 'body', body,
             'data', jsonb_build_object('groupId', group_id),
             'sound', 'default', 'channelId', 'friends'))
      from (select *, (row_number() over () - 1) / 100 as chunk from pending_push) s
     group by chunk
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := batch,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
    total := total + jsonb_array_length(batch);
  end loop;
  return total;
end;
$$;

revoke all on function public.claim_auto_passed(integer) from public, anon, authenticated;
revoke all on function public.send_auto_passed_push() from public, anon, authenticated;

select cron.schedule('auto-passed-push', '*/15 * * * *', 'select public.send_auto_passed_push()');
