import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { toDateString } from '@/domain/dates';
import { shouldLogOpen } from '@/domain/events';
import { flush, track } from '@/lib/events';

import { useAuth } from './auth';

const OPEN_KEY = (userId: string) => `todo-interest/last-open/${userId}`;
// 시작할 때와 앱이 앞으로 올 때 확인이 동시에 돌면 두 번 남을 수 있어서, 처리 중인 날을 기억해 둔다
const checking = new Set<string>();

/**
 * 하루에 한 번 app_open을 남기고, 쌓인 사용 기록을 올린다. (FR-053)
 * 화면에 그리는 것은 없다.
 */
export function UsageTracker() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    const opened = async () => {
      const today = toDateString(new Date());
      const key = `${userId}:${today}`;
      if (!checking.has(key)) {
        checking.add(key);
        try {
          const last = await AsyncStorage.getItem(OPEN_KEY(userId));
          if (shouldLogOpen(last, today)) {
            track('app_open');
            await AsyncStorage.setItem(OPEN_KEY(userId), today);
          }
        } catch {
          // 기록을 못 남겨도 앱은 그대로 쓴다
        }
      }
      // 쌓인 기록은 앱이 앞으로 올 때마다 올린다
      flush().catch(() => {});
    };
    opened();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') opened();
    });
    return () => sub.remove();
  }, [userId]);

  return null;
}
