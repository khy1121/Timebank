import { diffDays, type DateString } from './dates';
import { debtFor, isCapped, viewOf, type Importance, type Todo } from './interest';

/**
 * 상환·탕감 기록과 할 일 입력 규칙.
 * 지난 일의 금액은 다시 계산되지 않도록 처리 시점의 값을 그대로 남긴다. (데이터설계서 1절 원칙 2)
 */

export type RepaymentKind = 'repaid' | 'forgiven';

export type Repayment = {
  id: string;
  todoId: string;
  kind: RepaymentKind;
  /** 그 시점의 제목 사본 */
  title: string;
  principal: number;
  interest: number;
  overdueDays: number;
  settledOn: DateString;
};

/** 상환 또는 탕감 시점의 금액으로 기록을 만든다. (FR-014, FR-024) */
export function settle(todo: Todo, kind: RepaymentKind, today: DateString, id: string): Repayment {
  const v = viewOf(todo, today);
  return {
    id,
    todoId: todo.id,
    kind,
    title: todo.title,
    principal: v.principal,
    interest: v.interest,
    overdueDays: v.overdueDays,
    settledOn: today,
  };
}

export const TITLE_MAX = 100;

export type TodoInput = { title: string; importance: Importance; dueDate: DateString };
export type InputError = 'titleRequired' | 'titleTooLong' | 'dueInPast';

/**
 * 입력 검사. (FR-010)
 * original이 있으면 수정이다. 수정에서 기한을 그대로 두면 지난 날짜여도 허용한다.
 */
export function validateInput(input: TodoInput, today: DateString, original?: Todo): InputError[] {
  const errors: InputError[] = [];
  const title = input.title.trim();
  if (title.length === 0) errors.push('titleRequired');
  if (title.length > TITLE_MAX) errors.push('titleTooLong');
  const dueChanged = !original || original.dueDate !== input.dueDate;
  if (dueChanged && diffDays(today, input.dueDate) < 0) errors.push('dueInPast');
  return errors;
}

/** 이미 연체된 할 일은 기한을 바꿀 수 없다. 이자를 피하는 것을 막기 위해서다. (FR-011) */
export function canChangeDueDate(todo: Todo, today: DateString): boolean {
  return diffDays(todo.dueDate, today) <= 0;
}

export type InterestDay = {
  /** 연체 며칠째인지 */
  day: number;
  added: number;
  total: number;
  /** 아직 오지 않은 날(내일)의 예상값 */
  future: boolean;
};

const HISTORY_DAYS = 7;

/**
 * 날짜별로 이자가 어떻게 붙었는지. 최근 7일과 내일 예상값. (화면설계서 TI-SCR-05)
 * 상한에 닿았으면 내일 줄은 만들지 않는다.
 */
export function interestHistory(principal: number, overdueDays: number): InterestDay[] {
  if (overdueDays <= 0) return [];
  const rows: InterestDay[] = [];
  const from = Math.max(1, overdueDays - HISTORY_DAYS + 1);
  for (let day = from; day <= overdueDays; day++) {
    const before = day === 1 ? principal : debtFor(principal, day - 1);
    const total = debtFor(principal, day);
    rows.push({ day, added: total - before, total, future: false });
  }
  if (!isCapped(principal, overdueDays)) {
    const total = debtFor(principal, overdueDays + 1);
    rows.push({ day: overdueDays + 1, added: total - debtFor(principal, overdueDays), total, future: true });
  }
  return rows;
}

export type HistorySummary = { paidInterest: number; repaidCount: number; forgivenCount: number };

/** 낸 이자 합계와 건수. 탕감한 빚은 낸 이자에 넣지 않는다. (FR-016, FR-024) */
export function historySummary(records: Repayment[]): HistorySummary {
  return {
    paidInterest: records.filter((r) => r.kind === 'repaid').reduce((s, r) => s + r.interest, 0),
    repaidCount: records.filter((r) => r.kind === 'repaid').length,
    forgivenCount: records.filter((r) => r.kind === 'forgiven').length,
  };
}

export type MonthGroup = { key: string; label: string; records: Repayment[] };

/** 최근 순으로 정렬해 월별로 묶는다. */
export function groupByMonth(records: Repayment[], today: DateString): MonthGroup[] {
  const sorted = [...records].sort((a, b) => (a.settledOn < b.settledOn ? 1 : a.settledOn > b.settledOn ? -1 : 0));
  const thisYear = today.slice(0, 4);
  const groups: MonthGroup[] = [];
  for (const r of sorted) {
    const key = r.settledOn.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const [y, m] = key.split('-');
      g = { key, label: y === thisYear ? `${Number(m)}월` : `${y}년 ${Number(m)}월`, records: [] };
      groups.push(g);
    }
    g.records.push(r);
  }
  return groups;
}
