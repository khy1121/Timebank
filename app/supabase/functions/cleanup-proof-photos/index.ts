// 주인 없는 인증 사진 지우기. 앱이 켜질 때, 그룹을 나가거나 누군가를 내보낸 뒤에 부른다.
// 부른 사람이 올린 사진과 그 사람이 속한 그룹의 사진 중 인증 행이 없는 것만 지운다 (migrations/0009_orphan_proof_photos.sql)
import { createClient } from 'npm:@supabase/supabase-js@2';

// 웹에서 부를 때 브라우저가 먼저 묻는 요청(OPTIONS)에 답한다
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'unauthorized' }, 401);

  const { data: names, error } = await admin.rpc('orphan_proof_photos', { p_user: auth.user.id });
  if (error) return json({ error: error.message }, 500);
  const list = (names ?? []) as string[];
  if (list.length > 0) {
    const { error: removeError } = await admin.storage.from('proofs').remove(list);
    if (removeError) return json({ error: removeError.message }, 500);
  }
  return json({ removed: list.length });
});
