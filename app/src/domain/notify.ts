import { addDays, type DateString } from './dates';
import { debtFor, formatAmount, principalOf, type Todo } from './interest';

/**
 * 알림 계획. 어떤 알림을 언제 띄울지 계산만 한다. 실제 예약은 lib/notifications.ts가 한다.
 * (FR-030, FR-031, 화면설계서 5절)
 */

export type NotifyKind = 'due' | 'interest';

export type PlannedNotification = {
  /** 같은 알림을 구분하는 값. `{할 일 ID}:{종류}` */
  key: string;
  todoId: string;
  kind: NotifyKind;
  date: DateString;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

/** iOS는 예약 알림을 64건까지만 보관한다. 여유를 두고 가까운 것부터 60건만 건다. */
export const MAX_SCHEDULED = 60;

export type Clock = { date: DateString; minutes: number };
export type TimeOfDay = { hour: number; minute: number };

/**
 * 미완료 할 일마다 기한 당일 알림과 이자 발생(기한 다음 날) 알림을 만든다.
 * 이미 지난 시각의 알림은 만들지 않는다. 상환·삭제한 할 일은 목록에 없으므로 자연히 빠진다.
 */
export function planNotifications(todos: Todo[], now: Clock, time: TimeOfDay): PlannedNotification[] {
  const at = time.hour * 60 + time.minute;
  const isFuture = (date: DateString) => date > now.date || (date === now.date && at > now.minutes);
  const planned: PlannedNotification[] = [];

  for (const todo of todos) {
    if (todo.status !== 'open') continue;
    const base = { todoId: todo.id, hour: time.hour, minute: time.minute };

    if (isFuture(todo.dueDate)) {
      planned.push({
        ...base,
        key: `${todo.id}:due`,
        kind: 'due',
        date: todo.dueDate,
        title: '오늘까지예요',
        body: `"${todo.title}" 오늘을 넘기면 이자가 붙어요.`,
      });
    }

    const firstOverdueDay = addDays(todo.dueDate, 1);
    if (isFuture(firstOverdueDay)) {
      planned.push({
        ...base,
        key: `${todo.id}:interest`,
        kind: 'interest',
        date: firstOverdueDay,
        title: '이자가 붙기 시작했어요',
        body: `"${todo.title}" 지금 ${formatAmount(debtFor(principalOf(todo.importance), 1))}냥이에요.`,
      });
    }
  }

  return planned
    .sort((a, b) => (a.date === b.date ? a.key.localeCompare(b.key) : a.date < b.date ? -1 : 1))
    .slice(0, MAX_SCHEDULED);
}
