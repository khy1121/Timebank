import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Supabase 연결. 공개용 키만 쓴다. 관리자 키는 앱에 넣지 않는다. (NFR-004)
 * 설정은 Supabase의 Expo React Native 안내를 따랐다.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseConfigured = url.length > 0 && publishableKey.length > 0;

export const supabase = createClient(url || 'http://localhost', publishableKey || 'missing', {
  auth: {
    // 웹은 브라우저 저장소를 그대로 쓰고, 기기에서는 AsyncStorage에 로그인 상태를 보관한다 (FR-002)
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    // 웹에서는 카카오 로그인 뒤 돌아온 주소에서 로그인 정보를 읽는다. 기기에서는 직접 처리한다.
    detectSessionInUrl: Platform.OS === 'web',
    lock: processLock,
  },
});

// 앱이 앞에 있을 때만 로그인 토큰을 자동으로 갱신한다. 한 번만 등록해야 한다.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
