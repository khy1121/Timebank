import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { toDateString, type DateString } from '@/domain/dates';
import { todoState, type Todo } from '@/domain/interest';
import { settle, type Repayment, type TodoInput } from '@/domain/records';
import {
  isUuid,
  latestUpdatedAt,
  mergeRows,
  purchaseFromRow,
  purchaseToParams,
  repaymentFromRow,
  repaymentToParams,
  todoFromRow,
  todoToParams,
  visible,
  type PurchaseRow,
  type RepaymentRow,
  type StoredPurchase,
  type StoredRepayment,
  type StoredTodo,
  type TodoRow,
} from '@/domain/sync';
import { canBuy, itemOf, ownedCodes } from '@/domain/shop';
import { walletOf, type Purchase, type Wallet } from '@/domain/wallet';
import { daysUntilDue } from '@/domain/events';
import { track } from '@/lib/events';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';

/**
 * 할 일 저장소.
 * 화면은 항상 기기 안의 사본을 읽고, 서버 반영은 뒤에서 처리한다. (FR-040~042, NFR-005)
 * - 바꾼 행은 "보낼 목록"에 넣고, 서버에 올라가면 목록에서 뺀다.
 * - 서버에서는 마지막으로 받은 시각 이후에 바뀐 행만 받아 와 합친다.
 * - 저장은 계정마다 따로 한다.
 * - 상점 구매 기록도 같은 방식으로 맞춘다. 잔고는 저장하지 않고 상환·구매 기록에서 계산한다. (FR-060~063)
 */

const storageKey = (userId: string) => `todo-interest/v2/${userId}`;
const LEGACY_KEY = 'todo-interest/v1';

type Data = {
  todos: StoredTodo[];
  repayments: StoredRepayment[];
  purchases: StoredPurchase[];
  /** 아직 서버에 올리지 못한 행의 ID */
  pendingTodos: string[];
  pendingRepayments: string[];
  pendingPurchases: string[];
  lastPulled: { todos: string | null; repayments: string | null; purchases: string | null };
};

type State = Data & { hydrated: boolean };

const EMPTY: Data = {
  todos: [],
  repayments: [],
  purchases: [],
  pendingTodos: [],
  pendingRepayments: [],
  pendingPurchases: [],
  lastPulled: { todos: null, repayments: null, purchases: null },
};

type Stamp = { id: string; updatedAt: string };

type Action =
  | { type: 'hydrate'; data: Data }
  | { type: 'reset' }
  | { type: 'putTodo'; todo: StoredTodo }
  | { type: 'putRepayment'; repayment: StoredRepayment }
  | { type: 'putPurchase'; purchase: StoredPurchase }
  | { type: 'pushed'; todos: Stamp[]; repayments: Stamp[]; purchases: Stamp[] }
  | { type: 'pulled'; todos: StoredTodo[]; repayments: StoredRepayment[]; purchases: StoredPurchase[] };

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
    case 'pushed':
      return {
        ...state,
        pendingTodos: settlePending(state.pendingTodos, state.todos, action.todos),
        pendingRepayments: settlePending(state.pendingRepayments, state.repayments, action.repayments),
        pendingPurchases: settlePending(state.pendingPurchases, state.purchases, action.purchases),
      };
    case 'pulled':
      return {
        ...state,
        todos: mergeRows(state.todos, action.todos),
        repayments: mergeRows(state.repayments, action.repayments),
        purchases: mergeRows(state.purchases, action.purchases),
        lastPulled: {
          todos: latestUpdatedAt(action.todos, state.lastPulled.todos),
          repayments: latestUpdatedAt(action.repayments, state.lastPulled.repayments),
          purchases: latestUpdatedAt(action.purchases, state.lastPulled.purchases),
        },
      };
  }
}

function isData(v: unknown): v is Data {
  const d = v as Data | null;
  return !!d && Array.isArray(d.todos) && Array.isArray(d.repayments) && Array.isArray(d.pendingTodos);
}

