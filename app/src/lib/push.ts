import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * 친구 알림 푸시. (그룹기획서 9절)
 * 기기의 Expo 푸시 토큰을 서버에 저장해 두면, 친구가 인증을 올리거나 투표했을 때 서버가 보낸다.
 * 웹과 시뮬레이터는 푸시를 받을 수 없어서 아무 일도 하지 않는다.
 * 안드로이드 Expo Go는 SDK 53부터 푸시를 받지 못한다(개발용 빌드에서만 된다).
 */

export const FRIENDS_CHANNEL_ID = 'friends';

/** 이 기기에서 마지막으로 서버에 저장한 토큰. 로그아웃할 때 지운다 */
let savedToken: string | null = null;

async function ensureFriendsChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(FRIENDS_CHANNEL_ID, {
    name: '친구 인증 알림',
    importance: AndroidImportance.DEFAULT,
  });
}

/** 알림 권한이 있을 때 이 기기 토큰을 서버에 저장한다. 실패해도 앱은 그대로 쓴다 */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  try {
    await ensureFriendsChannel();
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token === savedToken) return;
    const { error } = await supabase.rpc('save_push_token', { p_token: token });
    if (error) throw error;
    savedToken = token;
  } catch (e) {
    console.warn('푸시 알림을 켜지 못했어요', e);
  }
}

/** 로그아웃 전에 부른다. 이 기기로 다른 사람 알림이 오지 않게 한다 */
export async function forgetPushToken(): Promise<void> {
  if (!savedToken) return;
  const token = savedToken;
  savedToken = null;
  const { error } = await supabase.rpc('drop_push_token', { p_token: token });
  if (error) console.warn('푸시 토큰을 지우지 못했어요', error.message);
}

export type PushKind = 'proof' | 'vote' | 'join';

/** 서버에 알림을 보내 달라고 한다. 받을 사람과 문구는 서버가 정하고, 같은 일로 두 번 보내지 않는다. 결과를 기다리지 않는다 */
export function sendPush(kind: PushKind, id: string): void {
  supabase.functions.invoke('push-notify', { body: { kind, id } }).then(({ error }) => {
    if (error) console.warn('알림을 보내지 못했어요', error.message);
  });
}
