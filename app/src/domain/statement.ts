import { addDays, type DateString } from './dates';
import type { Repayment } from './records';
import type { Entry } from './savings';
import { isOnTime } from './wallet';
import { weekdayReport, type WeekdayReport } from './weekday';

/**
 * 월간 명세서 (FR-111, 중앙은행 혜택). 지난달 성적표.
 * 모두에게 줄지는 미결(상점기획서 11.6절 미결 8)이라 열리는 단계를 STATEMENT_BANK_STAGE 하나로 정한다.
 */

export const STATEMENT_BANK_STAGE = 6;

const EARN_KINDS = new Set(['interest', 'bonus', 'group', 'boost', 'payout']);

export type Statement = {
  /** 'YYYY-MM' */
  month: string;
  label: string;
  done: number;
  onTime: number;
  late: number;
  forgiven: number;
  /** 기한 안 비율 0~1. 끝낸 일이 없으면 null */
  onTimeRate: number | null;
  earned: number;
  /** 그달 첫 주말과 마지막 주말 신용 점수. 모르면 null */
  creditFrom: number | null;
  creditTo: number | null;
  weekday: WeekdayReport;
};

/** 오늘 기준 지난달 'YYYY-MM' */
export function lastMonth(today: DateString): string {
  const [y, m] = today.split('-').map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, '0')}`;
}

function monthRange(month: string): { from: DateString; to: DateString } {
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const nextFirst = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { from, to: addDays(nextFirst, -1) };
}

export function statementOf(
  month: string,
  todos: { id: string; dueDate: DateString }[],
  repayments: Repayment[],
  ledger: Entry[],
  weeks: { weekEnd: DateString; score: number }[],
): Statement {
  const { from, to } = monthRange(month);
  const inMonth = (d: DateString) => d >= from && d <= to;
  const rs = repayments.filter((r) => inMonth(r.settledOn));
  const repaid = rs.filter((r) => r.kind === 'repaid');
  const onTime = rs.filter(isOnTime).length;
  const late = repaid.length - onTime;
  const forgiven = rs.filter((r) => r.kind === 'forgiven').length;
  const earned = ledger.filter((e) => EARN_KINDS.has(e.kind) && e.amount > 0 && inMonth(e.date)).reduce((s, e) => s + e.amount, 0);
  const ws = weeks.filter((w) => inMonth(w.weekEnd));
  const [y, m] = month.split('-').map(Number);
  return {
    month,
    label: `${y}년 ${m}월`,
    done: repaid.length,
    onTime,
    late,
    forgiven,
    onTimeRate: rs.length ? onTime / rs.length : null,
    earned,
    creditFrom: ws.length ? ws[0].score : null,
    creditTo: ws.length ? ws[ws.length - 1].score : null,
    weekday: weekdayReport(todos, rs),
  };
}

/** 공유하는 한 덩어리 글 */
export function statementText(s: Statement): string {
  const lines = [
    `[할일통장] ${s.label} 명세서`,
    `끝낸 일 ${s.done}건 (기한 안 ${s.onTime}건${s.late ? `, 늦게 ${s.late}건` : ''}${s.forgiven ? `, 포기 ${s.forgiven}건` : ''})`,
    `번 냥 ${s.earned.toLocaleString('ko-KR')}냥`,
  ];
  if (s.creditFrom !== null && s.creditTo !== null) {
    const d = s.creditTo - s.creditFrom;
    lines.push(`신용 점수 ${s.creditFrom} → ${s.creditTo} (${d >= 0 ? '+' : '−'}${Math.abs(d)})`);
  }
  if (s.weekday.best) lines.push(`가장 잘 지킨 요일: ${s.weekday.best.name}요일`);
  return lines.join('\n');
}
