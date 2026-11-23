import type { Todo } from './interest';
import type { Repayment } from './records';
import type { Purchase } from './wallet';

/**
 * 기기와 서버 사이의 동기화 규칙. (FR-040~042, 데이터설계서 6절)
 * - 같은 행을 양쪽에서 고쳤으면 수정 시각(updatedAt)이 늦은 쪽을 따른다.
 * - 삭제는 삭제 시각(deletedAt)을 남기는 방식으로 한다. 다른 기기가 삭제 사실을 받아 가야 하기 때문이다.
 */

export type SyncMeta = { updatedAt: string; deletedAt: string | null };
export type StoredTodo = Todo & SyncMeta;
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
