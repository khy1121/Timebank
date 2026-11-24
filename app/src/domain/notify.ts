import { addDays, diffDays, type DateString } from './dates';
import { debtFor, formatAmount, nextDayInterest, principalOf, type Todo } from './interest';
import { rewardFor } from './wallet';

/**
 * 알림 계획. 어떤 알림을 언제 띄울지 계산만 한다. 실제 예약은 lib/notifications.ts가 한다.
 * (FR-030, FR-031, 화면설계서 5절, 시간적금기획서 13절)
 * - 기한 당일: 오늘 끝내면 돌려받는 냥
 * - 연체 1~7일째 매일, 그 뒤 10·14·21일째: 원금에서 깎인 냥과 지금 끝내면 돌려받는 냥
 * - 같은 날 연체된 할 일이 여럿이면 한 번에 묶는다
 * - 은행 혜택(FR-111): 엽전 가판대부터 기한 전날 알림과, 기한 당일 저녁에 한 번 더(하루 두 번)
 */

export type NotifyKind = 'due' | 'dueEve' | 'dueLate' | 'overdue' | 'overdueDigest';

/** 은행 혜택으로 더 받는 알림 */
export type NotifyExtras = { dueEve: boolean; twice: boolean };
/** 하루 두 번째 알림 시각. 첫 알림이 이보다 늦으면 두 번째는 걸지 않는다 */
export const SECOND_ALERT: TimeOfDay = { hour: 21, minute: 0 };

export type PlannedNotification = {
  /** 같은 알림을 구분하는 값 */
  key: string;
  /** 누르면 열 할 일. 묶음 알림은 가장 많이 깎이는 할 일 */
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

/** 연체 며칠째에 알릴지 */
export const OVERDUE_ALERT_DAYS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 21] as const;
/** 이날 알림은 "내일이면 원금을 다 잃어요" (1.1^8 > 2 이므로 8일째에 연체료가 원금을 넘는다) */
export const LAST_WARNING_DAY = 7;

export type Clock = { date: DateString; minutes: number };
export type TimeOfDay = { hour: number; minute: number };

const won = (n: number) => `${formatAmount(n)}냥`;

/** 연체 d일째의 한 할 일 알림 문구 */
export function overdueMessage(title: string, principal: number, days: number): { title: string; body: string } {
  const fee = debtFor(principal, days) - principal;
  const back = principal - fee;
  if (days === LAST_WARNING_DAY) {
    return { title: '내일이면 원금을 다 잃어요', body: `"${title}" 지금 끝내면 ${won(back)}은 건져요.` };
  }
  if (back < 0) {
    return { title: `연체 ${days}일째`, body: `"${title}" 원금을 다 잃고 ${won(-back)}이 통장에서 빠지고 있어요.` };
  }
  return { title: `연체 ${days}일째`, body: `"${title}" 원금 ${won(principal)} 중 ${won(fee)}이 깎였어요. 오늘 끝내면 ${won(back)} 돌려받아요.` };
}

export function planNotifications(todos: Todo[], now: Clock, time: TimeOfDay, extras: NotifyExtras = { dueEve: false, twice: false }): PlannedNotification[] {
  const at = time.hour * 60 + time.minute;
  const isFuture = (date: DateString) => date > now.date || (date === now.date && at > now.minutes);
  const second = SECOND_ALERT.hour * 60 + SECOND_ALERT.minute;
  const isFutureAt = (date: DateString, minutes: number) => date > now.date || (date === now.date && minutes > now.minutes);
  const base = { hour: time.hour, minute: time.minute };
  const planned: PlannedNotification[] = [];
  // 날짜별 연체 할 일
  const overdueByDate = new Map<DateString, { todo: Todo; days: number; principal: number }[]>();

  for (const todo of todos) {
    if (todo.status !== 'open') continue;
    const principal = principalOf(todo.importance);

    if (isFuture(todo.dueDate)) {
      planned.push({
        ...base,
        key: `${todo.id}:due`,
        todoId: todo.id,
        kind: 'due',
        date: todo.dueDate,
        title: '오늘까지예요',
        body: `"${todo.title}" 오늘 끝내면 ${won(principal + rewardFor(principal))}을 돌려받아요. 넘기면 원금이 깎여요.`,
      });
    }

    const eve = addDays(todo.dueDate, -1);
    if (extras.dueEve && isFuture(eve)) {
      planned.push({ ...base, key: `${todo.id}:dueEve`, todoId: todo.id, kind: 'dueEve', date: eve, title: '내일까지예요', body: `"${todo.title}" 내일이 기한이에요. 오늘 미리 끝내 둘까요?` });
    }
    if (extras.twice && second > at && isFutureAt(todo.dueDate, second)) {
      planned.push({
        ...SECOND_ALERT,
        key: `${todo.id}:dueLate`,
        todoId: todo.id,
        kind: 'dueLate',
        date: todo.dueDate,
        title: '오늘 자정까지예요',
        body: `"${todo.title}" 아직 남았어요. 자정이 지나면 원금이 깎여요.`,
      });
    }

    for (const days of OVERDUE_ALERT_DAYS) {
      const date = addDays(todo.dueDate, days);
      if (!isFuture(date)) continue;
      const list = overdueByDate.get(date) ?? [];
      list.push({ todo, days, principal });
      overdueByDate.set(date, list);
    }
  }

  for (const [date, list] of overdueByDate) {
    if (list.length === 1) {
      const { todo, days, principal } = list[0];
      planned.push({ ...base, key: `${todo.id}:overdue:${days}`, todoId: todo.id, kind: 'overdue', date, ...overdueMessage(todo.title, principal, days) });
      continue;
    }
    // 그날 연체 중인 할 일 전부(알림 날짜가 아닌 것도 포함)로 하루에 깎이는 냥을 센다
    const all = todos.filter((t) => t.status === 'open' && diffDays(t.dueDate, date) > 0);
    const perDay = all.reduce((s, t) => s + nextDayInterest(principalOf(t.importance), diffDays(t.dueDate, date)), 0);
    const worst = [...list].sort((a, b) => b.days - a.days || a.todo.id.localeCompare(b.todo.id))[0];
    planned.push({
      ...base,
      key: `${date}:overdue`,
      todoId: worst.todo.id,
      kind: 'overdueDigest',
      date,
      title: `연체 ${all.length}건`,
      body: `오늘도 ${won(perDay)}씩 깎이는 중이에요. 하나라도 끝내 볼까요?`,
    });
  }

  return planned
    .sort((a, b) => (a.date === b.date ? a.key.localeCompare(b.key) : a.date < b.date ? -1 : 1))
    .slice(0, MAX_SCHEDULED);
}
