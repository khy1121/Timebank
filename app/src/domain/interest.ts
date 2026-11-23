import { addDays, diffDays, type DateString } from './dates';

/**
 * 이자 계산 규칙 (요구사항명세서 2.3, 데이터설계서 7절)
 * - 원금 = 중요도 × 1,000냥
 * - 기한 다음 날부터 하루 10% 복리. 부채 = 원금 × 1.1^연체일수, 냥 미만 버림
 * - 부채 상한은 원금의 10배
 * - 이자와 부채는 저장하지 않고 매번 계산한다
 */

export type Importance = 1 | 2 | 3 | 4 | 5;
export type TodoStatus = 'open' | 'repaid' | 'forgiven';

export type Todo = {
  id: string;
  title: string;
  importance: Importance;
  dueDate: DateString;
  status: TodoStatus;
};

export type TodoState = 'overdue' | 'today' | 'upcoming';

export const PRINCIPAL_PER_LEVEL = 1000;
export const CAP_MULTIPLIER = 10;
/** 1.1^25 > 10 이므로 연체 25일째부터는 항상 상한이다. */
const CAP_REACHED_AT_DAYS = 25;

export function principalOf(importance: Importance): number {
  return importance * PRINCIPAL_PER_LEVEL;
}

/** 연체 일수. 기한 당일까지는 0. (FR-021, FR-026) */
export function overdueDays(dueDate: DateString, today: DateString): number {
  return Math.max(0, diffDays(dueDate, today));
}

/**
 * 연체 n일째의 부채. 연체가 아니면 0. (FR-021, FR-022)
 * 소수 오차를 피하려고 정수로 계산한다: (원금 × 11^n) ÷ 10^n 의 몫.
 */
export function debtFor(principal: number, days: number): number {
  if (days <= 0) return 0;
  const cap = principal * CAP_MULTIPLIER;
  if (days >= CAP_REACHED_AT_DAYS) return cap;
  let numerator = BigInt(principal);
  let denominator = BigInt(1);
  const eleven = BigInt(11);
  const ten = BigInt(10);
  for (let i = 0; i < days; i++) {
    numerator *= eleven;
    denominator *= ten;
  }
  return Math.min(Number(numerator / denominator), cap);
}

/** 붙은 이자. 연체가 아니면 0. */
export function interestFor(principal: number, days: number): number {
  return days <= 0 ? 0 : debtFor(principal, days) - principal;
}

/** 내일 붙을 이자. 상한에 도달했으면 0. (FR-028) */
export function nextDayInterest(principal: number, days: number): number {
  const now = days <= 0 ? principal : debtFor(principal, days);
  return debtFor(principal, Math.max(days, 0) + 1) - now;
}

/** 상한 대비 현재 부채의 비율 0~1. (FR-028) */
export function capRatio(principal: number, days: number): number {
  if (days <= 0) return 0;
  return debtFor(principal, days) / (principal * CAP_MULTIPLIER);
}

export function isCapped(principal: number, days: number): boolean {
  return days > 0 && debtFor(principal, days) >= principal * CAP_MULTIPLIER;
}

/** 기한 상태. (FR-018) */
export function todoState(todo: Pick<Todo, 'dueDate'>, today: DateString): TodoState {
  const d = diffDays(todo.dueDate, today);
  if (d > 0) return 'overdue';
  if (d === 0) return 'today';
  return 'upcoming';
}

/** 미상환 이자 합계로 정하는 신용등급 1~10. 1등급이 가장 좋다. (FR-025, 화면설계서 6절) */
const GRADE_UPPER_BOUNDS = [1000, 3000, 6000, 10000, 20000, 35000, 60000, 100000] as const;

export function creditGrade(totalInterest: number): number {
  if (totalInterest <= 0) return 1;
  for (let i = 0; i < GRADE_UPPER_BOUNDS.length; i++) {
    if (totalInterest < GRADE_UPPER_BOUNDS[i]) return i + 2;
  }
  return 10;
}

export type GradeLevel = 'good' | 'warn' | 'bad';

/** 1~3 양호, 4~7 주의, 8~10 위험. (FR-029) */
export function gradeLevel(grade: number): GradeLevel {
  if (grade <= 3) return 'good';
  if (grade <= 7) return 'warn';
  return 'bad';
}

/** 게이지에 채울 칸 수. (FR-029) */
export function gaugeFilled(grade: number): number {
  return 11 - grade;
}

