-- 주인 없는 인증 사진 찾기 (그룹기획서 8절)
-- 상환 되돌리기, 그룹 나가기, 내보내기, 그룹 삭제 때 인증 행은 트리거로 지워지지만 사진 파일은 남는다.
-- SQL로는 저장소 파일을 지울 수 없으므로(storage.protect_delete) 이름만 찾아 주고, 삭제는 Edge Function cleanup-proof-photos가 한다.
-- 범위: 이 사람이 올린 사진, 또는 이 사람이 속한 그룹의 사진. 올리는 중인 사진을 지우지 않도록 10분 지난 것만.
create function public.orphan_proof_photos(p_user uuid, p_limit integer default 100)
returns setof text
language sql stable security definer set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'proofs'
     and o.created_at < now() - interval '10 minutes'
     and ((storage.foldername(o.name))[2] = p_user::text
          or (storage.foldername(o.name))[1] in (select m.group_id::text from public.group_members m where m.user_id = p_user))
     and not exists (select 1 from public.proofs p where p.photo_path = o.name)
   limit p_limit
$$;

-- 서버(Edge Function)만 부른다
revoke all on function public.orphan_proof_photos(uuid, integer) from public, anon, authenticated;
grant execute on function public.orphan_proof_photos(uuid, integer) to service_role;
