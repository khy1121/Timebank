import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { diffDays, toDateString, type DateString } from '@/domain/dates';
import { principalOf, viewOf, type Todo } from '@/domain/interest';
import { settle, type Repayment, type TodoInput } from '@/domain/records';
import {
  isUuid,
  latestUpdatedAt,
  ledgerEventFromRow,
  ledgerEventToParams,
  mergeRows,
  purchaseFromRow,
  purchaseToParams,
  repaymentFromRow,
  repaymentToParams,
  splitLedgerEvents,
  todoFromRow,
  todoToParams,
  visible,
  type LedgerEventRow,
  type PurchaseRow,
  type RepaymentRow,
  type StoredLedgerEvent,
  type StoredPurchase,
  type StoredRepayment,
  type StoredTodo,
  type TodoRow,
} from '@/domain/sync';
import { bankProgress, type Progress } from '@/domain/bankConditions';
import { nextDue } from '@/domain/repeat';
import { canBuy, itemOf, ownedCodes } from '@/domain/shop';
import { accountOf, earlyForgiveRefund, extendFee, inFreeEdit, settlementOf, type Account, type AccountInput, type Settlement, type StakedTodo } from '@/domain/savings';
import { type Purchase, type Wallet } from '@/domain/wallet';
import { daysUntilDue } from '@/domain/events';
import { track } from '@/lib/events';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';
import { useGroups } from './groups';
import { useProfile } from './profile';

/**
 * 할 일 저장소.
 * 화면은 항상 기기 안의 사본을 읽고, 서버 반영은 뒤에서 처리한다. (FR-040~042, NFR-005)
 * - 바꾼 행은 "보낼 목록"에 넣고, 서버에 올라가면 목록에서 뺀다.
 * - 서버에서는 마지막으로 받은 시각 이후에 바뀐 행만 받아 와 합친다.
 * - 저장은 계정마다 따로 한다.
 * - 상점 구매 기록도 같은 방식으로 맞춘다. 잔고는 저장하지 않고 상환·구매 기록에서 계산한다. (FR-060~063)
 * - 장부 사건(기한 연장, 파산, 금고 배당)도 같은 방식으로 맞춘다. 통장·적금은 savings.ts가 계산한다 (시간적금기획서)
 */

const storageKey = (userId: string) => `todo-interest/v2/${userId}`;
const LEGACY_KEY = 'todo-interest/v1';

/** 기기 사본의 모양. 3부터 할 일의 등록 시각·보증금 그룹과 장부 사건이 있다 */
const DATA_VERSION = 3;

type Data = {
  version?: number;
  todos: StoredTodo[];
  repayments: StoredRepayment[];
  purchases: StoredPurchase[];
  events: StoredLedgerEvent[];
  /** 아직 서버에 올리지 못한 행의 ID */
  pendingTodos: string[];
  pendingRepayments: string[];
  pendingPurchases: string[];
  pendingEvents: string[];
  lastPulled: { todos: string | null; repayments: string | null; purchases: string | null; events: string | null };
};

type State = Data & { hydrated: boolean };

const EMPTY: Data = {
  version: DATA_VERSION,
  todos: [],
  repayments: [],
  purchases: [],
  events: [],
  pendingTodos: [],
  pendingRepayments: [],
  pendingPurchases: [],
  pendingEvents: [],
  lastPulled: { todos: null, repayments: null, purchases: null, events: null },
};

type Stamp = { id: string; updatedAt: string };

type Action =
  | { type: 'hydrate'; data: Data }
  | { type: 'reset' }
  | { type: 'putTodo'; todo: StoredTodo }
  | { type: 'putRepayment'; repayment: StoredRepayment }
  | { type: 'putPurchase'; purchase: StoredPurchase }
  | { type: 'putEvent'; event: StoredLedgerEvent }
  | { type: 'pushed'; todos: Stamp[]; repayments: Stamp[]; purchases: Stamp[]; events: Stamp[] }
  | { type: 'pulled'; todos: StoredTodo[]; repayments: StoredRepayment[]; purchases: StoredPurchase[]; events: StoredLedgerEvent[] };

