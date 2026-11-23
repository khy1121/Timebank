import { useFonts } from 'expo-font';
import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/store/auth';
import { GroupsProvider } from '@/store/groups';
import { NotificationsProvider } from '@/store/notifications';
import { ProfileProvider } from '@/store/profile';
import { StandingProvider } from '@/store/standing';
import { UsageTracker } from '@/store/usage';
import { TodosProvider } from '@/store/todos';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.ttf'),
    'Pretendard-Medium': require('@/assets/fonts/Pretendard-Medium.ttf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.ttf'),
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.ttf'),
    'Pretendard-ExtraBold': require('@/assets/fonts/Pretendard-ExtraBold.ttf'),
  });

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AuthProvider>
      <ProfileProvider>
        <GroupsProvider>
        <TodosProvider>
          <NotificationsProvider>
            <StandingProvider>
              <StatusBar style="dark" />
              <UsageTracker />
              <Screens />
            </StandingProvider>
          </NotificationsProvider>
        </TodosProvider>
        </GroupsProvider>
      </ProfileProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}

/** 로그인 여부에 따라 갈 수 있는 화면을 나눈다. (FR-001, FR-002) */
function Screens() {
  const { loading, session } = useAuth();
  const signedIn = !!session;

  useEffect(() => {
    if (!loading) SplashScreen.hide();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bgPage } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="shop" />
        <Stack.Screen name="closet" />
        <Stack.Screen name="standing" />
        <Stack.Screen name="status-guide" />
        <Stack.Screen name="groups" />
        <Stack.Screen name="group-new" />
        <Stack.Screen name="group-join" />
        <Stack.Screen name="todo/new" />
        <Stack.Screen name="todo/[id]" />
        <Stack.Screen name="todo-edit/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
      {/* 처리방침은 로그인 전후 모두 볼 수 있다 (FR-052) */}
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
