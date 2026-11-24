import { toRepeat, type Repeat } from './repeat';
import type { DateString } from './dates';
import type { Todo } from './interest';
import type { Repayment } from './records';
import type { Bankruptcy, Extension, PotPayout } from './savings';
import type { Purchase } from './wallet';

/**
 * 기기와 서버 사이의 동기화 규칙. (FR-040~042, 데이터설계서 6절)
 * - 같은 행을 양쪽에서 고쳤으면 수정 시각(updatedAt)이 늦은 쪽을 따른다.
 * - 삭제는 삭제 시각(deletedAt)을 남기는 방식으로 한다. 다른 기기가 삭제 사실을 받아 가야 하기 때문이다.
 */

export type SyncMeta = { updatedAt: string; deletedAt: string | null };
/**
 * createdAt: 기기에서 등록한 시각(1시간 무료 수정, 원금을 건 날). 예전 사본에는 없을 수 있다.
 * stakeGroupId: 그룹 보증금으로 걸었으면 그 그룹 (시간적금기획서 4.7)
 */
export type StoredTodo = Todo & SyncMeta & { createdAt?: string; stakeGroupId?: string | null; repeat?: Repeat | null; repeatFrom?: string | null };
export type StoredRepayment = Repayment & SyncMeta;
export type StoredPurchase = Purchase & SyncMeta;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 서버의 ID는 UUID다. 개발 중에 쓰던 예시 ID 같은 것은 서버에 올릴 수 없다. */
export function isUuid(id: string): boolean {
  return UUID.test(id);
}

/**
 * 서버에서 받은 행을 기기의 행에 합친다. 수정 시각이 더 늦은 쪽이 이긴다.
 * 같으면 기기 쪽을 그대로 둔다.
 */