const put = <T extends { id: string }>(rows: T[], row: T): T[] =>
  rows.some((r) => r.id === row.id) ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row];

const addId = (ids: string[], id: string) => (ids.includes(id) ? ids : [...ids, id]);

/** 올린 뒤에 다시 바뀌지 않은 행만 보낼 목록에서 뺀다 */
function settlePending<T extends Stamp>(pending: string[], rows: T[], pushed: Stamp[]): string[] {
  const done = new Set(
    pushed.filter((p) => rows.find((r) => r.id === p.id)?.updatedAt === p.updatedAt).map((p) => p.id),
  );
  return pending.filter((id) => !done.has(id));
}

/** 할 일 합치기: 예전 사본에 없던 등록 시각·보증금 그룹은 서버 것으로 채운다(수정 시각이 같아도) */
function mergeTodos(local: StoredTodo[], remote: StoredTodo[]): StoredTodo[] {
  const merged = mergeRows(local, remote);
  const fromServer = new Map(remote.map((r) => [r.id, r]));
  return merged.map((row) => {
    const r = fromServer.get(row.id);
    if (!r || row.createdAt) return row;
    return { ...row, createdAt: r.createdAt, stakeGroupId: row.stakeGroupId ?? r.stakeGroupId ?? null };
  });
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...action.data, hydrated: true };
    case 'reset':
      return { ...EMPTY, hydrated: false };
    case 'putTodo':
      return {
        ...state,
        todos: put(state.todos, action.todo),
        pendingTodos: addId(state.pendingTodos, action.todo.id),
      };
    case 'putRepayment':
      return {
        ...state,
        repayments: put(state.repayments, action.repayment),
        pendingRepayments: addId(state.pendingRepayments, action.repayment.id),
      };
    case 'putPurchase':
      return {
        ...state,
        purchases: put(state.purchases, action.purchase),
        pendingPurchases: addId(state.pendingPurchases, action.purchase.id),
      };
    case 'putEvent':
      return {
        ...state,
        events: put(state.events, action.event),
        pendingEvents: addId(state.pendingEvents, action.event.id),
      };
    case 'pushed':
      return {
        ...state,
        pendingTodos: settlePending(state.pendingTodos, state.todos, action.todos),
        pendingRepayments: settlePending(state.pendingRepayments, state.repayments, action.repayments),
        pendingPurchases: settlePending(state.pendingPurchases, state.purchases, action.purchases),
        pendingEvents: settlePending(state.pendingEvents, state.events, action.events),
      };
    case 'pulled':
      return {
        ...state,
        todos: mergeTodos(state.todos, action.todos),
        repayments: mergeRows(state.repayments, action.repayments),
        purchases: mergeRows(state.purchases, action.purchases),
        events: mergeRows(state.events, action.events),
        lastPulled: {
          todos: latestUpdatedAt(action.todos, state.lastPulled.todos),
          repayments: latestUpdatedAt(action.repayments, state.lastPulled.repayments),
          purchases: latestUpdatedAt(action.purchases, state.lastPulled.purchases),
          events: latestUpdatedAt(action.events, state.lastPulled.events),
        },
      };
  }
}

function isData(v: unknown): v is Data {
  const d = v as Data | null;
  return !!d && Array.isArray(d.todos) && Array.isArray(d.repayments) && Array.isArray(d.pendingTodos);
}

/**
 * 예전에 저장한 사본을 지금 모양으로 맞춘다.
 * - 상점 전 사본에는 구매 기록 칸이 없다.
 * - 시간 적금 전 사본(버전 3 미만)에는 할 일의 등록 시각이 없다. 할 일을 처음부터 다시 받아 채운다.
 */