/** 상점이 생기기 전에 저장한 사본에는 구매 기록 칸이 없다. 빈 칸으로 채운다. */
function withDefaults(d: Data): Data {
  return {
    ...d,
    purchases: d.purchases ?? [],
    pendingPurchases: d.pendingPurchases ?? [],
    lastPulled: { ...d.lastPulled, purchases: d.lastPulled?.purchases ?? null },
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
  todos: Todo[];
  repayments: Repayment[];
  purchases: Purchase[];
  /** 냥 잔고와 연속 기록 */
  wallet: Wallet;
  /** 기본 물건과 산 물건의 코드 */
  owned: Set<string>;
  /** 마지막으로 할 일·기록을 고친 날(기기 현지 날짜). 없으면 null. 잠수 판정에 쓴다 (FR-066) */
  lastActivity: DateString | null;
  today: DateString;
  /** 아직 서버에 올리지 못한 변경 수 */
  pendingCount: number;
  syncState: SyncState;
  add: (input: TodoInput) => string;
  update: (id: string, input: TodoInput) => void;
  /** 상환(완료). 그 시점의 금액을 기록한다. */
  repay: (id: string) => void;
  undoRepay: (id: string) => void;
  /** 삭제. 연체된 할 일이면 탕감으로 기록하고, 아니면 그냥 지운다. 탕감했으면 true. */
  remove: (id: string) => boolean;
  /** 상점 물건 사기. 잔고가 모자라거나 이미 가졌으면 false (FR-063) */
  buy: (itemCode: string) => boolean;
  /** 여러 개를 한 번에 산다. 합계가 잔고를 넘거나 하나라도 살 수 없으면 아무것도 사지 않는다 (FR-072) */
  buyAll: (itemCodes: string[]) => boolean;
  /** 이 기기에 저장된 사본을 지운다. 로그아웃할 때 쓴다. (FR-003) */
  clearLocal: () => Promise<void>;
};

const TodosContext = createContext<Store | null>(null);

const TODO_COLUMNS = 'id,title,importance,due_date,status,updated_at,deleted_at';
const REPAYMENT_COLUMNS = 'id,todo_id,kind,title,principal,interest,overdue_days,settled_on,updated_at,deleted_at';
const PURCHASE_COLUMNS = 'id,item_code,price,purchased_on,updated_at,deleted_at';

export function TodosProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const today = useToday();
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
      dispatch({ type: 'pushed', todos: pushedTodos, repayments: pushedRepayments, purchases: pushedPurchases });

      let todoQuery = supabase.from('todos').select(TODO_COLUMNS);
      if (snapshot.lastPulled.todos) todoQuery = todoQuery.gt('updated_at', snapshot.lastPulled.todos);
      let repaymentQuery = supabase.from('repayments').select(REPAYMENT_COLUMNS);
      if (snapshot.lastPulled.repayments) repaymentQuery = repaymentQuery.gt('updated_at', snapshot.lastPulled.repayments);
      let purchaseQuery = supabase.from('purchases').select(PURCHASE_COLUMNS);
      if (snapshot.lastPulled.purchases) purchaseQuery = purchaseQuery.gt('updated_at', snapshot.lastPulled.purchases);
      const [todosResult, repaymentsResult, purchasesResult] = await Promise.all([todoQuery, repaymentQuery, purchaseQuery]);
      if (todosResult.error || repaymentsResult.error || purchasesResult.error) {
        failed = true;
        console.warn(
          '서버에서 받아 오지 못했어요',
          todosResult.error?.message ?? repaymentsResult.error?.message ?? purchasesResult.error?.message,
        );
      } else {
        dispatch({
          type: 'pulled',
          todos: (todosResult.data as TodoRow[]).map(todoFromRow),
          repayments: (repaymentsResult.data as RepaymentRow[]).map(repaymentFromRow),
          purchases: (purchasesResult.data as PurchaseRow[]).map(purchaseFromRow),
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
  const pendingCount = state.pendingTodos.length + state.pendingRepayments.length + state.pendingPurchases.length;
  useEffect(() => {
    if (state.hydrated && userId) sync();
  }, [state.hydrated, userId, pendingCount, sync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, [sync]);

  const store = useMemo<Store>(() => {
    const now = () => new Date().toISOString();
    const find = (id: string) => state.todos.find((t) => t.id === id && !t.deletedAt);
    const putTodo = (todo: StoredTodo) => dispatch({ type: 'putTodo', todo });
    const putRepayment = (repayment: StoredRepayment) => dispatch({ type: 'putRepayment', repayment });
    const record = (todo: StoredTodo, kind: Repayment['kind']) => {
      const at = now();
      const rec = settle(todo, kind, today, Crypto.randomUUID());
      putTodo({ ...todo, status: kind, updatedAt: at });
      putRepayment({ ...rec, updatedAt: at, deletedAt: null });
      // 사용 기록에는 금액과 일수만 남긴다. 제목은 남기지 않는다 (FR-053, NFR-009)
      if (kind === 'repaid') {
        track('repay', { on_time: rec.overdueDays === 0, overdue_days: rec.overdueDays, interest: rec.interest, streak: walletOf(visible(state.repayments), visible(state.purchases)).streak });
      } else {
        track('forgive', { overdue_days: rec.overdueDays, interest: rec.interest });
      }
    };
    const repayments = visible(state.repayments);
    const purchases = visible(state.purchases);
    const wallet = walletOf(repayments, purchases);
    const owned = ownedCodes(purchases.map((p) => p.itemCode));
    return {
      hydrated: state.hydrated,
      todos: visible(state.todos),
      repayments,
      purchases,
      wallet,
      owned,
      lastActivity: lastActivityOf([...state.todos, ...state.repayments, ...state.purchases]),
      today,
      pendingCount,
      syncState,
      add: (input) => {
        const id = Crypto.randomUUID();
        putTodo({ id, ...input, title: input.title.trim(), status: 'open', updatedAt: now(), deletedAt: null });
        track('todo_create', { importance: input.importance, days_until_due: daysUntilDue(input.dueDate, today) });
        return id;
      },
      update: (id, input) => {
        const todo = find(id);
        if (todo) putTodo({ ...todo, ...input, title: input.title.trim(), updatedAt: now() });
      },
      repay: (id) => {
        const todo = find(id);
        if (todo) record(todo, 'repaid');
      },
      undoRepay: (id) => {
        const todo = find(id);
        if (!todo) return;
        const at = now();
        putTodo({ ...todo, status: 'open', updatedAt: at });
        track('repay_undo');
        for (const r of state.repayments) {
          if (r.todoId === id && !r.deletedAt) putRepayment({ ...r, updatedAt: at, deletedAt: at });
        }
      },
      remove: (id) => {
        const todo = find(id);
        if (!todo) return false;
        if (todoState(todo, today) === 'overdue') {
          record(todo, 'forgiven');
          return true;
        }
        const at = now();
        putTodo({ ...todo, updatedAt: at, deletedAt: at });
        return false;
      },
      buyAll: (itemCodes) => {
        const items = itemCodes.map(itemOf);
        if (items.some((i) => !i)) return false;
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
        if (!item || !canBuy(itemCode, wallet.balance, owned).ok) return false;
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
    };
  }, [state, today, pendingCount, syncState, userId]);

  return <TodosContext.Provider value={store}>{children}</TodosContext.Provider>;
}

export function useTodos(): Store {
  const store = useContext(TodosContext);
  if (!store) throw new Error('TodosProvider 안에서만 쓸 수 있어요');
  return store;
}
