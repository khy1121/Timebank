-- 친구 그룹 인증 (FR-075~083, 그룹기획서 TI-GRP-001)
--
-- 원칙
-- - 그룹 안의 정보(별명, 인증 사진, 메모)는 같은 그룹 사람만 본다.
-- - 인증 상태(대기·통과·불인정)는 저장하지 않고 투표와 올린 시각에서 계산한다. 앱(domain/groups.ts)과 같은 규칙이다.
-- - 다른 사람의 행을 모아야 하는 일(피드, 그룹 순위, 들어가기 제한)은 관리자 권한 함수가 하고,
--   그룹원에게 필요한 칸만 돌려준다. 할 일 제목은 인증으로 올린 것만 보인다.

-- ---------------------------------------------------------------------------
-- 프로필: 인증 이용 수칙 동의, 그룹원에게 보여줄 이번 주 상태
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column proof_rules_at timestamptz,
  add column status_code text check (status_code is null or char_length(status_code) <= 20),
  add column status_on date;

comment on column public.profiles.proof_rules_at is '인증 이용 수칙에 동의한 시각 (FR-083)';
comment on column public.profiles.status_code is '앱이 계산한 이번 주 상태 코드. 그룹원 목록과 그룹 순위에 보인다 (FR-081)';

-- ---------------------------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 20),
  owner_id uuid references public.profiles (id) on delete set null,
  invite_code text not null unique check (invite_code ~ '^[A-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 10),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.proofs (
  id uuid primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  repayment_id uuid not null references public.repayments (id) on delete cascade,
  -- 아래 세 칸은 서버가 상환 기록에서 채운다 (앱이 보낸 값은 쓰지 않는다)
  todo_title text not null default '',
  principal integer not null default 0,
  overdue_days integer not null default 0,
  caption text not null default '' check (char_length(caption) <= 40),
  photo_path text not null,
  created_at timestamptz not null default now(),
  hidden_at timestamptz,
  unique (group_id, repayment_id)
);
create index proofs_group_created_idx on public.proofs (group_id, created_at desc);
create index proofs_user_idx on public.proofs (user_id);
create index proofs_repayment_idx on public.proofs (repayment_id);

create table public.proof_votes (
  proof_id uuid not null references public.proofs (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  vote text not null check (vote in ('approve', 'doubt')),
  updated_at timestamptz not null default now(),
  primary key (proof_id, voter_id)
);
create index proof_votes_voter_idx on public.proof_votes (voter_id);

create table public.proof_reports (
  proof_id uuid not null references public.proofs (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('photo', 'harassment', 'etc')),
  created_at timestamptz not null default now(),
  primary key (proof_id, reporter_id)
);
create index proof_reports_reporter_idx on public.proof_reports (reporter_id);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- 공통 함수
-- ---------------------------------------------------------------------------

-- 내가 든 그룹. 행 단위 보안 정책 안에서 group_members를 다시 읽으면 무한히 돌기 때문에 권한 함수로 뺀다.
create function public.my_group_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$ select group_id from public.group_members where user_id = auth.uid() $$;

-- 사진 저장소 경로의 첫 칸(그룹 ID 글자)으로 확인한다
create function public.is_group_member(p_group text)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.group_members where group_id::text = p_group and user_id = auth.uid()) $$;

create function public.is_group_owner(p_group text)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.groups where id::text = p_group and owner_id = auth.uid()) $$;

-- 인증 상태 (FR-079). domain/groups.ts proofState와 같은 규칙
-- 인정 1개 이상이고 의심보다 많으면 통과 / 24시간 안이면 대기 / 지난 뒤 의심이 없으면 통과, 있으면 불인정
create function public.proof_state(p_created timestamptz, p_approve integer, p_doubt integer)
returns text
language sql stable set search_path = ''
as $$
  select case
    when p_approve >= 1 and p_approve > p_doubt then 'passed'
    when now() < p_created + interval '24 hours' then 'pending'
    when p_doubt = 0 then 'passed'
    else 'rejected'
  end
$$;

-- 6자리 초대 코드. 헷갈리는 0·O·1·I·L은 쓰지 않는다
create function public.new_invite_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- 행 단위 보안. 읽기는 대부분 아래 함수로 하고, 표에 직접 하는 것은 최소로 둔다.
-- ---------------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.proofs enable row level security;
alter table public.proof_votes enable row level security;
alter table public.proof_reports enable row level security;
alter table public.blocks enable row level security;

create policy "groups: 그룹원만 조회" on public.groups
  for select to authenticated using (id in (select public.my_group_ids()));

