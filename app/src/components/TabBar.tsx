import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color, font, stroke, type } from '@/theme/tokens';

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
export function TabBar({ state, navigateToTab, insets, badges }: BottomTabBarProps & { badges?: Record<string, number> }) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        const tint = focused ? color.brandPrimary : color.textTertiary;
        const badge = badges?.[route.name] ?? 0;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge ? `${tab.label}. 새 소식 ${badge}개` : tab.label}
            onPress={() => {
              if (!focused) navigateToTab(route.key);
            }}
            style={styles.item}>
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
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    backgroundColor: color.bgSurface,
    borderTopWidth: stroke.outline,
    borderTopColor: color.inkOutline,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
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
});
