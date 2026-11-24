import { diffDays, type DateString } from './dates';

/**
 * 사용 기록. (FR-053, 코드정의서 2.7)
 * 할 일 제목처럼 사람이 쓴 글은 절대 넣지 않는다. 숫자와 정해진 코드만 넣는다. (NFR-009)
 */

export type EventName =
  | 'app_open'
  | 'todo_create'
  | 'repay'
  | 'repay_undo'
  | 'forgive'
  | 'notify_toggle'
  | 'push_friends_toggle'
  | 'item_buy'
  | 'nameplate_set'
  | 'bundle_add'
  | 'statement_share'
  | 'standing_view'
  | 'voice_change'
  | 'closet_try'
  | 'group_create'
  | 'group_join'
  | 'group_leave'
  | 'proof_post'
  | 'proof_vote'
  | 'proof_report'
  | 'extend'
  | 'bankrupt'
  | 'friend_request'
  | 'friend_accept'
  | 'friend_remove'
  | 'kakao_friends_find';

export type EventProps = Record<string, string | number | boolean>;

export type QueuedEvent = { event: EventName; props: EventProps; ts: string };

/** 한 번에 올리는 최대 개수 */
export const FLUSH_BATCH = 50;
/** 기기에 쌓아 두는 최대 개수. 넘치면 오래된 것부터 버린다 */
export const QUEUE_LIMIT = 500;

const ALLOWED_KEYS: Record<EventName, string[]> = {
  app_open: [],
  todo_create: ['importance', 'days_until_due', 'group', 'negative'],
  repay: ['on_time', 'overdue_days', 'interest', 'streak'],
  repay_undo: [],
  forgive: ['overdue_days', 'interest'],
  notify_toggle: ['enabled'],
  push_friends_toggle: ['enabled'],
  item_buy: ['item_code', 'price'],
  nameplate_set: ['nameplate'],
  bundle_add: ['count'],
  statement_share: ['month'],
  standing_view: ['status', 'rank', 'participants'],
  voice_change: ['voice'],
  closet_try: ['item_code', 'owned'],
  group_create: [],
  group_join: [],
  group_leave: [],
  proof_post: ['group_count', 'on_time'],
  proof_vote: ['vote'],
  proof_report: ['reason'],
  extend: ['days', 'fee'],
  bankrupt: ['auto'],
  friend_request: ['via', 'result'],
  friend_accept: [],
  friend_remove: [],
  kakao_friends_find: ['count'],
};

/** 정해진 키만 남기고, 글자 값은 짧게 자른다. 제목 같은 것이 섞여 들어가지 않게 한다 */
export function sanitize(event: EventName, props: EventProps = {}): EventProps {
  const out: EventProps = {};
  for (const key of ALLOWED_KEYS[event]) {
    const v = props[key];
    if (v === undefined) continue;
    out[key] = typeof v === 'string' ? v.slice(0, 40) : v;
  }
  return out;
}

export function enqueue(queue: QueuedEvent[], item: QueuedEvent): QueuedEvent[] {
  const next = [...queue, item];
  return next.length > QUEUE_LIMIT ? next.slice(next.length - QUEUE_LIMIT) : next;
}

/** 오늘 앱을 처음 열었을 때만 app_open을 남긴다 */
export function shouldLogOpen(lastOpenDate: DateString | null, today: DateString): boolean {
  return lastOpenDate === null || diffDays(lastOpenDate, today) > 0;
}

export function daysUntilDue(dueDate: DateString, today: DateString): number {
  return diffDays(today, dueDate);
}