create policy "group_members: 같은 그룹만 조회" on public.group_members
  for select to authenticated using (group_id in (select public.my_group_ids()));

create policy "proofs: 같은 그룹만 조회" on public.proofs
  for select to authenticated using (group_id in (select public.my_group_ids()));

-- 인증 올리기: 본인 이름으로, 내가 든 그룹에만. 상환 기록 확인은 아래 트리거가 한다.
create policy "proofs: 그룹원이 본인 것만 추가" on public.proofs
  for insert to authenticated
  with check ((select auth.uid()) = user_id and group_id in (select public.my_group_ids()));

-- 내 인증은 내가, 그룹 인증은 방장이 지운다 (FR-082)
create policy "proofs: 본인이나 방장이 삭제" on public.proofs
  for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_group_owner(group_id::text));

create policy "blocks: 본인 것만 조회" on public.blocks
  for select to authenticated using ((select auth.uid()) = blocker_id);
create policy "blocks: 본인 것만 추가" on public.blocks
  for insert to authenticated with check ((select auth.uid()) = blocker_id);
create policy "blocks: 본인 것만 삭제" on public.blocks
  for delete to authenticated using ((select auth.uid()) = blocker_id);

-- proof_votes, proof_reports는 표에 직접 접근하지 않는다 (vote_proof, report_proof 함수로만)

-- ---------------------------------------------------------------------------
-- 트리거
-- ---------------------------------------------------------------------------

-- 인증을 올릴 때: 내 상환 기록인지, 상환한 지 24시간 안인지 확인하고 제목·원금을 서버가 채운다 (FR-078)
create function public.fill_proof()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
begin
  select title, principal, overdue_days, created_at into r
    from public.repayments
   where id = new.repayment_id and user_id = new.user_id and kind = 'repaid' and deleted_at is null;
  if not found then
    raise exception '상환 기록을 찾을 수 없어요' using errcode = 'P0002';
  end if;
  if r.created_at < now() - interval '24 hours' then
    raise exception '상환한 지 24시간이 지나 인증을 올릴 수 없어요' using errcode = '22023';
  end if;
  if new.photo_path <> new.group_id::text || '/' || new.user_id::text || '/' || new.id::text || '.jpg' then
    raise exception '사진 경로가 맞지 않아요' using errcode = '22023';
  end if;
  new.todo_title := r.title;
  new.principal := r.principal;
  new.overdue_days := r.overdue_days;
  new.created_at := now();
  new.hidden_at := null;
  return new;
end;
$$;

create trigger proofs_fill before insert on public.proofs
  for each row execute function public.fill_proof();

-- 상환을 되돌리면(기록이 지워지면) 그 인증도 지운다
create function public.drop_proofs_of_undone_repayment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    delete from public.proofs where repayment_id = new.id;
  end if;
  return new;
end;
$$;

create trigger repayments_drop_proofs after update on public.repayments
  for each row execute function public.drop_proofs_of_undone_repayment();

-- 그룹원이 나가면(나가기, 내보내기, 계정 삭제) 그 사람의 인증과 그 그룹에서 한 투표를 지우고,
-- 방장이었으면 가장 먼저 들어온 사람에게 넘기고, 아무도 없으면 그룹을 지운다 (FR-076, FR-077)
create function public.after_member_left()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  next_owner uuid;
begin
  delete from public.proofs where group_id = old.group_id and user_id = old.user_id;
  delete from public.proof_votes v using public.proofs p
   where v.proof_id = p.id and p.group_id = old.group_id and v.voter_id = old.user_id;
  select user_id into next_owner from public.group_members
   where group_id = old.group_id order by joined_at, user_id limit 1;
  if next_owner is null then
    delete from public.groups where id = old.group_id;
  else
    update public.groups set owner_id = next_owner
     where id = old.group_id and (owner_id is null or owner_id = old.user_id);
  end if;
  return old;
end;
$$;

create trigger group_members_left after delete on public.group_members
  for each row execute function public.after_member_left();

-- ---------------------------------------------------------------------------
-- 그룹 만들기·들어가기·나가기·관리 (FR-075~077)
-- ---------------------------------------------------------------------------
create function public.create_group(p_name text, p_nickname text)
returns table (id uuid, invite_code text)
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
  code text;
begin
  if uid is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  if (select count(*) from public.group_members where user_id = uid) >= 3 then
    raise exception '그룹은 3개까지 들 수 있어요' using errcode = 'P0001', hint = 'too_many_groups';
  end if;
  code := public.new_invite_code();
  insert into public.groups (name, owner_id, invite_code) values (btrim(p_name), uid, code) returning groups.id into gid;
  insert into public.group_members (group_id, user_id, nickname) values (gid, uid, btrim(p_nickname));
  return query select gid, code;
