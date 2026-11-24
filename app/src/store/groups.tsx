import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  base64ToBytes,
  groupErrorMessage,
  groupFromRow,
  MAX_MEMBERS,
  toTheme,
  groupStandingFromRow,
  memberFromRow,
  photoPath,
  PHOTO_URL_TTL,
  proofFromRow,
  type FeedRow,
  type GroupPreviewRow,
  type GroupTheme,
  type GroupStanding,
  type GroupStandingRow,
  type Member,
  type MemberRow,
  type MyGroup,
  type MyGroupRow,
  type Proof,
  type ReportReason,
  type Vote,
} from '@/domain/groups';
import { track } from '@/lib/events';
import { sendPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';

/**
 * 친구 그룹 인증. (FR-075~083)
 * 그룹 목록과 "인증이 통과한 내 상환"은 여기서 들고 있고, 피드·순위·그룹원은 화면이 그때그때 받는다.
 * 기기에 사본을 두지 않는다. 그룹은 다른 사람과 함께 쓰는 것이라 늘 서버 값을 본다.
 */

export type Result<T = void> = { ok: true; value: T } | { ok: false; message: string };

export type GroupPreview = { id: string; name: string; members: number; ownerNickname: string | null; isMember: boolean; theme: GroupTheme; themeLabel: string | null; maxMembers: number };

export type PostProofInput = {
  repaymentId: string;
  groupIds: string[];
  caption: string;
  /** 줄여서 저장한 JPEG의 base64 */
  photoBase64: string;
  /** 상환 기록이 아직 서버에 없을 때 올리기를 재촉한다 */
  flush: () => Promise<void>;
};

type Store = {
  groups: MyGroup[];
  loaded: boolean;
  /** 친구 인증이 통과한 내 상환 ID. 냥 보너스에 쓴다 (FR-080) */
  verified: ReadonlySet<string>;
  /** 최근 내가 인증을 올린 그룹. 상환 ID → 그룹 ID들. 상환 내역에서 남은 그룹에만 올리게 한다 */
  posted: ReadonlyMap<string, ReadonlySet<string>>;
  /** 인증 이용 수칙에 동의했는가 (FR-083) */
  rulesAgreed: boolean;
  refresh: () => Promise<void>;
  create: (name: string, nickname: string, theme?: GroupTheme, themeLabel?: string | null) => Promise<Result<{ id: string; code: string }>>;
  /** 방장이 그룹 테마를 바꾼다 */
  setTheme: (groupId: string, theme: GroupTheme, themeLabel: string | null) => Promise<Result>;
  preview: (code: string) => Promise<Result<GroupPreview | null>>;
  join: (code: string, nickname: string) => Promise<Result<string>>;
  leave: (groupId: string) => Promise<Result>;
  kick: (groupId: string, userId: string) => Promise<Result>;
  rotateCode: (groupId: string) => Promise<Result<string>>;
  markSeen: (groupId: string) => void;
  feed: (groupId: string, before?: string) => Promise<Result<Proof[]>>;
  standing: (groupId: string) => Promise<Result<GroupStanding[]>>;
  /** 이번 주 금고: 지난주에서 넘어온 냥 + 이번 주 몰수된 보증금 (시간적금기획서 4.7) */
  pot: (groupId: string) => Promise<number>;
  members: (groupId: string) => Promise<Result<Member[]>>;
  photoUrls: (paths: string[]) => Promise<Record<string, string>>;
  vote: (proofId: string, vote: Vote | null) => Promise<Result>;
  report: (proofId: string, reason: ReportReason) => Promise<Result>;
  removeProof: (proof: Proof) => Promise<Result>;
  block: (userId: string) => Promise<Result>;
  unblock: (userId: string) => Promise<Result>;
  agreeRules: () => Promise<Result>;
  postProof: (input: PostProofInput) => Promise<Result<number>>;
};

const GroupsContext = createContext<Store | null>(null);

/** 빈 목록을 매번 새로 만들면 잔고 계산이 매번 다시 돈다 */
const NO_IDS: ReadonlySet<string> = new Set();
const NO_POSTED: ReadonlyMap<string, ReadonlySet<string>> = new Map();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fail = (message: string): Result<never> => ({ ok: false, message });

/**
 * 주인 없는 인증 사진 파일을 서버에서 지우게 한다. 결과를 기다리지 않는다.
 * 앱이 켜질 때는 10분에 한 번만 부르고, 나가기·내보내기 뒤에는 바로 부른다.
 */
let lastSweep = 0;
function sweepPhotos(force = false) {
  const now = Date.now();
  if (!force && now - lastSweep < 10 * 60 * 1000) return;
  lastSweep = now;
  supabase.functions.invoke('cleanup-proof-photos').then(({ error }) => {
    if (error) console.warn('남은 사진을 정리하지 못했어요', error.message);
  });
}

export function GroupsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  // 계정 ID와 함께 저장해 다른 계정 것이 섞이지 않게 한다
  const [data, setData] = useState<{ userId: string; groups: MyGroup[]; verified: Set<string>; posted: Map<string, Set<string>>; rulesAgreed: boolean } | null>(null);

  // 상태는 응답을 받은 뒤 콜백에서만 바꾼다
  const refresh = useCallback((): Promise<void> => {
    if (!userId) return Promise.resolve();
    return Promise.all([
      supabase.rpc('my_groups'),
      supabase.rpc('my_verified_repayments'),
      supabase.rpc('my_proof_targets'),
      supabase.from('profiles').select('proof_rules_at').eq('id', userId).maybeSingle(),
    ]).then(([g, v, t, p]) => {
      if (g.error || v.error || t.error) {
        console.warn('그룹을 받아 오지 못했어요', g.error?.message ?? v.error?.message ?? t.error?.message);
        return;
      }
      const posted = new Map<string, Set<string>>();
      for (const row of (t.data ?? []) as { repayment_id: string; group_id: string }[]) {
        const set = posted.get(row.repayment_id) ?? new Set<string>();
        set.add(row.group_id);
        posted.set(row.repayment_id, set);
      }
      setData({
        userId,
        groups: ((g.data ?? []) as MyGroupRow[]).map(groupFromRow),
        verified: new Set(((v.data ?? []) as string[]).map(String)),
        posted,
        rulesAgreed: !!(p.data as { proof_rules_at: string | null } | null)?.proof_rules_at,
      });
    });
  }, [userId]);

  // 로그인하면 받고, 앱이 다시 앞으로 오면 다시 받는다(그사이 친구가 인정했을 수 있다)
  useEffect(() => {
    if (!userId) return;
    refresh();
    sweepPhotos();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [userId, refresh]);

  // 함수들은 데이터가 바뀌어도 그대로 둔다. 화면이 이 함수들을 effect의 의존성으로 써도 다시 돌지 않게 하려는 것이다.
  type Actions = Omit<Store, 'groups' | 'loaded' | 'verified' | 'posted' | 'rulesAgreed' | 'refresh'>;
  const actions = useMemo<Actions>(() => {
    const call = async <T,>(fn: string, args: Record<string, unknown>, fallback: string): Promise<Result<T>> => {
      const { data: out, error } = await supabase.rpc(fn, args);
      if (error) {
        console.warn(`${fn} 실패`, error.message);
        return fail(groupErrorMessage(error, fallback));
      }
      return { ok: true, value: out as T };
    };

    return {
      create: async (name, nickname, theme = 'etc', themeLabel = null) => {
        const r = await call<{ id: string; invite_code: string }[]>(
          'create_group',
          { p_name: name.trim(), p_nickname: nickname.trim(), p_theme: theme, p_theme_label: themeLabel },
          '그룹을 만들지 못했어요. 잠시 뒤에 다시 해 주세요');
        if (!r.ok) return r;
        const row = r.value[0];
        track('group_create');
        await refresh();
        return { ok: true, value: { id: row.id, code: row.invite_code } };
      },

      preview: async (code) => {
        const r = await call<GroupPreviewRow[]>('group_preview', { p_code: code }, '그룹을 찾지 못했어요. 인터넷 연결을 확인해 주세요');
        if (!r.ok) return r;
        const row = r.value[0];
        return {
          ok: true,
          value: row
            ? { id: row.id, name: row.name, members: row.members, ownerNickname: row.owner_nickname, isMember: row.is_member, theme: toTheme(row.theme), themeLabel: row.theme_label ?? null, maxMembers: row.max_members ?? MAX_MEMBERS }
            : null,
        };
      },

      join: async (code, nickname) => {
        const r = await call<string>('join_group', { p_code: code, p_nickname: nickname.trim() }, '들어가지 못했어요. 잠시 뒤에 다시 해 주세요');
        if (!r.ok) return r;
        // 코드를 못 찾으면 서버가 null을 돌려준다(틀린 횟수를 남기려고 오류를 내지 않는다)
        if (!r.value) return fail(groupErrorMessage({ hint: 'not_found' }, '초대 코드를 찾을 수 없어요'));
        sendPush('join', r.value);
        await refresh();
        track('group_join');
        return r;
      },

      leave: async (groupId) => {
        const r = await call<void>('leave_group', { p_group_id: groupId }, '나가지 못했어요. 잠시 뒤에 다시 해 주세요');
        if (r.ok) {
          track('group_leave');
          sweepPhotos(true);
          await refresh();
        }
        return r;
      },

      kick: async (groupId, uid) => {
        const r = await call<void>('kick_member', { p_group_id: groupId, p_user_id: uid }, '내보내지 못했어요');
        if (r.ok) sweepPhotos(true);
        return r;
      },

      rotateCode: async (groupId) => {
        const r = await call<string>('rotate_invite_code', { p_group_id: groupId }, '초대 코드를 바꾸지 못했어요');
        if (r.ok) await refresh();
        return r;
      },

      markSeen: (groupId) => {
        supabase.rpc('mark_group_seen', { p_group_id: groupId }).then(({ error }) => {
          if (error) console.warn('그룹을 본 시각을 남기지 못했어요', error.message);
          else refresh();
        });
      },

      feed: async (groupId, before) => {
        const r = await call<FeedRow[]>('group_feed', { p_group_id: groupId, p_before: before ?? null, p_limit: 20 }, '인증을 받아 오지 못했어요');
        return r.ok ? { ok: true, value: (r.value ?? []).map(proofFromRow) } : r;
      },

      pot: async (groupId) => {
        const r = await call<number>('group_pot_now', { p_group_id: groupId }, '금고를 받아 오지 못했어요');
        return r.ok ? (r.value ?? 0) : 0;
      },

      setTheme: async (groupId, theme, themeLabel) => {
        const r = await call<void>('set_group_theme', { p_group_id: groupId, p_theme: theme, p_theme_label: themeLabel }, '테마를 바꾸지 못했어요');
        if (r.ok) await refresh();
        return r;
      },

      standing: async (groupId) => {
        const r = await call<GroupStandingRow[]>('group_standing', { p_group_id: groupId }, '그룹 순위를 받아 오지 못했어요');
        return r.ok ? { ok: true, value: (r.value ?? []).map(groupStandingFromRow) } : r;
      },

      members: async (groupId) => {
        const r = await call<MemberRow[]>('group_members_of', { p_group_id: groupId }, '그룹원을 받아 오지 못했어요');
        return r.ok ? { ok: true, value: (r.value ?? []).map(memberFromRow) } : r;
      },

      photoUrls: async (paths) => {
        if (!paths.length) return {};
        const { data: urls, error } = await supabase.storage.from('proofs').createSignedUrls(paths, PHOTO_URL_TTL);
        if (error) {
          console.warn('사진 주소를 받지 못했어요', error.message);
          return {};
        }
        const out: Record<string, string> = {};
        for (const u of urls ?? []) if (u.path && u.signedUrl) out[u.path] = u.signedUrl;
        return out;
      },

      vote: async (proofId, vote) => {
        const r = await call<void>('vote_proof', { p_proof_id: proofId, p_vote: vote }, '투표하지 못했어요. 잠시 뒤에 다시 해 주세요');
        if (r.ok && vote) {
          track('proof_vote', { vote });
          sendPush('vote', proofId);
        }
        return r;
      },

      report: async (proofId, reason) => {
        const r = await call<void>('report_proof', { p_proof_id: proofId, p_reason: reason }, '신고하지 못했어요. 잠시 뒤에 다시 해 주세요');
        if (r.ok) track('proof_report', { reason });
        return r;
      },

      removeProof: async (proof) => {
        const { error } = await supabase.from('proofs').delete().eq('id', proof.id);
        if (error) return fail('지우지 못했어요. 잠시 뒤에 다시 해 주세요');
        // 사진을 못 지워도 인증은 이미 사라졌으니 실패로 보지 않는다
        const { error: e2 } = await supabase.storage.from('proofs').remove([proof.photoPath]);
        if (e2) console.warn('사진을 지우지 못했어요', e2.message);
        await refresh();
        return { ok: true, value: undefined };
      },

      block: async (uid) => {
        if (!userId) return fail('로그인이 필요해요');
        const { error } = await supabase.from('blocks').insert({ blocker_id: userId, blocked_id: uid });
        if (error && error.code !== '23505') return fail('차단하지 못했어요');
        await refresh();
        return { ok: true, value: undefined };
      },

      unblock: async (uid) => {
        if (!userId) return fail('로그인이 필요해요');
        const { error } = await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', uid);
        if (error) return fail('차단을 풀지 못했어요');
        await refresh();
        return { ok: true, value: undefined };
      },

      agreeRules: async () => {
        if (!userId) return fail('로그인이 필요해요');
        const { error } = await supabase.from('profiles').update({ proof_rules_at: new Date().toISOString() }).eq('id', userId);
        if (error) return fail('동의를 저장하지 못했어요. 잠시 뒤에 다시 해 주세요');
        setData((d) => (d && d.userId === userId ? { ...d, rulesAgreed: true } : d));
        return { ok: true, value: undefined };
      },

      postProof: async ({ repaymentId, groupIds, caption, photoBase64, flush }) => {
        if (!userId) return fail('로그인이 필요해요');
        const bytes = base64ToBytes(photoBase64);
        let posted = 0;
        let lastError = '인증을 올리지 못했어요. 잠시 뒤에 다시 해 주세요';
        for (const groupId of groupIds) {
          const id = Crypto.randomUUID();
          const path = photoPath(groupId, userId, id);
          const up = await supabase.storage.from('proofs').upload(path, bytes.buffer as ArrayBuffer, { contentType: 'image/jpeg', upsert: false });
          if (up.error) {
            console.warn('사진을 올리지 못했어요', up.error.message);
            lastError = '사진을 올리지 못했어요. 인터넷 연결을 확인해 주세요';
            continue;
          }
          // 방금 한 상환이 아직 서버에 올라가지 않았으면 기록을 찾을 수 없다. 올리기를 재촉하고 몇 번 다시 해 본다.
          let ok = false;
          for (let attempt = 0; attempt < 4 && !ok; attempt++) {
            const { error } = await supabase
              .from('proofs')
              .insert({ id, group_id: groupId, user_id: userId, repayment_id: repaymentId, caption: caption.trim(), photo_path: path });
            if (!error) {
              ok = true;
              break;
            }
            if (error.code === '23505') {
              ok = true; // 이 그룹에 이미 올렸다
              break;
            }
            const notSynced = error.code === '23503' || error.code === 'P0002';
            if (!notSynced) {
              console.warn('인증을 올리지 못했어요', error.message);
              if (error.code === '22023') lastError = '상환한 지 24시간이 지나 인증을 올릴 수 없어요';
              break;
            }
            await flush();
            await wait(1500);
          }
          if (ok) {
            posted += 1;
            sendPush('proof', id);
          }
          else await supabase.storage.from('proofs').remove([path]);
        }
        if (posted === 0) return fail(lastError);
        track('proof_post', { group_count: posted });
        await refresh();
        return { ok: true, value: posted };
      },
    };
  }, [userId, refresh]);

  const store = useMemo<Store>(() => {
    const mine = data && data.userId === userId ? data : null;
    return {
      groups: mine?.groups ?? [],
      loaded: !!mine,
      verified: mine?.verified ?? NO_IDS,
      posted: mine?.posted ?? NO_POSTED,
      rulesAgreed: mine?.rulesAgreed ?? false,
      refresh,
      ...actions,
    };
  }, [data, userId, refresh, actions]);

  return <GroupsContext.Provider value={store}>{children}</GroupsContext.Provider>;
}

export function useGroups(): Store {
  const store = useContext(GroupsContext);
  if (!store) throw new Error('GroupsProvider 안에서만 쓸 수 있어요');
  return store;
}