function withDefaults(d: Data): Data {
  const old = (d.version ?? 2) < DATA_VERSION;
  return {
    ...d,
    version: DATA_VERSION,
    purchases: d.purchases ?? [],
    events: d.events ?? [],
    pendingPurchases: d.pendingPurchases ?? [],
    pendingEvents: d.pendingEvents ?? [],
    lastPulled: {
      todos: old ? null : (d.lastPulled?.todos ?? null),
      repayments: d.lastPulled?.repayments ?? null,
      purchases: d.lastPulled?.purchases ?? null,
      events: d.lastPulled?.events ?? null,
    },
  };
}

/** 로그인 기능이 생기기 전에 기기에만 저장하던 데이터를 옮겨 온다. 한 번만 일어난다. */
async function readLegacy(now: string): Promise<Data | null> {
  const raw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(LEGACY_KEY);
  const old = JSON.parse(raw) as { todos?: Todo[]; repayments?: Repayment[] };
  // 개발용 예시(ID가 UUID가 아님)는 서버에 올릴 수 없으므로 버린다
  const todos = (old.todos ?? []).filter((t) => isUuid(t.id)).map((t) => ({ ...t, updatedAt: now, deletedAt: null }));
  const kept = new Set(todos.map((t) => t.id));
  const repayments = (old.repayments ?? [])
    .filter((r) => isUuid(r.id) && kept.has(r.todoId))
    .map((r) => ({ ...r, updatedAt: now, deletedAt: null }));
  return {
    ...EMPTY,
    todos,
    repayments,
    pendingTodos: todos.map((t) => t.id),
    pendingRepayments: repayments.map((r) => r.id),
  };
}

/** 가장 늦은 수정 시각의 현지 날짜 */
function lastActivityOf(rows: { updatedAt: string }[]): DateString | null {
  let latest = 0;
  for (const r of rows) latest = Math.max(latest, Date.parse(r.updatedAt) || 0);
  return latest ? toDateString(new Date(latest)) : null;
}

/** 오늘 날짜. 앱이 다시 앞으로 나오거나 자정이 지나면 바뀐다. (FR-026) */
function useToday(): DateString {
  const [today, setToday] = useState(() => toDateString(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toDateString(new Date()));
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = setTimeout(refresh, nextMidnight.getTime() - now.getTime());
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [today]);

  return today;
}

export type SyncState = 'idle' | 'syncing' | 'error';

