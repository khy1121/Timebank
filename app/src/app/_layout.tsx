// 다른 코드보다 먼저 불러와야 시작할 때 난 오류도 잡힌다
import { Sentry } from '@/lib/sentry';
import { useFonts } from 'expo-font';
import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/store/auth';
import { CreditProvider } from '@/store/credit';
import { FriendsProvider } from '@/store/friends';
import { GroupsProvider } from '@/store/groups';
import { NotificationsProvider } from '@/store/notifications';
import { useLook } from '@/store/look';
import { ProfileProvider, useProfile } from '@/store/profile';
import { StandingProvider } from '@/store/standing';
import { UsageTracker } from '@/store/usage';
import { ThemeProvider, useTheme } from '@/store/theme';
import { TodosProvider } from '@/store/todos';
import { STARTUP_FONTS } from '@/theme/fonts';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(RootLayout);

function RootLayout() {
  // 기본 테마(말랑 저금통)와 Pretendard 글꼴. 다른 테마 글꼴은 그 테마를 고를 때 불러온다 (theme/fonts.ts)
  const [loaded, error] = useFonts(STARTUP_FONTS);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider>
    <AuthProvider>
      <ProfileProvider>
        <GroupsProvider>
        <FriendsProvider>
        <TodosProvider>
          <NotificationsProvider>
            <StandingProvider>
            <CreditProvider>
              <StatusBar style="dark" />
              <UsageTracker />
              <ThemeSync />
              <Screens />
            </CreditProvider>
            </StandingProvider>
          </NotificationsProvider>
        </TodosProvider>
        </FriendsProvider>
        </GroupsProvider>
      </ProfileProvider>
    </AuthProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * 상점·옷장에서 고른 테마(profiles.equipped.theme)를 앱에 적용한다 (FR-112).
 * 다른 기기에서 바꿨어도 설정을 받아 오면 따라간다. 테마를 바꾸면 화면을 다시 그리므로, 있던 화면으로 돌아간다.
 */
function ThemeSync() {
  const { profile } = useProfile();
  const look = useLook();
  const { theme, setTheme } = useTheme();
  const path = usePathname();
  const want = look.theme;
  useEffect(() => {
    // 설정을 아직 못 받았으면 기기에 저장된 테마를 그대로 쓴다
    if (!profile || want === theme) return;
    const back = path;
    setTheme(want).then((ok) => {
      if (ok && back && back !== '/') setTimeout(() => router.replace(back as never), 0);
    });
    // path는 바뀌는 순간의 화면만 기억하면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, want, theme, setTheme]);
  return null;
}

/** 로그인 여부에 따라 갈 수 있는 화면을 나눈다. (FR-001, FR-002) */
function Screens() {
  const { loading, session } = useAuth();
  const { version } = useTheme();
  const signedIn = !!session;

  useEffect(() => {
    if (!loading) SplashScreen.hide();
  }, [loading]);
  if (loading) return null;

  return (
    // 테마가 바뀌면 key가 바뀌어 화면을 새 색으로 다시 그린다
    <Stack key={version} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bgPage } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="closet" />
        <Stack.Screen name="credit" />
        <Stack.Screen name="grades" />
        <Stack.Screen name="bundles" />
        <Stack.Screen name="statement" />
        <Stack.Screen name="share-card" />
        <Stack.Screen name="group-new" />
        <Stack.Screen name="group-join" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="group-settings/[id]" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="friend/[id]" />
        <Stack.Screen name="proof" options={{ presentation: 'modal' }} />
        <Stack.Screen name="bankrupt" options={{ presentation: 'modal' }} />
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