export function mergeRows<T extends { id: string } & SyncMeta>(local: T[], remote: T[]): T[] {
  const byId = new Map(local.map((row) => [row.id, row]));
  for (const row of remote) {
    const mine = byId.get(row.id);
    if (!mine || Date.parse(row.updatedAt) > Date.parse(mine.updatedAt)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

/** 받은 행들 중 가장 늦은 수정 시각. 다음에는 이 시각 이후 것만 받는다. */
export function latestUpdatedAt(rows: SyncMeta[], fallback: string | null): string | null {
  let latest = fallback;
  for (const row of rows) {
    if (!latest || Date.parse(row.updatedAt) > Date.parse(latest)) latest = row.updatedAt;
  }
  return latest;
}

/** 화면에 보여줄 행만 남긴다. */
export function visible<T extends SyncMeta>(rows: T[]): T[] {
  return rows.filter((row) => !row.deletedAt);
}

// ---------------------------------------------------------------------------
// 서버 행과 기기 행 사이의 변환
// ---------------------------------------------------------------------------

export type TodoRow = {
  id: string;
  title: string;
  importance: number;
  due_date: string;
  status: string;
  updated_at: string;
  deleted_at: string | null;
  created_at?: string | null;
  stake_group_id?: string | null;
  repeat?: string | null;
  repeat_from?: string | null;
};

export type RepaymentRow = {
  id: string;
  todo_id: string;
  kind: string;
  title: string;
  principal: number;
  interest: number;
  overdue_days: number;
  settled_on: string;
  updated_at: string;
  deleted_at: string | null;
};

export function todoFromRow(row: TodoRow): StoredTodo {
  return {
    id: row.id,
    title: row.title,
    importance: row.importance as Todo['importance'],
    dueDate: row.due_date,
    status: row.status as Todo['status'],
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    stakeGroupId: row.stake_group_id ?? null,
    repeat: toRepeat(row.repeat),
    repeatFrom: row.repeat_from ?? null,
  };
}

/** upsert_todo 함수에 넘길 값 */
export function todoToParams(todo: StoredTodo) {
  return {
    p_id: todo.id,
    p_title: todo.title,
    p_importance: todo.importance,
    p_due_date: todo.dueDate,
    p_status: todo.status,
    p_updated_at: todo.updatedAt,
    p_deleted_at: todo.deletedAt,
    p_created_at: todo.createdAt ?? null,
    p_stake_group_id: todo.stakeGroupId ?? null,
    p_repeat: todo.repeat ?? null,
    p_repeat_from: todo.repeatFrom ?? null,
  };
}

export function repaymentFromRow(row: RepaymentRow): StoredRepayment {
  return {
    id: row.id,
    todoId: row.todo_id,
    kind: row.kind as Repayment['kind'],
    title: row.title,
    principal: row.principal,
    interest: row.interest,
    overdueDays: row.overdue_days,
    settledOn: row.settled_on,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** upsert_repayment 함수에 넘길 값 */
export function repaymentToParams(r: StoredRepayment) {
  return {
    p_id: r.id,
    p_todo_id: r.todoId,
    p_kind: r.kind,
    p_title: r.title,
    p_principal: r.principal,
    p_interest: r.interest,
    p_overdue_days: r.overdueDays,
    p_settled_on: r.settledOn,
    p_updated_at: r.updatedAt,
    p_deleted_at: r.deletedAt,
  };
}

export type PurchaseRow = {
  id: string;
  item_code: string;
  price: number;
  purchased_on: string;
  updated_at: string;
  deleted_at: string | null;
};

export function purchaseFromRow(row: PurchaseRow): StoredPurchase {
  return {
    id: row.id,
    itemCode: row.item_code,
    price: row.price,
    purchasedOn: row.purchased_on,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** upsert_purchase 함수에 넘길 값 */
export function purchaseToParams(p: StoredPurchase) {
  return {
    p_id: p.id,
    p_item_code: p.itemCode,
    p_price: p.price,
    p_purchased_on: p.purchasedOn,
    p_updated_at: p.updatedAt,
    p_deleted_at: p.deletedAt,
  };
}

// ---------------------------------------------------------------------------
// 장부 사건: 기한 연장, 파산, 금고 배당 (시간적금기획서 4.3, 4.6, 4.7)
// ---------------------------------------------------------------------------

export type LedgerEventKind = 'extend' | 'bankrupt' | 'payout';

export type LedgerEvent = {
  id: string;
  kind: LedgerEventKind;
  /** extend: 미룬 할 일 */
  todoId: string | null;
  /** extend: 미룬 날 수 */
  days: number | null;
  /** extend: 수수료, payout: 받은 냥 (모두 양수) */
  amount: number;
  happenedOn: DateString;
};
export type StoredLedgerEvent = LedgerEvent & SyncMeta;

export type LedgerEventRow = {
  id: string;
  kind: string;
  todo_id: string | null;
  days: number | null;
  amount: number;
  happened_on: string;
  updated_at: string;
  deleted_at: string | null;
};

export function ledgerEventFromRow(row: LedgerEventRow): StoredLedgerEvent {
  return {
    id: row.id,
    kind: row.kind as LedgerEventKind,
    todoId: row.todo_id,
    days: row.days,
    amount: row.amount,
    happenedOn: row.happened_on,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** upsert_ledger_event 함수에 넘길 값. 금고 배당은 서버만 넣으므로 올리지 않는다 */
export function ledgerEventToParams(e: StoredLedgerEvent) {
  return {
    p_id: e.id,
    p_kind: e.kind,
    p_todo_id: e.todoId,
    p_days: e.days,
    p_amount: e.amount,
    p_happened_on: e.happenedOn,
    p_updated_at: e.updatedAt,
    p_deleted_at: e.deletedAt,
  };
}

/** 장부 사건을 계산에 쓰는 세 가지로 나눈다 */
export function splitLedgerEvents(events: LedgerEvent[]): { extensions: Extension[]; bankruptcies: Bankruptcy[]; payouts: PotPayout[] } {
  const extensions: Extension[] = [];
  const bankruptcies: Bankruptcy[] = [];
  const payouts: PotPayout[] = [];
  for (const e of events) {
    if (e.kind === 'extend' && e.todoId && e.days) extensions.push({ id: e.id, todoId: e.todoId, days: e.days, fee: e.amount, on: e.happenedOn });
    else if (e.kind === 'bankrupt') bankruptcies.push({ id: e.id, on: e.happenedOn });
    else if (e.kind === 'payout') payouts.push({ id: e.id, amount: e.amount, on: e.happenedOn });
  }
  return { extensions, bankruptcies, payouts };
}