end;
$$;

-- 들어가기 전에 이름과 인원을 확인한다. 코드를 아는 사람만 볼 수 있다.
create function public.group_preview(p_code text)
returns table (id uuid, name text, members integer, owner_nickname text, is_member boolean)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.name,
         (select count(*) from public.group_members m where m.group_id = g.id)::integer,
         (select m.nickname from public.group_members m where m.group_id = g.id and m.user_id = g.owner_id),
         exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = auth.uid())
    from public.groups g
   where g.invite_code = upper(btrim(p_code)) and auth.uid() is not null
$$;

create function public.join_group(p_code text, p_nickname text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
begin
  if uid is null then raise exception '로그인이 필요해요' using errcode = '28000'; end if;
  -- 동시에 여러 명이 들어와도 10명을 넘지 않게 그룹 행을 잠근다
  select g.id into gid from public.groups g where g.invite_code = upper(btrim(p_code)) for update;
  if gid is null then
    raise exception '초대 코드를 찾을 수 없어요' using errcode = 'P0001', hint = 'not_found';
  end if;
  if exists (select 1 from public.group_members where group_id = gid and user_id = uid) then
    return gid;
  end if;
  if (select count(*) from public.group_members where group_id = gid) >= 10 then
    raise exception '그룹이 꽉 찼어요' using errcode = 'P0001', hint = 'group_full';
  end if;
  if (select count(*) from public.group_members where user_id = uid) >= 3 then
    raise exception '그룹은 3개까지 들 수 있어요' using errcode = 'P0001', hint = 'too_many_groups';
  end if;
  insert into public.group_members (group_id, user_id, nickname) values (gid, uid, btrim(p_nickname));
  return gid;
end;
$$;

create function public.leave_group(p_group_id uuid)
returns void
language sql security definer set search_path = ''
as $$ delete from public.group_members where group_id = p_group_id and user_id = auth.uid() $$;

create function public.kick_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.groups where id = p_group_id and owner_id = auth.uid()) then
    raise exception '방장만 내보낼 수 있어요' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception '자기 자신은 내보낼 수 없어요' using errcode = '22023';
  end if;
  delete from public.group_members where group_id = p_group_id and user_id = p_user_id;
end;
$$;

create function public.rotate_invite_code(p_group_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  code text;
begin
  if not exists (select 1 from public.groups where id = p_group_id and owner_id = auth.uid()) then
    raise exception '방장만 초대 코드를 바꿀 수 있어요' using errcode = '42501';
  end if;
  code := public.new_invite_code();
  update public.groups set invite_code = code where id = p_group_id;
  return code;
end;
$$;

-- 그룹 화면을 열면 부른다. 그룹 목록의 "새 인증" 수가 0이 된다.
create function public.mark_group_seen(p_group_id uuid)
returns void
language sql security definer set search_path = ''
as $$ update public.group_members set last_seen_at = now() where group_id = p_group_id and user_id = auth.uid() $$;

-- ---------------------------------------------------------------------------
-- 조회
-- ---------------------------------------------------------------------------

-- 내 그룹 목록 (TI-SCR-14)
create function public.my_groups()
returns table (id uuid, name text, invite_code text, is_owner boolean, members integer, new_proofs integer, joined_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.name, g.invite_code, g.owner_id = me.user_id,
         (select count(*) from public.group_members m where m.group_id = g.id)::integer,
         (select count(*) from public.proofs p
           where p.group_id = g.id and p.user_id <> me.user_id and p.hidden_at is null
             and p.created_at > me.last_seen_at
             and not exists (select 1 from public.blocks b where b.blocker_id = me.user_id and b.blocked_id = p.user_id))::integer,
         me.joined_at
    from public.group_members me
    join public.groups g on g.id = me.group_id
   where me.user_id = auth.uid()
   order by me.joined_at
$$;

-- 그룹원 (TI-SCR-16 그룹원 탭). 상태는 최근 7일 안에 앱이 올린 것만 보인다.
create function public.group_members_of(p_group_id uuid)
returns table (user_id uuid, nickname text, is_owner boolean, is_me boolean, joined_at timestamptz, status_code text, blocked boolean)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, m.nickname, g.owner_id = m.user_id, m.user_id = auth.uid(), m.joined_at,
         case when pr.status_on >= (now() at time zone 'Asia/Seoul')::date - 6 then pr.status_code end,
         exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = m.user_id)
    from public.group_members m
    join public.groups g on g.id = m.group_id
    join public.profiles pr on pr.id = m.user_id
   where m.group_id = p_group_id
     and exists (select 1 from public.group_members x where x.group_id = p_group_id and x.user_id = auth.uid())
   order by m.joined_at
$$;

-- 피드 (TI-SCR-16). 최신순, p_before보다 오래된 것을 p_limit개.
-- 숨겨진 인증은 올린 사람에게만 보이고, 내가 차단한 사람의 인증은 보이지 않는다.
create function public.group_feed(p_group_id uuid, p_before timestamptz default null, p_limit integer default 30)
returns table (
  id uuid, user_id uuid, nickname text, is_mine boolean, todo_title text, caption text, photo_path text,
  created_at timestamptz, approvals integer, doubts integer, my_vote text, state text, hidden boolean, on_time boolean, principal integer
)
language sql stable security definer set search_path = ''
as $$
  with counted as (
    select p.*,
           (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'approve')::integer as a,
           (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'doubt')::integer as d
      from public.proofs p
     where p.group_id = p_group_id
       and (p_before is null or p.created_at < p_before)
       and (p.hidden_at is null or p.user_id = auth.uid())
       and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.user_id)
       and exists (select 1 from public.group_members x where x.group_id = p_group_id and x.user_id = auth.uid())
  )
  select c.id, c.user_id, coalesce(m.nickname, '나간 사람'), c.user_id = auth.uid(), c.todo_title, c.caption, c.photo_path,
         c.created_at, c.a, c.d,
         (select v.vote from public.proof_votes v where v.proof_id = c.id and v.voter_id = auth.uid()),
         public.proof_state(c.created_at, c.a, c.d), c.hidden_at is not null, c.overdue_days = 0, c.principal
    from counted c
    left join public.group_members m on m.group_id = c.group_id and m.user_id = c.user_id
   order by c.created_at desc
   limit least(greatest(p_limit, 1), 50)
