/** 시각이 없는 날짜. 'YYYY-MM-DD' 형식. 기기 현지 날짜를 그대로 쓴다. */
export type DateString = string;

const MS_PER_DAY = 86_400_000;

function toUtcMs(date: DateString): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 기기의 현지 날짜를 DateString으로 만든다. */
export function toDateString(date: Date): DateString {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** b - a (일). 같은 날이면 0. */
export function diffDays(a: DateString, b: DateString): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / MS_PER_DAY);
}

export function addDays(date: DateString, days: number): DateString {
  const t = new Date(toUtcMs(date) + days * MS_PER_DAY);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, '0');
  const d = String(t.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function weekdayLabel(date: DateString): string {
  return WEEKDAYS[new Date(toUtcMs(date)).getUTCDay()];
}

export function dayOfMonth(date: DateString): number {
  return Number(date.split('-')[2]);
}

/** "11월 20일 (금)" */
export function formatKoreanDate(date: DateString): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일 (${weekdayLabel(date)})`;
}
