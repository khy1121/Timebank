import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { boardFromRows, creditFromJson, type BoardRow, type CreditInfo } from '@/domain/credit';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';
import { useTodos } from './todos';

/**
 * 신용 점수. (FR-097~102)
 * 점수는 서버가 계산하므로 기기에 사본을 두지 않는다. 앱을 켤 때, 앞으로 돌아올 때,
 * 할 일 기록이 서버에 올라간 뒤(동기화가 끝났을 때) 다시 받는다.
 */

type Store = {
  info: CreditInfo | null;
  /** 전체 순위표 (다른 사람 이름은 서버가 첫 글자만 보낸다) */
  global: BoardRow[];
  friends: BoardRow[];
  loaded: boolean;
  failed: boolean;
  refresh: () => Promise<void>;
};

const CreditContext = createContext<Store | null>(null);

type Row = { rank: number; user_id?: string | null; name: string; score: number; week_delta: number; is_me: boolean };

export function CreditProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { syncState, pendingCount } = useTodos();
  const userId = session?.user.id ?? null;
  const [data, setData] = useState<{ userId: string; info: CreditInfo | null; global: BoardRow[]; friends: BoardRow[] } | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback((): Promise<void> => {
    if (!userId) return Promise.resolve();
    return Promise.all([supabase.rpc('my_credit'), supabase.rpc('global_leaderboard', { p_limit: 20 }), supabase.rpc('friends_leaderboard')]).then(
      ([c, g, f]) => {
        if (c.error || g.error || f.error) {
          console.warn('신용 점수를 받아 오지 못했어요', c.error?.message ?? g.error?.message ?? f.error?.message);
          setFailed(true);
          return;
        }
        setFailed(false);
        setData({
          userId,
          info: creditFromJson(c.data),
          global: boardFromRows((g.data ?? []) as Row[]),
          friends: boardFromRows((f.data ?? []) as Row[]),
        });
      },
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [userId, refresh]);

  // 끝낸 일이 서버에 올라가면 점수가 바뀐다
  const settled = syncState !== 'syncing' && pendingCount === 0;
  useEffect(() => {
    if (userId && settled) refresh();
  }, [userId, settled, refresh]);

  const mine = data && data.userId === userId ? data : null;
  const store = useMemo<Store>(
    () => ({ info: mine?.info ?? null, global: mine?.global ?? [], friends: mine?.friends ?? [], loaded: !!mine, failed, refresh }),
    [mine, failed, refresh],
  );
  return <CreditContext.Provider value={store}>{children}</CreditContext.Provider>;
}

export function useCredit(): Store {
  const store = useContext(CreditContext);
  if (!store) throw new Error('CreditProvider 안에서만 쓸 수 있어요');
  return store;
}
