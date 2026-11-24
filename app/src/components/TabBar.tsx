import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color, font, radius, stroke, themed, type } from '@/theme/tokens';

/** 탭 이름(라우트) → 표시 이름과 아이콘. 피그마 TabBar 56:1931 */
const TABS: Record<string, { label: string; icon: (c: string) => React.ReactNode }> = {
  index: {
    label: '할 일',
    icon: (c) => (
      <>
        <Rect x={4} y={3} width={16} height={18} rx={3} stroke={c} strokeWidth={2} />
        <Path d="M8 9l2 2 4-4M8 16h8" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  standing: {
    label: '순위',
    icon: (c) => <Path d="M5 20V12M12 20V5M19 20v-5" stroke={c} strokeWidth={2.4} strokeLinecap="round" />,
  },
  groups: {
    label: '그룹',
    icon: (c) => (
      <>
        <Circle cx={9} cy={9} r={3.5} stroke={c} strokeWidth={2} />
        <Circle cx={16.5} cy={10} r={2.5} stroke={c} strokeWidth={2} />
        <Path d="M3 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5M15 15c2.6-.4 4.8.9 5.6 3.5" stroke={c} strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  shop: {
    label: '상점',
    icon: (c) => (
      <>
        <Path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z" stroke={c} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M9 10V6.5a3 3 0 0 1 6 0V10" stroke={c} strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
};

/** 아래 탭 4개: 할 일, 순위, 그룹, 상점 */
/** blocked: 지금 들어갈 수 없는 탭과 그 까닭. 누르면 옮기지 않고 onBlocked로 알린다 (상점 잠김) */
export function TabBar({
  state,
  navigateToTab,
  insets,
  badges,
  blocked,
  onBlocked,
}: BottomTabBarProps & { badges?: Record<string, number>; blocked?: Record<string, string>; onBlocked?: (reason: string) => void }) {
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
    <View style={styles.bar} accessibilityRole="tablist">
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        const tint = focused ? color.tabOnText : color.tabOff;
        const badge = badges?.[route.name] ?? 0;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge ? `${tab.label}. 새 소식 ${badge}개` : tab.label}
            onPress={() => {
              const reason = blocked?.[route.name];
              if (reason && !focused) onBlocked?.(reason);
              else if (!focused) navigateToTab(route.key);
            }}
            style={[styles.item, focused && styles.itemOn]}>
            <View>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                {tab.icon(tint)}
              </Svg>
              {badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[type.caption, { color: tint, fontFamily: focused ? font.bold : font.regular }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
    </View>
  );
}

const styles = themed(() => ({
  // 피그마 v6: 화면 아래에 떠 있는 어두운 막대, 고른 칸은 둥근 바탕 (TabBar 106:33)
  wrap: { paddingHorizontal: 16, paddingTop: 6, backgroundColor: color.bgPage },
  bar: {
    flexDirection: 'row',
    padding: 6,
    gap: 4,
    borderRadius: Math.min(radius.xl, 28),
    backgroundColor: color.tabBar,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: Math.min(radius.lg, 22) },
  itemOn: { backgroundColor: color.tabOn },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: color.debtFg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: color.textOnPrimary, fontSize: 11, lineHeight: 14, fontFamily: font.bold },
}));
