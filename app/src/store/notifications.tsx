import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { planNotifications } from '@/domain/notify';
import { parseTime } from '@/domain/profile';
import {
  cancelAllScheduled,
  getNotifyPermission,
  onNotificationTap,
  replaceScheduled,
  requestNotifyPermission,
  type NotifyPermission,
} from '@/lib/notifications';

import { registerPushToken } from '@/lib/push';

import { useAuth } from './auth';
import { useGroups } from './groups';
import { useProfile } from './profile';
import { useTodos } from './todos';

/**
 * 알림 예약을 할 일과 설정에 맞춰 둔다. (FR-030~033)
 * 할 일이나 알림 설정이 바뀔 때마다 예약을 전부 지우고 다시 건다.
 */

type Store = {
  permission: NotifyPermission;
  /** 기기에 알림 권한을 묻는다. 이미 거부했으면 다시 묻지 못하고 'denied'가 돌아온다. */
  request: () => Promise<NotifyPermission>;
};

const NotificationsContext = createContext<Store | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { profile } = useProfile();
  const { todos, today, hydrated } = useTodos();
  const { groups } = useGroups();
  const askedForFriends = useRef(false);
  const [permission, setPermission] = useState<NotifyPermission>('undetermined');
  const asked = useRef(false);
  const signedIn = !!session;

  // 권한은 기기 설정에서 바뀔 수 있어서, 앱이 다시 앞으로 올 때마다 확인한다
  useEffect(() => {
    let active = true;
    const refresh = () =>
      getNotifyPermission()
        .then((next) => active && setPermission(next))
        .catch((e) => console.warn('알림 권한을 확인하지 못했어요', e));
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const request = useCallback(async () => {
    const next = await requestNotifyPermission();
    setPermission(next);
    return next;
  }, []);

  const openCount = todos.filter((t) => t.status === 'open').length;
  const enabled = profile?.notifyEnabled ?? false;

  // 첫 할 일을 등록한 직후 권한을 묻는다. 거부해도 앱은 그대로 쓸 수 있다. (FR-033)
  useEffect(() => {
    if (asked.current || !signedIn || !enabled || permission !== 'undetermined' || openCount === 0) return;
    asked.current = true;
    request().catch((e) => console.warn('알림 권한을 묻지 못했어요', e));
  }, [signedIn, enabled, permission, openCount, request]);

  // 그룹에 들어가 있는데 아직 권한을 물은 적이 없으면 친구 알림을 받으려고 묻는다
  const pushFriends = profile?.pushFriends ?? false;
  const inGroup = groups.length > 0;
  useEffect(() => {
    if (askedForFriends.current || !signedIn || !pushFriends || !inGroup || permission !== 'undetermined') return;
    askedForFriends.current = true;
    request().catch((e) => console.warn('알림 권한을 묻지 못했어요', e));
  }, [signedIn, pushFriends, inGroup, permission, request]);

  // 권한이 있으면 이 기기 토큰을 서버에 둔다. 받을지 말지는 서버가 설정(push_friends)을 보고 정한다
  useEffect(() => {
    if (signedIn && permission === 'granted') registerPushToken();
  }, [signedIn, permission]);

  // 할 일, 날짜, 알림 설정이 바뀌면 예약을 다시 건다. 끄거나 로그아웃하면 전부 취소한다. (FR-032)
  const notifyTime = profile?.notifyTime;
  useEffect(() => {
    if (permission === 'unsupported') return;
    if (!signedIn || !enabled || permission !== 'granted' || !notifyTime) {
      cancelAllScheduled();
      return;
    }
    if (!hydrated) return;
    const now = new Date();
    replaceScheduled(planNotifications(todos, { date: today, minutes: now.getHours() * 60 + now.getMinutes() }, parseTime(notifyTime)));
  }, [signedIn, enabled, permission, notifyTime, hydrated, todos, today]);

  // 알림을 누르면 할 일 알림은 그 할 일로, 그룹 알림은 그 그룹으로, 친구 신청 알림은 친구 화면으로 간다
  useEffect(() => {
    if (!signedIn) return;
    return onNotificationTap((target) => {
      if ('todoId' in target) router.push({ pathname: '/todo/[id]', params: { id: target.todoId } });
      else if ('groupId' in target) router.push({ pathname: '/group/[id]', params: { id: target.groupId } });
      else router.push('/friends');
    });
  }, [signedIn]);

  const store = useMemo<Store>(() => ({ permission, request }), [permission, request]);
  return <NotificationsContext.Provider value={store}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): Store {
  const store = useContext(NotificationsContext);
  if (!store) throw new Error('NotificationsProvider 안에서만 쓸 수 있어요');
  return store;
}