type Store = {
  hydrated: boolean;
  /** 할 일. stakeGroupId가 있으면 그룹 보증금으로 건 것이다 */
  todos: StoredTodo[];
  repayments: StoredRepayment[];
  purchases: Purchase[];
  /** 통장·적금·순자산·빚·파산 (시간적금기획서) */
  account: Account;
  /**
   * 예전 화면과 맞추려고 남긴 잔고. balance는 지금 쓸 수 있는 냥이다(빚이 있거나 파산 중이면 0).
   * 화면을 시간 적금에 맞게 바꾸면 account로 옮긴다.
   */
  wallet: Wallet;
  /** 기본 물건과 산 물건의 코드 */
  owned: Set<string>;
  /** 다음 은행을 여는 조건의 진행. 중앙은행까지 열었으면 null */
  nextBankProgress: Progress | null;
  /** 마지막으로 할 일·기록을 고친 날(기기 현지 날짜). 없으면 null. 잠수 판정에 쓴다 (FR-066) */
  lastActivity: DateString | null;
  today: DateString;
  /** 아직 서버에 올리지 못한 변경 수 */
  pendingCount: number;
  syncState: SyncState;
  /** 등록. 원금이 통장에서 적금으로 옮겨진다. stakeGroupId가 있으면 그 그룹 보증금으로 건다 */
  add: (input: TodoInput, stakeGroupId?: string | null) => string;
  /**
   * 수정. 등록 후 1시간 안이면 무엇이든 무료다. 그 뒤에 기한을 미루면 연장 수수료를 낸다(원금 × 5% × 미룬 날).
   * 낸 수수료를 돌려준다.
   */
  update: (id: string, input: TodoInput) => number;
  /** 이 수정에 드는 연장 수수료. 화면에서 미리 보여준다 */
  extendFeeFor: (id: string, input: TodoInput) => number;
  /** 상환(완료). 그 시점의 금액을 기록하고 상환 기록 ID를 돌려준다. 친구 인증에 쓴다 (FR-078) */
  repay: (id: string) => string | null;
  undoRepay: (id: string) => void;
  /**
   * 삭제. 등록 후 1시간 안이면 원금을 모두 돌려받고 지운다.
   * 그 뒤에는 포기로 기록한다: 기한 전이면 원금의 절반을 돌려받고, 연체 뒤면 원금과 연체료를 잃는다.
   * 포기로 기록했으면 true.
   */
  remove: (id: string) => boolean;
  /** 지우면 돌려받는 냥(포기면 마이너스일 수 있다). 화면에서 미리 보여준다 */
  removeRefundFor: (id: string) => number;
  /** 파산 신청. 순자산이 파산 기준에 닿으면 저절로 기록된다 */
  declareBankruptcy: () => void;
  /** 상환 기록의 도장과 손익 (시간적금기획서 12절) */
  settlementFor: (r: Repayment) => Settlement;
  /** 상점 물건 사기. 잔고가 모자라거나 이미 가졌으면 false (FR-063) */
  buy: (itemCode: string) => boolean;
  /** 여러 개를 한 번에 산다. 합계가 잔고를 넘거나 하나라도 살 수 없으면 아무것도 사지 않는다 (FR-072) */
  buyAll: (itemCodes: string[]) => boolean;
  /** 이 기기에 저장된 사본을 지운다. 로그아웃할 때 쓴다. (FR-003) */
  clearLocal: () => Promise<void>;
  /** 지금 바로 서버와 맞춘다. 인증을 올리기 전에 상환 기록을 먼저 올릴 때 쓴다 */
  flush: () => Promise<void>;
};

const TodosContext = createContext<Store | null>(null);

const TODO_COLUMNS = 'id,title,importance,due_date,status,updated_at,deleted_at,created_at,stake_group_id,repeat,repeat_from';
const REPAYMENT_COLUMNS = 'id,todo_id,kind,title,principal,interest,overdue_days,settled_on,updated_at,deleted_at';
const PURCHASE_COLUMNS = 'id,item_code,price,purchased_on,updated_at,deleted_at';
const EVENT_COLUMNS = 'id,kind,todo_id,days,amount,happened_on,updated_at,deleted_at';

/** 할 일을 장부 계산용으로. 등록 시각이 없는 예전 기록은 마지막으로 고친 날로 본다 */
function toStaked(t: StoredTodo): StakedTodo {
  const created = t.createdAt ?? t.updatedAt;
  return { ...t, createdOn: toDateString(new Date(created)), groupId: t.stakeGroupId ?? null };
}

function bankruptcyEvent(id: string, today: DateString, at: string): StoredLedgerEvent {
  return { id, kind: 'bankrupt', todoId: null, days: null, amount: 0, happenedOn: today, updatedAt: at, deletedAt: null };
}

