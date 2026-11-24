// 친구 알림 보내기. 앱이 인증을 올리거나(proof), 투표하거나(vote), 그룹에 들어온(join) 뒤에 부른다.
// 받을 사람과 문구는 claim_push가 정하고, 같은 일로 두 번 보내지 않는다 (migrations/0011_push.sql)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const KINDS = new Set(['proof', 'vote', 'join']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Claim = { token: string; title: string; body: string; group_id: string };
type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'unauthorized' }, 401);

  const input = await req.json().catch(() => null);
  if (!input || !KINDS.has(input.kind) || typeof input.id !== 'string' || !UUID.test(input.id)) {
    return json({ error: 'bad request' }, 400);
  }

  const { data, error } = await admin.rpc('claim_push', { p_user: auth.user.id, p_kind: input.kind, p_id: input.id });
  if (error) return json({ error: error.message }, 500);
  const claims = (data ?? []) as Claim[];
  if (claims.length === 0) return json({ sent: 0 });

  // Expo 푸시 서버는 한 번에 100개까지 받는다
  const gone: string[] = [];
  let sent = 0;
  for (let i = 0; i < claims.length; i += 100) {
    const batch = claims.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(
        batch.map((c) => ({
          to: c.token,
          title: c.title,
          body: c.body,
          data: { groupId: c.group_id },
          sound: 'default',
          channelId: 'friends',
        })),
      ),
    });
    if (!res.ok) {
      console.error('Expo 푸시 서버 오류', res.status, await res.text());
      continue;
    }
    const tickets = ((await res.json()).data ?? []) as Ticket[];
    tickets.forEach((t, j) => {
      if (t.status === 'ok') sent += 1;
      else if (t.details?.error === 'DeviceNotRegistered') gone.push(batch[j].token);
    });
  }
  // 앱을 지웠거나 알림을 끈 기기의 토큰은 지운다
  if (gone.length > 0) await admin.rpc('forget_push_tokens', { p_tokens: gone });
  return json({ sent, removed: gone.length });
});
