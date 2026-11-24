import { toUtcMs, type DateString } from './dates';
import type { Repayment } from './records';
import { isOnTime } from './wallet';

/**
 * 요일 분석 (FR-111, 읍내 금고 혜택). 끝낸 기록을 기한 요일별로 모아 기한 안에 끝낸 비율을 본다.
 * 포기한 일도 "못 지킨 일"로 센다. 한 요일에 2건은 있어야 잘함·못함을 고른다.
 */

export const WEEKDAY_BANK_STAGE = 4;
const MIN_COUNT = 2;
/** 월요일부터 */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export type DayStat = { day: number; name: string; total: number; onTime: number; rate: number | null };
export type WeekdayReport = { days: DayStat[]; best: DayStat | null; worst: DayStat | null; total: number };

export function weekdayReport(todos: { id: string; dueDate: DateString }[], repayments: Repayment[]): WeekdayReport {
  const due = new Map(todos.map((t) => [t.id, t.dueDate]));
  const acc = new Map<number, { total: number; onTime: number }>();
  let total = 0;
  for (const r of repayments) {
    const d = due.get(r.todoId);
    if (!d) continue;
    const day = new Date(toUtcMs(d)).getUTCDay();
    const a = acc.get(day) ?? { total: 0, onTime: 0 };
    a.total += 1;
    if (isOnTime(r)) a.onTime += 1;
    acc.set(day, a);
    total += 1;
  }
  const days: DayStat[] = WEEK_ORDER.map((day) => {
    const a = acc.get(day) ?? { total: 0, onTime: 0 };
    return { day, name: NAMES[day], total: a.total, onTime: a.onTime, rate: a.total ? a.onTime / a.total : null };
  });
  const counted = days.filter((d) => d.total >= MIN_COUNT && d.rate !== null);
  const best = counted.length ? [...counted].sort((a, b) => b.rate! - a.rate! || b.total - a.total)[0] : null;
  const worstPick = counted.length ? [...counted].sort((a, b) => a.rate! - b.rate! || b.total - a.total)[0] : null;
  // 모든 요일이 같으면 못하는 요일은 없다
  const worst = worstPick && best && worstPick.rate! < best.rate! ? worstPick : null;
  return { days, best, worst, total };
}

export function weekdayLine(report: WeekdayReport): string {
  if (report.total < 5) return '끝낸 일이 5개를 넘으면 요일별로 보여 드려요.';
  if (report.best && report.worst) return `${report.best.name}요일엔 잘 지키고, ${report.worst.name}요일에 자주 미뤄요.`;
  if (report.best) return `${report.best.name}요일에 가장 잘 지켜요.`;
  return '요일마다 2개 넘게 끝내면 잘 지키는 요일을 알려 드려요.';
}
