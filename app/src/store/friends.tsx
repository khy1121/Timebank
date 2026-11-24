import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  friendErrorMessage,
  friendFromRow,
  profileFromRow,
  requestFromRow,
  toFriendState,
  toSendResult,
  type Friend,
  type FriendProfile,
  type FriendRequest,
  type FriendRow,
  type FriendState,
  type FriendVia,
  type ProfileRow,
  type RequestRow,
  type SendResult,
} from '@/domain/friends';
import { track } from '@/lib/events';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';

/**
 * 친구. (FR-103~107, 친구기획서 TI-FRD-001 1·2단계)
 * 친구 목록과 신청은 여기서 들고 있고, 친구 프로필과 그룹원과의 친구 상태는 화면이 그때그때 받는다.
 * 그룹처럼 기기에 사본을 두지 않고 늘 서버 값을 본다.
 */

export type Result<T = void> = { ok: true; value: T } | { ok: false; message: string };

type Me = { name: string; code: string };

type Store = {
  /** 내 표시 이름과 친구 코드. 아직 받지 못했으면 null */
  me: Me | null;
  friends: Friend[];
  requests: FriendRequest[];
  /** 받은 신청 수 (순위 탭의 "친구" 옆에 보인다) */
  incomingCount: number;
  loaded: boolean;
  refresh: () => Promise<void>;
  sendByCode: (code: string) => Promise<Result<SendResult>>;
  sendToUser: (userId: string, via: FriendVia) => Promise<Result<SendResult>>;
  respond: (requestId: string, accept: boolean) => Promise<Result>;
  cancel: (requestId: string) => Promise<Result>;
  remove: (userId: string) => Promise<Result>;
  rotateCode: () => Promise<Result<string>>;
  setName: (name: string) => Promise<Result>;
  profile: (userId: string) => Promise<Result<FriendProfile | null>>;
  states: (userIds: string[]) => Promise<Record<string, FriendState>>;
};

const FriendsContext = createContext<Store | null>(null);

const fail = (message: string): Result<never> => ({ ok: false, message });

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  // 계정 ID와 함께 저장해 다른 계정 것이 섞이지 않게 한다
  const [data, setData] = useState<{ userId: string; me: Me | null; friends: Friend[]; requests: FriendRequest[] } | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (!userId) return Promise.resolve();
    return Promise.all([
      supabase.from('profiles').select('display_name, friend_code').eq('id', userId).maybeSingle(),
      supabase.rpc('my_friends'),
      supabase.rpc('my_friend_requests'),
    ]).then(([p, f, r]) => {
      if (p.error || f.error || r.error) {
        console.warn('친구를 받아 오지 못했어요', p.error?.message ?? f.error?.message ?? r.error?.message);
        return;
      }
      const row = p.data as { display_name: string | null; friend_code: string | null } | null;
      setData({
        userId,
        me: row?.friend_code ? { name: row.display_name ?? '친구', code: row.friend_code } : null,
        friends: ((f.data ?? []) as FriendRow[]).map(friendFromRow),
        requests: ((r.data ?? []) as RequestRow[]).map(requestFromRow),
      });
    });
  }, [userId]);

  // 로그인하면 받고, 앱이 다시 앞으로 오면 다시 받는다(그사이 신청이 왔을 수 있다)
  useEffect(() => {
    if (!userId) return;
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [userId, refresh]);

  type Actions = Omit<Store, 'me' | 'friends' | 'requests' | 'incomingCount' | 'loaded' | 'refresh'>;
  const actions = useMemo<Actions>(() => {
    const call = async <T,>(fn: string, args: Record<string, unknown>, fallback: string): Promise<Result<T>> => {
      const { data: out, error } = await supabase.rpc(fn, args);
      if (error) {
        console.warn(`${fn} 실패`, error.message);
        return fail(friendErrorMessage(error, fallback));
      }
      return { ok: true, value: out as T };
    };
    const send = async (args: Record<string, unknown>, via: FriendVia): Promise<Result<SendResult>> => {
      const r = await call<string>('send_friend_request', { ...args, p_via: via }, '친구 신청을 보내지 못했어요. 잠시 뒤에 다시 해 주세요');
      if (!r.ok) return r;
      const result = toSendResult(r.value);
      if (result !== 'not_found') {
        track('friend_request', { via, result });
        await refresh();
      }
      return { ok: true, value: result };
    };

    return {
      sendByCode: (code) => send({ p_code: code }, 'code'),
      sendToUser: (uid, via) => send({ p_user: uid }, via),

      respond: async (requestId, accept) => {
        const r = await call<void>('respond_friend_request', { p_id: requestId, p_accept: accept }, '답하지 못했어요. 잠시 뒤에 다시 해 주세요');
        if (r.ok && accept) track('friend_accept');
        await refresh();
        return r.ok ? { ok: true, value: undefined } : r;
      },

      cancel: async (requestId) => {
        const r = await call<void>('cancel_friend_request', { p_id: requestId }, '신청을 취소하지 못했어요');
        await refresh();
        return r.ok ? { ok: true, value: undefined } : r;
      },

      remove: async (uid) => {
        const r = await call<void>('remove_friend', { p_user: uid }, '친구를 끊지 못했어요');
        if (r.ok) track('friend_remove');
        await refresh();
        return r.ok ? { ok: true, value: undefined } : r;
      },

      rotateCode: async () => {
        const r = await call<string>('rotate_friend_code', {}, '코드를 바꾸지 못했어요');
        if (r.ok) await refresh();
        return r;
      },

      setName: async (name) => {
        const r = await call<void>('set_display_name', { p_name: name.trim() }, '이름을 바꾸지 못했어요');
        if (r.ok) await refresh();
        return r.ok ? { ok: true, value: undefined } : r;
      },

      profile: async (uid) => {
        const r = await call<ProfileRow[]>('friend_profile', { p_user: uid }, '친구 정보를 받아 오지 못했어요');
        if (!r.ok) return r;
        const row = (r.value ?? [])[0];
        return { ok: true, value: row ? profileFromRow(row) : null };
      },

      states: async (uids) => {
        if (!uids.length) return {};
        const r = await call<{ user_id: string; state: string }[]>('my_friend_states', { p_users: uids }, '');
        const out: Record<string, FriendState> = {};
        if (r.ok) for (const row of r.value ?? []) out[row.user_id] = toFriendState(row.state);
        return out;
      },
    };
  }, [refresh]);

  const mine = data && data.userId === userId ? data : null;
  const store = useMemo<Store>(
    () => ({
      me: mine?.me ?? null,
      friends: mine?.friends ?? [],
      requests: mine?.requests ?? [],
      incomingCount: (mine?.requests ?? []).filter((r) => r.incoming).length,
      loaded: !!mine,
      refresh,
      ...actions,
    }),
    [mine, refresh, actions],
  );
  return <FriendsContext.Provider value={store}>{children}</FriendsContext.Provider>;
}

export function useFriends(): Store {
  const store = useContext(FriendsContext);
  if (!store) throw new Error('FriendsProvider 안에서만 쓸 수 있어요');
  return store;
}