export type TodoView = {
  todo: Todo;
  state: TodoState;
  principal: number;
  /** 연체 일수 (연체가 아니면 0) */
  overdueDays: number;
  /** 기한까지 남은 일수 (연체·오늘이면 0) */
  daysLeft: number;
  /** 현재 부채 (연체가 아니면 0) */
  debt: number;
  interest: number;
  nextDayInterest: number;
  capRatio: number;
  capped: boolean;
};

export function viewOf(todo: Todo, today: DateString): TodoView {
  const principal = principalOf(todo.importance);
  const days = overdueDays(todo.dueDate, today);
  return {
    todo,
    state: todoState(todo, today),
    principal,
    overdueDays: days,
    daysLeft: Math.max(0, diffDays(today, todo.dueDate)),
    debt: debtFor(principal, days),
    interest: interestFor(principal, days),
    nextDayInterest: nextDayInterest(principal, days),
    capRatio: capRatio(principal, days),
    capped: isCapped(principal, days),
  };
}

const STATE_ORDER: Record<TodoState, number> = { overdue: 0, today: 1, upcoming: 2 };

/** 연체(부채 큰 순) → 오늘까지 → 예정(기한 가까운 순). (FR-013) */
export function sortViews(views: TodoView[]): TodoView[] {
  return [...views].sort((a, b) => {
    if (a.state !== b.state) return STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (a.state === 'overdue') return b.debt - a.debt;
    if (a.state === 'upcoming') return a.daysLeft - b.daysLeft;
    return b.principal - a.principal;
  });
}

export type Summary = {
  /** 연체된 할 일의 부채 합 (FR-023) */
  totalDebt: number;
  totalInterest: number;
  grade: number;
  /** 미완료 할 일을 모두 그대로 둘 때 7일 뒤의 총 부채 (FR-027). 미완료가 없으면 null */
  forecast7: number | null;
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
};

export const FORECAST_DAYS = 7;

export function summarize(todos: Todo[], today: DateString): Summary {
  const open = todos.filter((t) => t.status === 'open');
  const views = open.map((t) => viewOf(t, today));
  const totalDebt = views.reduce((s, v) => s + v.debt, 0);
  const totalInterest = views.reduce((s, v) => s + v.interest, 0);
  const later = addDays(today, FORECAST_DAYS);
  const forecast7 = open.length
    ? open.reduce((s, t) => s + debtFor(principalOf(t.importance), overdueDays(t.dueDate, later)), 0)
    : null;
  return {
    totalDebt,
    totalInterest,
    grade: creditGrade(totalInterest),
    forecast7,
    overdueCount: views.filter((v) => v.state === 'overdue').length,
    todayCount: views.filter((v) => v.state === 'today').length,
    upcomingCount: views.filter((v) => v.state === 'upcoming').length,
  };
}

export type WeekDot = 'overdue' | 'upcoming' | null;
export type WeekDay = { date: DateString; isToday: boolean; dot: WeekDot };

/** 오늘을 가운데 둔 7일과 기한 점. 오늘 이전 기한은 연체, 오늘 이후는 예정. (FR-017) */
export function weekDays(todos: Todo[], today: DateString): WeekDay[] {
  const dueDates = new Set(todos.filter((t) => t.status === 'open').map((t) => t.dueDate));
  const out: WeekDay[] = [];
  for (let offset = -3; offset <= 3; offset++) {
    const date = addDays(today, offset);
    const has = dueDates.has(date);
    out.push({ date, isToday: offset === 0, dot: has ? (offset < 0 ? 'overdue' : 'upcoming') : null });
  }
  return out;
}

/** 7일 뒤까지 날짜별 예상 총 부채. 홈의 작은 막대그래프용. */
export function forecastSeries(todos: Todo[], today: DateString, days = FORECAST_DAYS): number[] {
  const open = todos.filter((t) => t.status === 'open');
  const out: number[] = [];
  for (let i = 0; i <= days; i++) {
    const at = addDays(today, i);
    out.push(open.reduce((s, t) => s + debtFor(principalOf(t.importance), overdueDays(t.dueDate, at)), 0));
  }
  return out;
}

/** "3,993" — 천 단위 구분 기호. 단위 "냥"은 화면에서 따로 붙인다. */
export function formatAmount(n: number): string {
  return Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