export function TodosProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const today = useToday();
  const { verified } = useGroups();
  const { profile } = useProfile();
  const signupDate = profile?.signupDate ?? null;
  const [state, dispatch] = useReducer(reducer, { ...EMPTY, hydrated: false });
  const [syncState, setSyncState] = useState<SyncState>('idle');
  // 서버와 맞추는 함수가 항상 최신 상태를 읽도록 보관한다. 아래의 다른 effect보다 먼저 실행되어야 한다.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const syncing = useRef(false);

  // 기기에 저장된 사본 읽기. 계정이 바뀌면 다시 읽는다.
  useEffect(() => {
    dispatch({ type: 'reset' });
    if (!userId) return;
    let cancelled = false;
    (async () => {
      let data: Data = EMPTY;
      try {
        const raw = await AsyncStorage.getItem(storageKey(userId));
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (isData(parsed)) data = withDefaults(parsed);
        else data = (await readLegacy(new Date().toISOString())) ?? EMPTY;
      } catch (e) {
        console.warn('저장된 데이터를 읽지 못했어요', e);
      }
      if (!cancelled) dispatch({ type: 'hydrate', data });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 바뀔 때마다 기기에 저장
  useEffect(() => {
    if (!state.hydrated || !userId) return;
    const { hydrated: _hydrated, ...data } = state;
    AsyncStorage.setItem(storageKey(userId), JSON.stringify(data)).catch((e) => console.warn('저장하지 못했어요', e));
  }, [state, userId]);

  // 서버와 맞추기: 보낼 목록을 올리고, 그 뒤에 바뀐 행을 받아 온다
  const sync = useCallback(async () => {
    if (syncing.current || !userId || !stateRef.current.hydrated) return;
    syncing.current = true;
    setSyncState('syncing');
    let failed = false;
    try {
      const snapshot = stateRef.current;
      const pushedTodos: Stamp[] = [];
      const pushedRepayments: Stamp[] = [];
      const pushedPurchases: Stamp[] = [];

      // 상환 기록은 할 일을 가리키므로 할 일을 먼저 올린다
      for (const id of snapshot.pendingTodos) {
        const todo = snapshot.todos.find((t) => t.id === id);
        if (!todo) continue;
        const { error } = await supabase.rpc('upsert_todo', todoToParams(todo));
        if (error) {
          failed = true;
          console.warn('할 일을 서버에 올리지 못했어요', error.message);
        } else {
          pushedTodos.push({ id, updatedAt: todo.updatedAt });
        }
      }
      for (const id of snapshot.pendingRepayments) {
        const repayment = snapshot.repayments.find((r) => r.id === id);
        if (!repayment) continue;
        const { error } = await supabase.rpc('upsert_repayment', repaymentToParams(repayment));
        if (error) {
          failed = true;
          console.warn('상환 기록을 서버에 올리지 못했어요', error.message);
        } else {
          pushedRepayments.push({ id, updatedAt: repayment.updatedAt });
        }
      }
      for (const id of snapshot.pendingPurchases) {
        const purchase = snapshot.purchases.find((p) => p.id === id);
        if (!purchase) continue;
        const { error } = await supabase.rpc('upsert_purchase', purchaseToParams(purchase));
        if (error) {
          failed = true;
          console.warn('구매 기록을 서버에 올리지 못했어요', error.message);
        } else {
          pushedPurchases.push({ id, updatedAt: purchase.updatedAt });
        }
      }
      const pushedEvents: Stamp[] = [];
      for (const id of snapshot.pendingEvents) {
        const event = snapshot.events.find((e) => e.id === id);
        if (!event || event.kind === 'payout') continue;
        const { error } = await supabase.rpc('upsert_ledger_event', ledgerEventToParams(event));
        if (error) {
          failed = true;
          console.warn('장부 기록을 서버에 올리지 못했어요', error.message);
        } else {
          pushedEvents.push({ id, updatedAt: event.updatedAt });
        }
      }
      dispatch({ type: 'pushed', todos: pushedTodos, repayments: pushedRepayments, purchases: pushedPurchases, events: pushedEvents });

      let todoQuery = supabase.from('todos').select(TODO_COLUMNS);
      if (snapshot.lastPulled.todos) todoQuery = todoQuery.gt('updated_at', snapshot.lastPulled.todos);
      let repaymentQuery = supabase.from('repayments').select(REPAYMENT_COLUMNS);
      if (snapshot.lastPulled.repayments) repaymentQuery = repaymentQuery.gt('updated_at', snapshot.lastPulled.repayments);
      let purchaseQuery = supabase.from('purchases').select(PURCHASE_COLUMNS);
      if (snapshot.lastPulled.purchases) purchaseQuery = purchaseQuery.gt('updated_at', snapshot.lastPulled.purchases);
      let eventQuery = supabase.from('ledger_events').select(EVENT_COLUMNS);
      if (snapshot.lastPulled.events) eventQuery = eventQuery.gt('updated_at', snapshot.lastPulled.events);
      const [todosResult, repaymentsResult, purchasesResult, eventsResult] = await Promise.all([todoQuery, repaymentQuery, purchaseQuery, eventQuery]);
      if (todosResult.error || repaymentsResult.error || purchasesResult.error || eventsResult.error) {
        failed = true;
        console.warn(
          '서버에서 받아 오지 못했어요',
          todosResult.error?.message ?? repaymentsResult.error?.message ?? purchasesResult.error?.message ?? eventsResult.error?.message,
        );
      } else {
        dispatch({
          type: 'pulled',
          todos: (todosResult.data as TodoRow[]).map(todoFromRow),
          repayments: (repaymentsResult.data as RepaymentRow[]).map(repaymentFromRow),
          purchases: (purchasesResult.data as PurchaseRow[]).map(purchaseFromRow),
          events: (eventsResult.data as LedgerEventRow[]).map(ledgerEventFromRow),
        });
      }
    } catch (e) {
      failed = true;
      console.warn('서버와 맞추지 못했어요', e);
    } finally {
      syncing.current = false;
      setSyncState(failed ? 'error' : 'idle');
    }
  }, [userId]);

  // 맞추는 시점: 사본을 읽은 직후, 보낼 것이 생겼을 때, 앱이 다시 앞으로 나올 때
  const pendingCount = state.pendingTodos.length + state.pendingRepayments.length + state.pendingPurchases.length + state.pendingEvents.length;
  useEffect(() => {
    if (state.hydrated && userId) sync();
  }, [state.hydrated, userId, pendingCount, sync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, [sync]);

  // 통장·적금은 저장하지 않고 기록에서 계산한다 (시간적금기획서)
  const accountInput = useMemo<AccountInput>(() => {
    const todos: StakedTodo[] = visible(state.todos).map(toStaked);
    return {
      signupDate,
      todos,
      repayments: visible(state.repayments),
      purchases: visible(state.purchases),
      ...splitLedgerEvents(visible(state.events)),
      verified,
      today,
    };
  }, [state.todos, state.repayments, state.purchases, state.events, signupDate, verified, today]);
  const account = useMemo(() => accountOf(accountInput), [accountInput]);
  // 다음 은행을 여는 냥 말고의 조건. 중앙은행까지 다 열었으면 null (FR-110)
  const nextBankProgress = useMemo(
    () => (account.bankStage >= 6 ? null : bankProgress(account.bankStage + 1, accountInput, account)),
    [account, accountInput],
  );

  // 순자산이 파산 기준에 닿으면 파산을 기록한다. 기록하면 shouldBankrupt가 꺼져 다시 돌지 않는다
  const shouldBankrupt = state.hydrated && account.shouldBankrupt;
  useEffect(() => {
    if (!shouldBankrupt) return;
    const at = new Date().toISOString();
    dispatch({ type: 'putEvent', event: bankruptcyEvent(Crypto.randomUUID(), today, at) });
    track('bankrupt', { auto: true });
  }, [shouldBankrupt, today]);

  const store = useMemo<Store>(() => {
    const now = () => new Date().toISOString();
    const find = (id: string) => state.todos.find((t) => t.id === id && !t.deletedAt);
    const putTodo = (todo: StoredTodo) => dispatch({ type: 'putTodo', todo });
    const putRepayment = (repayment: StoredRepayment) => dispatch({ type: 'putRepayment', repayment });
    const free = (todo: StoredTodo) => !!todo.createdAt && inFreeEdit(todo.createdAt, new Date());
    const record = (todo: StoredTodo, kind: Repayment['kind']) => {
      const at = now();
      const rec = settle(todo, kind, today, Crypto.randomUUID());
      putTodo({ ...todo, status: kind, updatedAt: at });
      putRepayment({ ...rec, updatedAt: at, deletedAt: null });
      // 사용 기록에는 금액과 일수만 남긴다. 제목은 남기지 않는다 (FR-053, NFR-009)
      if (kind === 'repaid') {
        track('repay', { on_time: rec.overdueDays === 0, overdue_days: rec.overdueDays, interest: rec.interest, streak: account.streak });
      } else {
        track('forgive', { overdue_days: rec.overdueDays, interest: rec.interest });
      }
      return rec.id;
    };
    // 반복하는 할 일을 끝내거나 포기하면 다음 할 일을 새로 만든다 (FR-111). 같은 원금이 다시 걸린다
    const spawnNext = (todo: StoredTodo) => {
      if (!todo.repeat) return;
      const at = now();
      putTodo({
        id: Crypto.randomUUID(),
        title: todo.title,
        importance: todo.importance,
        dueDate: nextDue(todo.dueDate, todo.repeat, today),
        status: 'open',
        updatedAt: at,
        deletedAt: null,
        createdAt: at,
        stakeGroupId: todo.stakeGroupId ?? null,
        repeat: todo.repeat,
        repeatFrom: todo.id,
      });
    };
    const feeFor = (todo: StoredTodo, input: TodoInput) => {
      if (free(todo)) return 0;
      const days = diffDays(todo.dueDate, input.dueDate);
      return days > 0 ? extendFee(principalOf(todo.importance), days) : 0;
    };
    const refundFor = (todo: StoredTodo) => {
      const v = viewOf(todo, today);
      if (free(todo)) return v.principal;
      return v.overdueDays > 0 ? -v.interest : earlyForgiveRefund(v.principal);
    };
    const repayments = visible(state.repayments);
    const purchases = visible(state.purchases);
    const owned = ownedCodes(purchases.map((p) => p.itemCode));
    // 예전 화면용 잔고: 지금 쓸 수 있는 냥
    const spendable = account.state === 'normal' && account.netWorth >= 0 ? Math.max(account.cash, 0) : 0;
    const wallet: Wallet = { balance: spendable, streak: account.streak, toNextBonus: account.toNextBonus, earned: 0, spent: 0, ledger: [] };
    return {
      hydrated: state.hydrated,
      todos: visible(state.todos),
      repayments,
      purchases,
      account,
      wallet,
      owned,
      nextBankProgress,
      lastActivity: lastActivityOf([...state.todos, ...state.repayments, ...state.purchases]),
      today,
      pendingCount,
      syncState,
      add: (input, stakeGroupId = null) => {
        const id = Crypto.randomUUID();
        const at = now();
        putTodo({ id, ...input, repeat: input.repeat ?? null, title: input.title.trim(), status: 'open', updatedAt: at, deletedAt: null, createdAt: at, stakeGroupId });
        track('todo_create', { importance: input.importance, days_until_due: daysUntilDue(input.dueDate, today), group: !!stakeGroupId, negative: account.cash < principalOf(input.importance) });
        return id;
      },
      extendFeeFor: (id, input) => {
        const todo = find(id);
        return todo ? feeFor(todo, input) : 0;
      },
      update: (id, input) => {
        const todo = find(id);
        if (!todo) return 0;
        const fee = feeFor(todo, input);
        const at = now();
        if (fee > 0) {
          const days = diffDays(todo.dueDate, input.dueDate);
          dispatch({
            type: 'putEvent',
            event: { id: Crypto.randomUUID(), kind: 'extend', todoId: id, days, amount: fee, happenedOn: today, updatedAt: at, deletedAt: null },
          });
          track('extend', { days, fee });
        }
        putTodo({ ...todo, ...input, repeat: input.repeat === undefined ? todo.repeat : input.repeat, title: input.title.trim(), updatedAt: at });
        return fee;
      },
      repay: (id) => {
        const todo = find(id);
        if (!todo) return null;
        const repaymentId = record(todo, 'repaid');
        spawnNext(todo);
        return repaymentId;
      },
      undoRepay: (id) => {
        const todo = find(id);
        if (!todo) return;
        const at = now();
        putTodo({ ...todo, status: 'open', updatedAt: at });
        // 끝내서 새로 생긴 다음 반복 할 일도 지운다
        for (const t of state.todos) {
          if (t.repeatFrom === id && t.status === 'open' && !t.deletedAt) putTodo({ ...t, updatedAt: at, deletedAt: at });
        }
        track('repay_undo');
        for (const r of state.repayments) {
          if (r.todoId === id && !r.deletedAt) putRepayment({ ...r, updatedAt: at, deletedAt: at });
        }
      },
      removeRefundFor: (id) => {
        const todo = find(id);
        return todo ? refundFor(todo) : 0;
      },
      remove: (id) => {
        const todo = find(id);
        if (!todo) return false;
        // 등록 후 1시간 안: 실수 취소. 원금을 모두 돌려받는다
        if (free(todo)) {
          const at = now();
          putTodo({ ...todo, updatedAt: at, deletedAt: at });
          return false;
        }
        record(todo, 'forgiven');
        spawnNext(todo);
        return true;
      },
      settlementFor: (r) => {
        const groupId = state.todos.find((t) => t.id === r.todoId)?.stakeGroupId ?? null;
        return settlementOf(r, groupId, verified, today);
      },
      declareBankruptcy: () => {
        if (account.state === 'bankrupt') return;
        dispatch({ type: 'putEvent', event: bankruptcyEvent(Crypto.randomUUID(), today, now()) });
        track('bankrupt', { auto: false });
      },
      buyAll: (itemCodes) => {
        const items = itemCodes.map(itemOf);
        // 은행은 조건을 따로 봐야 해서 한꺼번에 사지 않는다
        if (items.some((i) => !i || i.slot === 'bank')) return false;
        const total = items.reduce((s, i) => s + i!.price, 0);
        if (total > wallet.balance) return false;
        // 잔고는 합계로 확인했으니 하나씩은 잠김·이미 가짐만 본다
        if (!itemCodes.every((c) => canBuy(c, Number.MAX_SAFE_INTEGER, owned).ok)) return false;
        const at = now();
        for (const item of items) {
          dispatch({
            type: 'putPurchase',
            purchase: { id: Crypto.randomUUID(), itemCode: item!.code, price: item!.price, purchasedOn: today, updatedAt: at, deletedAt: null },
          });
          track('item_buy', { item_code: item!.code, price: item!.price });
        }
        return true;
      },
      buy: (itemCode) => {
        const item = itemOf(itemCode);
        const conditionMet = item?.slot !== 'bank' || !!nextBankProgress?.done;
        if (!item || !canBuy(itemCode, wallet.balance, owned, conditionMet).ok) return false;
        const at = now();
        dispatch({
          type: 'putPurchase',
          purchase: { id: Crypto.randomUUID(), itemCode, price: item.price, purchasedOn: today, updatedAt: at, deletedAt: null },
        });
        track('item_buy', { item_code: itemCode, price: item.price });
        return true;
      },
      clearLocal: async () => {
        if (userId) await AsyncStorage.removeItem(storageKey(userId)).catch((e) => console.warn('지우지 못했어요', e));
        dispatch({ type: 'reset' });
      },
      flush: sync,
    };
  }, [state, account, nextBankProgress, today, pendingCount, syncState, userId, verified, sync]);

  return <TodosContext.Provider value={store}>{children}</TodosContext.Provider>;
}

export function useTodos(): Store {
  const store = useContext(TodosContext);
  if (!store) throw new Error('TodosProvider 안에서만 쓸 수 있어요');
  return store;
}
