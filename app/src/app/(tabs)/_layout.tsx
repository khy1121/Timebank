import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useGroups } from '@/store/groups';
import { color } from '@/theme/tokens';

/** 아래 탭 4개: 할 일, 순위, 그룹, 상점. 그룹 탭에는 새 인증 수를 단다. 피그마 TabBar 56:1931 */
export default function TabsLayout() {
  const { groups } = useGroups();
  const newProofs = groups.reduce((s, g) => s + g.newProofs, 0);
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bgPage } }}
      tabBar={(props) => <TabBar {...props} badges={{ groups: newProofs }} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="standing" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="shop" />
    </Tabs>
  );
}
