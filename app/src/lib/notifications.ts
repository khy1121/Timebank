import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedNotification } from '@/domain/notify';

/**
 * 기기 알림 연결. 서버를 거치지 않고 기기 안에서 예약한다. (FR-030~033)
 * 웹은 예약 알림을 지원하지 않아서 아무 일도 하지 않는다.
 */

export type NotifyPermission = 'unsupported' | 'undetermined' | 'granted' | 'denied';

export const notificationsSupported = Platform.OS !== 'web';

const CHANNEL_ID = 'reminders';

if (notificationsSupported) {
  // 앱을 보고 있을 때도 알림을 띄운다
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function toPermission(status: { granted: boolean; canAskAgain: boolean; status: string }): NotifyPermission {
  if (status.granted) return 'granted';
  return status.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function getNotifyPermission(): Promise<NotifyPermission> {
  if (!notificationsSupported) return 'unsupported';
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (!notificationsSupported) return 'unsupported';
  return toPermission(await Notifications.requestPermissionsAsync());
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '기한과 이자 알림',
    importance: AndroidImportance.DEFAULT,
  });
}

// 예약을 바꾸는 작업이 겹치면 지운 뒤에 예전 것이 다시 걸릴 수 있어서 한 줄로 세운다
let queue: Promise<void> = Promise.resolve();
const enqueue = (job: () => Promise<void>) => {
  queue = queue.then(job).catch((e) => console.warn('알림 예약을 바꾸지 못했어요', e));
  return queue;
};

/** 예약된 알림을 전부 지우고 계획대로 다시 건다. */
export function replaceScheduled(plan: PlannedNotification[]): Promise<void> {
  if (!notificationsSupported) return Promise.resolve();
  return enqueue(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (plan.length === 0) return;
    await ensureChannel();
    for (const item of plan) {
      const [year, month, day] = item.date.split('-').map(Number);
      await Notifications.scheduleNotificationAsync({
        identifier: item.key,
        content: { title: item.title, body: item.body, data: { todoId: item.todoId } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(year, month - 1, day, item.hour, item.minute),
          channelId: CHANNEL_ID,
        },
      });
    }
  });
}

export function cancelAllScheduled(): Promise<void> {
  return replaceScheduled([]);
}

/**
 * 알림을 눌렀을 때 해당 할 일의 ID를 넘긴다. 앱이 꺼진 상태에서 눌러 켠 경우도 포함한다.
 * 돌려주는 함수를 부르면 듣기를 멈춘다.
 */
export type NotificationTarget = { todoId: string } | { groupId: string } | { friends: true };

/** 할 일 알림은 todoId, 친구 알림(푸시)은 groupId를 담고 온다 */
export function onNotificationTap(handler: (target: NotificationTarget) => void): () => void {
  if (!notificationsSupported) return () => {};
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    if (typeof data?.todoId === 'string') handler({ todoId: data.todoId });
    else if (typeof data?.groupId === 'string') handler({ groupId: data.groupId });
    else if (data?.friends === true) handler({ friends: true });
  };
  handle(Notifications.getLastNotificationResponse());
  Notifications.clearLastNotificationResponse();
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
