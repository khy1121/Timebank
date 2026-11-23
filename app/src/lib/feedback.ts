import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * 효과음과 진동. (FR-073)
 * - 효과음은 앱 안에서 합성한 짧은 소리다(assets/sounds). 무음 모드에서는 울리지 않는다.
 * - 웹에서는 진동이 없다.
 * - 켜고 끄는 설정은 이 기기에만 저장한다.
 */

export type Sound = 'wear' | 'takeoff' | 'coin' | 'tap' | 'deny';
export type Buzz = 'light' | 'medium' | 'success' | 'warning' | 'select';

const SOURCES: Record<Sound, number> = {
  wear: require('@/assets/sounds/wear.wav'),
  takeoff: require('@/assets/sounds/takeoff.wav'),
  coin: require('@/assets/sounds/coin.wav'),
  tap: require('@/assets/sounds/tap.wav'),
  deny: require('@/assets/sounds/deny.wav'),
};

const KEY = 'todo-interest/feedback';
export type FeedbackSettings = { sound: boolean; haptics: boolean };
let settings: FeedbackSettings = { sound: true, haptics: true };
const listeners = new Set<(s: FeedbackSettings) => void>();

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) setSettings({ ...settings, ...(JSON.parse(raw) as Partial<FeedbackSettings>) }, false);
  })
  .catch(() => {});

export function getSettings(): FeedbackSettings {
  return settings;
}

export function setSettings(next: FeedbackSettings, persist = true) {
  settings = next;
  listeners.forEach((l) => l(next));
  if (persist) AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((e) => console.warn('소리 설정을 저장하지 못했어요', e));
}

export function subscribe(listener: (s: FeedbackSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 소리마다 플레이어 하나를 만들어 두고 처음으로 되감아 다시 튼다
const players = new Map<Sound, AudioPlayer>();
let modeSet = false;

function player(name: Sound): AudioPlayer {
  let p = players.get(name);
  if (!p) {
    p = createAudioPlayer(SOURCES[name]);
    p.volume = 0.6;
    players.set(name, p);
  }
  return p;
}

export function play(name: Sound) {
  if (!settings.sound) return;
  try {
    if (!modeSet) {
      modeSet = true;
      // 무음 모드에서는 울리지 않고, 다른 앱의 음악을 끊지 않는다
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    const p = player(name);
    p.seekTo(0).catch(() => {});
    p.play();
  } catch (e) {
    console.warn('효과음을 틀지 못했어요', e);
  }
}

export function buzz(kind: Buzz) {
  if (!settings.haptics || Platform.OS === 'web') return;
  const run = {
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    select: () => Haptics.selectionAsync(),
  }[kind];
  run().catch(() => {});
}

/** 자주 쓰는 조합 */
export const feedback = {
  wear: () => {
    play('wear');
    buzz('light');
  },
  takeOff: () => {
    play('takeoff');
    buzz('select');
  },
  buy: () => {
    play('coin');
    buzz('success');
  },
  deny: () => {
    play('deny');
    buzz('warning');
  },
  tap: () => {
    play('tap');
    buzz('select');
  },
};