$$;

-- 이번 주 그룹 순위 (FR-081). 최근 7일, 한국 날짜 기준.
-- 점수 = 통과한 인증 상환의 보상(기한 안 상환만, 원금의 10% + 보너스 50%)
--       − 최근 7일 연체 상환·탕감으로 낸 이자(인증과 상관없이)
--       − 지금 연체 중인 할 일에 붙어 있는 이자
create function public.group_standing(p_group_id uuid)
returns table (user_id uuid, nickname text, is_me boolean, status_code text, score integer, passed integer, rank integer)
language sql stable security definer set search_path = ''
as $$
  with today as (select (now() at time zone 'Asia/Seoul')::date as d),
  mem as (
    select m.user_id, m.nickname from public.group_members m
     where m.group_id = p_group_id
       and exists (select 1 from public.group_members x where x.group_id = p_group_id and x.user_id = auth.uid())
  ),
  passed as (
    select p.user_id, r.principal, r.overdue_days
      from public.proofs p
      join public.repayments r on r.id = p.repayment_id and r.deleted_at is null
     cross join today
     where p.group_id = p_group_id and p.hidden_at is null
       and r.settled_on > today.d - 7 and r.settled_on <= today.d
       and public.proof_state(p.created_at,
             (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'approve')::integer,
             (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'doubt')::integer) = 'passed'
  ),
  scored as (
    select mem.user_id, mem.nickname,
           (select count(*) from passed ps where ps.user_id = mem.user_id)::integer as passed_n,
           (coalesce((select sum((ps.principal / 10) + (ps.principal / 10) / 2) from passed ps where ps.user_id = mem.user_id and ps.overdue_days = 0), 0)
            - coalesce((select sum(r.interest) from public.repayments r cross join today
                         where r.user_id = mem.user_id and r.deleted_at is null and r.interest > 0
                           and r.settled_on > today.d - 7 and r.settled_on <= today.d), 0)
            - coalesce((select sum(least(floor(t.principal * power(1.1::numeric, today.d - t.due_date)), t.principal * 10) - t.principal)
                          from public.todos t cross join today
                         where t.user_id = mem.user_id and t.status = 'open' and t.deleted_at is null and t.due_date < today.d), 0)
           )::integer as score
      from mem
  )
  select s.user_id, s.nickname, s.user_id = auth.uid(),
         case when pr.status_on >= (select d from today) - 6 then pr.status_code end,
         s.score, s.passed_n, (rank() over (order by s.score desc))::integer
    from scored s
    join public.profiles pr on pr.id = s.user_id
   order by s.score desc, s.nickname
$$;

-- 냥 보너스를 받을 내 상환 (FR-080). 어느 그룹에서든 통과한 인증이 있는 상환.
create function public.my_verified_repayments()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select distinct p.repayment_id
    from public.proofs p
   where p.user_id = auth.uid() and p.hidden_at is null
     and public.proof_state(p.created_at,
           (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'approve')::integer,
           (select count(*) from public.proof_votes v where v.proof_id = p.id and v.vote = 'doubt')::integer) = 'passed'
