-- 내가 이미 인증을 올린 (상환, 그룹) 쌍. 상환 내역에서 아직 안 올린 그룹에만 인증을 올리게 하려고 쓴다.
-- 인증은 상환 뒤 24시간 안에만 올릴 수 있으므로 최근 48시간 것만 돌려준다.
create function public.my_proof_targets()
returns table (repayment_id uuid, group_id uuid)
language sql stable security definer set search_path = ''
as $$
  select p.repayment_id, p.group_id
    from public.proofs p
   where p.user_id = auth.uid() and p.created_at > now() - interval '48 hours'
$$;

revoke all on function public.my_proof_targets() from public, anon;
grant execute on function public.my_proof_targets() to authenticated;
