import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Snackbar } from '@/components/Snackbar';
import { TabBar } from '@/components/TabBar';
import { shopLockReason } from '@/domain/savings';
import { useGroups } from '@/store/groups';
import { useTodos } from '@/store/todos';
import { color } from '@/theme/tokens';

const TOAST_MS = 3000;

/**
 * 아래 탭 4개: 할 일, 순위, 그룹, 상점. 그룹 탭에는 새 인증 수를 단다. 피그마 TabBar 56:1931
 * 빚이 있거나 파산 중이면 상점 탭에 들어가지 않고 까닭을 토스트로 알린다 (시간적금기획서 4.6)
 */
export default function TabsLayout() {
  const { groups } = useGroups();
  const { account, today } = useTodos();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newProofs = groups.reduce((s, g) => s + g.newProofs, 0);

  const bankrupt = account.state === 'bankrupt' && account.rehabOn;
  const shopLock = shopLockReason(account, today);

  const show = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(text);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bgPage } }}
        tabBar={(props) => (
          <TabBar {...props} badges={{ groups: newProofs }} blocked={shopLock ? { shop: shopLock } : undefined} onBlocked={show} />
        )}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="standing" />
        <Tabs.Screen name="groups" />
        <Tabs.Screen name="shop" />
      </Tabs>
      {toast ? (
        <View style={[styles.toast, { bottom: Math.max(insets.bottom, 10) + 72 }]} pointerEvents="box-none">
          <Snackbar
            text={toast}
            actionLabel={bankrupt ? '자세히' : '빚 보기'}
            onAction={() => {
              setToast(null);
              router.push('/bankrupt');
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: { position: 'absolute', left: 16, right: 16 },
});