$$;

-- ---------------------------------------------------------------------------
-- 투표·신고 (FR-079, FR-082)
-- ---------------------------------------------------------------------------

-- p_vote가 null이면 투표를 거둔다. 올린 지 24시간이 지나면 바꿀 수 없다.
create function public.vote_proof(p_proof_id uuid, p_vote text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p record;
begin
  select pr.user_id, pr.group_id, pr.created_at, pr.hidden_at into p from public.proofs pr where pr.id = p_proof_id;
  if not found or not exists (select 1 from public.group_members where group_id = p.group_id and user_id = uid) then
    raise exception '인증을 찾을 수 없어요' using errcode = 'P0002';
  end if;
  if p.user_id = uid then
    raise exception '내 인증에는 투표할 수 없어요' using errcode = '22023', hint = 'own_proof';
  end if;
  if p.created_at < now() - interval '24 hours' then
    raise exception '24시간이 지나 투표할 수 없어요' using errcode = '22023', hint = 'closed';
  end if;
  if exists (select 1 from public.blocks where blocker_id = p.user_id and blocked_id = uid) then
    raise exception '투표할 수 없어요' using errcode = '42501', hint = 'blocked';
  end if;
  if p_vote is null then
    delete from public.proof_votes where proof_id = p_proof_id and voter_id = uid;
  elsif p_vote in ('approve', 'doubt') then
    insert into public.proof_votes (proof_id, voter_id, vote) values (p_proof_id, uid, p_vote)
    on conflict (proof_id, voter_id) do update set vote = excluded.vote, updated_at = now();
  else
    raise exception '알 수 없는 투표예요' using errcode = '22023';
  end if;
end;
$$;

-- 서로 다른 2명이 신고하면 숨긴다. 신고 내용은 운영자가 대시보드에서 본다.
create function public.report_proof(p_proof_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p record;
begin
  select pr.user_id, pr.group_id into p from public.proofs pr where pr.id = p_proof_id;
  if not found or not exists (select 1 from public.group_members where group_id = p.group_id and user_id = uid) then
    raise exception '인증을 찾을 수 없어요' using errcode = 'P0002';
  end if;
  if p.user_id = uid then
    raise exception '내 인증은 신고할 수 없어요' using errcode = '22023';
  end if;
  insert into public.proof_reports (proof_id, reporter_id, reason) values (p_proof_id, uid, p_reason)
  on conflict do nothing;
  if (select count(*) from public.proof_reports where proof_id = p_proof_id) >= 2 then
    update public.proofs set hidden_at = coalesce(hidden_at, now()) where id = p_proof_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 권한: 로그인한 사용자만 부른다. 내부용 함수는 막는다.
-- ---------------------------------------------------------------------------
revoke all on function public.fill_proof() from public, anon, authenticated;
revoke all on function public.drop_proofs_of_undone_repayment() from public, anon, authenticated;
revoke all on function public.after_member_left() from public, anon, authenticated;
revoke all on function public.new_invite_code() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'my_group_ids()', 'is_group_member(text)', 'is_group_owner(text)', 'proof_state(timestamptz, integer, integer)',
    'create_group(text, text)', 'group_preview(text)', 'join_group(text, text)', 'leave_group(uuid)',
    'kick_member(uuid, uuid)', 'rotate_invite_code(uuid)', 'mark_group_seen(uuid)', 'my_groups()',
    'group_members_of(uuid)', 'group_feed(uuid, timestamptz, integer)', 'group_standing(uuid)',
    'my_verified_repayments()', 'vote_proof(uuid, text)', 'report_proof(uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 사진 저장소: 비공개 버킷 proofs. 경로 = {group_id}/{user_id}/{proof_id}.jpg
-- 그룹원만 읽고(앱은 1시간짜리 임시 주소로 받는다), 본인 폴더에만 올리고, 본인이나 방장이 지운다.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

create policy "proofs 사진: 그룹원만 조회" on storage.objects
  for select to authenticated
  using (bucket_id = 'proofs' and public.is_group_member((storage.foldername(name))[1]));

create policy "proofs 사진: 본인 폴더에만 올림" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'proofs'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.is_group_member((storage.foldername(name))[1])
  );

create policy "proofs 사진: 본인이나 방장이 삭제" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'proofs'
    and ((storage.foldername(name))[2] = (select auth.uid())::text or public.is_group_owner((storage.foldername(name))[1]))
  );
