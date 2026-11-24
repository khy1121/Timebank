-- 친구 알림 푸시 (그룹기획서 9절)
-- 앱이 기기의 Expo 푸시 토큰을 저장하고, 인증·투표·들어오기 뒤에 Edge Function push-notify를 부른다.
-- Edge Function은 claim_push로 받을 사람과 문구를 받아 Expo 푸시 서버로 보낸다.
-- 같은 일로 두 번 보내지 않도록 보낸 시각을 행에 남긴다.

-- ---------------------------------------------------------------------------
-- 토큰과 설정
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
-- 정책 없음: 아래 함수로만 저장하고 지운다

-- 친구 알림을 받을지 (설정에서 끈다)
alter table public.profiles add column push_friends boolean not null default true;

-- 같은 기기로 다른 계정에 로그인하면 토큰 주인이 바뀐다
create function public.save_push_token(p_token text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  if p_token !~ '^ExponentPushToken\[[^\]]+\]$' then
    raise exception '푸시 토큰 모양이 아니에요' using errcode = '22023';
  end if;
  insert into public.push_tokens (token, user_id) values (p_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end;
$$;

-- 로그아웃할 때 이 기기 토큰을 지운다
create function public.drop_push_token(p_token text)
returns void
language sql security definer set search_path = ''
as $$ delete from public.push_tokens where token = p_token and user_id = auth.uid() $$;

-- ---------------------------------------------------------------------------
-- 보낸 기록
-- ---------------------------------------------------------------------------

alter table public.proofs
  add column notified_at timestamptz,
  add column passed_notified_at timestamptz,
  add column doubt_notified_at timestamptz;
alter table public.group_members add column join_notified_at timestamptz;

-- ---------------------------------------------------------------------------
-- 받을 사람과 문구 (Edge Function만 부른다)
-- p_kind
--   proof: p_id = 인증. 부른 사람이 10분 안에 올린 인증이면 같은 그룹 사람들에게
--   vote:  p_id = 인증. 부른 사람이 투표했으면, 통과했거나 의심이 처음 달렸을 때 올린 사람에게
--   join:  p_id = 그룹. 부른 사람이 10분 안에 들어왔으면 같은 그룹 사람들에게
-- 친구 알림을 끈 사람, 보낸 사람을 차단한 사람은 빼고, 의심한 사람은 밝히지 않는다.
-- ---------------------------------------------------------------------------

create function public.claim_push(p_user uuid, p_kind text, p_id uuid)
returns table (token text, title text, body text, group_id uuid)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  p record;
  g record;
  a integer;
  d integer;
  my_vote text;
  msg text;
begin
  if p_kind = 'proof' then
    update public.proofs pr set notified_at = now()
     where pr.id = p_id and pr.user_id = p_user and pr.notified_at is null
       and pr.hidden_at is null and pr.created_at > now() - interval '10 minutes'
    returning pr.* into p;
    if not found then return; end if;
    select gr.name, m.nickname into g
      from public.groups gr join public.group_members m on m.group_id = gr.id and m.user_id = p_user
     where gr.id = p.group_id;
    return query
      select t.token, g.name, g.nickname || '님이 "' || p.todo_title || '" 인증을 올렸어요. 인정해 줄까요?', p.group_id
        from public.group_members m
        join public.profiles pf on pf.id = m.user_id and pf.push_friends
        join public.push_tokens t on t.user_id = m.user_id
       where m.group_id = p.group_id and m.user_id <> p_user
         and not exists (select 1 from public.blocks b where b.blocker_id = m.user_id and b.blocked_id = p_user);

  elsif p_kind = 'vote' then
    select pr.* into p from public.proofs pr where pr.id = p_id and pr.hidden_at is null;
    if not found then return; end if;
    select v.vote into my_vote from public.proof_votes v where v.proof_id = p_id and v.voter_id = p_user;
    if my_vote is null then return; end if;
    select count(*) filter (where v.vote = 'approve'), count(*) filter (where v.vote = 'doubt')
      into a, d from public.proof_votes v where v.proof_id = p_id;
    if public.proof_state(p.created_at, a, d) = 'passed' and p.passed_notified_at is null then
      update public.proofs set passed_notified_at = now() where id = p_id;
      msg := '"' || p.todo_title || '" 인증이 통과했어요.'
        || case when p.overdue_days = 0 then ' 보너스 냥을 받았어요.' else ' 그룹 순위에 들어가요.' end;
    elsif my_vote = 'doubt' and p.doubt_notified_at is null then
      update public.proofs set doubt_notified_at = now() where id = p_id;
      msg := '"' || p.todo_title || '" 인증에 의심이 달렸어요. 인정이 더 많아야 통과해요.';
    else
      return;
    end if;
    return query
      select t.token, gr.name, msg, p.group_id
        from public.push_tokens t
        join public.profiles pf on pf.id = t.user_id and pf.push_friends
        join public.groups gr on gr.id = p.group_id
       where t.user_id = p.user_id;

  elsif p_kind = 'join' then
    update public.group_members m set join_notified_at = now()
     where m.group_id = p_id and m.user_id = p_user and m.join_notified_at is null
       and m.joined_at > now() - interval '10 minutes'
    returning m.nickname into msg;
    if not found then return; end if;
    return query
      select t.token, gr.name, msg || '님이 그룹에 들어왔어요. 같이 해 봐요!', p_id
        from public.group_members m
        join public.groups gr on gr.id = m.group_id
        join public.profiles pf on pf.id = m.user_id and pf.push_friends
        join public.push_tokens t on t.user_id = m.user_id
       where m.group_id = p_id and m.user_id <> p_user
         and not exists (select 1 from public.blocks b where b.blocker_id = m.user_id and b.blocked_id = p_user);
  end if;
end;
$$;

-- Expo가 "없는 기기"라고 답한 토큰을 지운다
create function public.forget_push_tokens(p_tokens text[])
returns void
language sql security definer set search_path = ''
as $$ delete from public.push_tokens where token = any (p_tokens) $$;

revoke all on function public.save_push_token(text) from public, anon;
grant execute on function public.save_push_token(text) to authenticated;
revoke all on function public.drop_push_token(text) from public, anon;
grant execute on function public.drop_push_token(text) to authenticated;
revoke all on function public.claim_push(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_push(uuid, text, uuid) to service_role;
revoke all on function public.forget_push_tokens(text[]) from public, anon, authenticated;
grant execute on function public.forget_push_tokens(text[]) to service_role;
