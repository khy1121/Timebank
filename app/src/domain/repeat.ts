import { addDays, type DateString } from './dates';

/**
 * 반복 할 일 (FR-111, 시장 지점 혜택). 반복하는 할 일을 끝내면(늦게 끝내거나 포기해도) 다음 할 일이 새로 생긴다.
 * 같은 원금이 다시 걸리고, 다음 기한은 원래 기한에서 하루(매일)·7일(매주) 뒤다. 원래 기한이 이미 지났으면 오늘부터 센다.
 */

export type Repeat = 'daily' | 'weekly';

export const REPEAT_LABEL: Record<Repeat, string> = { daily: '매일', weekly: '매주' };

/** 반복을 쓸 수 있는 은행 단계 (시장 지점) */
export const REPEAT_BANK_STAGE = 3;

export function toRepeat(value: string | null | undefined): Repeat | null {
  return value === 'daily' || value === 'weekly' ? value : null;
}

export function nextDue(due: DateString, repeat: Repeat, today: DateString): DateString {
  const base = due >= today ? due : today;
  return addDays(base, repeat === 'daily' ? 1 : 7);
}
