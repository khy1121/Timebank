import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  buildSignals,
  rankChange,
  scoreBreakdown,
  standingFromRow,
  statusMessage,
  statusOf,
  type RankChange,
  type ScoreBreakdown,
  type Signals,
  type StandingRow,
  type StandingWeek,
  type StatusCode,
} from '@/domain/standing';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';
import { useProfile } from './profile';
import { useTodos } from './todos';

/**
 * 이번 주 순위와 상태. (FR-065~069)
 * 순위는 서버 standing_history에서 최근 5주치를 받는다. 서버는 내 순위만 돌려준다.
 * 서버 점수는 서버에 올라간 기록으로 계산하므로, 기기의 변경이 서버에 올라간 뒤에 다시 받는다.
 */

export const HISTORY_WEEKS = 5;

type Store = {
  /** 오래된 주부터. 마지막이 이번 주 */
  weeks: StandingWeek[];
  current: StandingWeek | null;
  change: RankChange;
  signals: Signals;
  status: StatusCode;
  message: string;
  loading: boolean;
  /** 마지막으로 받아 오지 못했으면 true */
  failed: boolean;
  refresh: () => void;
};

const StandingContext = createContext<Store | null>(null);

export function StandingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { profile } = useProfile();
  const { todos, repayments, today, wallet, lastActivity, syncState, pendingCount, hydrated } = useTodos();
  const [loaded, setLoaded] = useState<{ userId: string; weeks: StandingWeek[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  // 그룹원에게 보여줄 내 상태를 마지막으로 올린 값 (FR-081)
  const uploadedStatus = useRef<string | null>(null);
  // 받는 중에 또 요청이 오면 끝난 뒤 한 번 더 받는다 (그 사이 바뀐 기록을 놓치지 않게)
  const again = useRef(false);

  // 상태는 응답을 받은 뒤 콜백에서만 바꾼다. 결과는 계정 ID와 함께 저장해 다른 계정 것이 섞이지 않게 한다.
  const refresh = useCallback(() => {
    if (!userId) return;
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    const run = (): void => {
      again.current = false;
      supabase
        .rpc('standing_history', { p_weeks: HISTORY_WEEKS })
        .then(({ data, error }) => {
          if (error) {
            console.warn('순위를 받아 오지 못했어요', error.message);
            setFailed(true);
          } else {
            setFailed(false);
            setLoaded({ userId, weeks: ((data ?? []) as StandingRow[]).map(standingFromRow) });
          }
          if (again.current) run();
          else inFlight.current = false;
        });
    };
    run();
  }, [userId]);

  // 서버에 다 올라간 뒤(보낼 것 0, 맞추기 끝), 기록 수가 바뀔 때, 날짜가 바뀔 때 다시 받는다
  const settled = hydrated && pendingCount === 0 && syncState === 'idle';
  const repaymentCount = repayments.length;
  useEffect(() => {
    if (settled) refresh();
  }, [settled, repaymentCount, today, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // 계산한 값과 받아 오는 함수를 나눠 둔다. 아래 상태 올리기 effect가 계산한 값만 보게 하려는 것이다.
  const derived = useMemo(() => {
    const weeks = loaded && loaded.userId === userId ? loaded.weeks : [];
    const current = weeks.length ? weeks[weeks.length - 1] : null;
    const previous = weeks.length > 1 ? weeks[weeks.length - 2] : null;
    const signals = buildSignals({
      todos,
      repayments,
      today,
      streak: wallet.streak,
      standing: current,
      lastActivity,
      signupDate: profile?.signupDate ?? null,
    });
    const status = statusOf(signals);
    return {
      weeks,
      current,
      change: rankChange(current, previous),
      signals,
      status,
      message: statusMessage(status, signals, profile?.voice ?? 'spicy'),
    };
  }, [loaded, userId, todos, repayments, today, wallet.streak, lastActivity, profile]);

  const store = useMemo<Store>(
    () => ({ ...derived, loading: !loaded && !failed, failed, refresh }),
    [derived, loaded, failed, refresh],
  );

  // 순위를 받은 뒤 상태가 바뀌었으면 서버에 올려 둔다. 그룹원 목록과 그룹 순위에 보인다 (FR-081)
  const ready = !!loaded && loaded.userId === userId && !failed;
  const status = derived.status;
  useEffect(() => {
    if (!userId || !ready) return;
    const key = `${userId}:${status}:${today}`;
    if (uploadedStatus.current === key) return;
    uploadedStatus.current = key;
    supabase
      .from('profiles')
      .update({ status_code: status, status_on: today })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) {
          console.warn('상태를 올리지 못했어요', error.message);
          uploadedStatus.current = null;
        }
      });
  }, [userId, ready, status, today]);

  return <StandingContext.Provider value={store}>{children}</StandingContext.Provider>;
}

export function useStanding(): Store {
  const store = useContext(StandingContext);
  if (!store) throw new Error('StandingProvider 안에서만 쓸 수 있어요');
  return store;
}

/** 점수 설명: 이번 주 번 냥, 낸 이자, 지금 붙고 있는 이자 (기기 기록 기준) */
export function useScoreBreakdown(): ScoreBreakdown {
  const { repayments, todos, today } = useTodos();
  return useMemo(() => scoreBreakdown(repayments, todos, today), [repayments, todos, today]);
}
