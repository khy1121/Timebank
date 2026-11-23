import AsyncStorage from '@react-native-async-storage/async-storage';

import { enqueue, FLUSH_BATCH, sanitize, type EventName, type EventProps, type QueuedEvent } from '@/domain/events';

import { supabase } from './supabase';

/**
 * 사용 기록 보내기. (FR-053)
 * 기록은 먼저 기기에 쌓고, 로그인돼 있을 때 몇 초 모아서 한 번에 올린다. 못 올리면 다음에 다시 올린다.
 * 실패해도 앱 사용에는 영향이 없다.
 */

const KEY = 'todo-interest/events-queue';
let queue: QueuedEvent[] = [];
let loaded = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) queue = [...(JSON.parse(raw) as QueuedEvent[]), ...queue];
  } catch {
    // 읽지 못하면 빈 목록으로 시작한다
  }
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(queue)).catch(() => {});
}

export function track(event: EventName, props?: EventProps) {
  queue = enqueue(queue, { event, props: sanitize(event, props), ts: new Date().toISOString() });
  persist();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    flush().catch(() => {});
  }, 3000);
}

export async function flush(): Promise<void> {
  await load();
  if (flushing || queue.length === 0) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  flushing = true;
  try {
    while (queue.length) {
      const batch = queue.slice(0, FLUSH_BATCH);
      const { error } = await supabase.from('events').insert(batch.map((e) => ({ event: e.event, props: e.props, ts: e.ts })));
      if (error) {
        console.warn('사용 기록을 올리지 못했어요', error.message);
        break;
      }
      queue = queue.slice(batch.length);
      persist();
    }
  } finally {
    flushing = false;
  }
}

/** 로그아웃·계정 삭제 때 이 기기에 남은 기록을 버린다 */
export async function clearEvents() {
  queue = [];
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
