import { View } from 'react-native';
import { Text } from '@/components/Text';

import { themeName, type GroupTheme } from '@/domain/groups';
import { color, live, radius, themed, type } from '@/theme/tokens';

/** 테마마다 글자색과 바탕색. 색만으로 구분하지 않도록 늘 이름을 함께 쓴다 (NFR-008) */
const TONE: Record<GroupTheme, { fg: string; bg: string }> = live(() => ({
  study: { fg: color.brandPrimary, bg: color.brandSoft },
  workout: { fg: color.okFg, bg: color.okBg },
  reading: { fg: color.accentCoinDeep, bg: color.mascotCream },
  cooking: { fg: color.accentCheek, bg: color.debtBg },
  habit: { fg: color.accentSprout, bg: color.okBg },
  work: { fg: color.textPrimary, bg: color.bgSunken },
  hobby: { fg: color.accentCheek, bg: color.mascotCream },
  etc: { fg: color.textSecondary, bg: color.bgSunken },
}));

/** 그룹 테마 표시 (시간적금기획서 11절) */
export function ThemeBadge({ theme, label }: { theme: GroupTheme; label?: string | null }) {
  const tone = TONE[theme];
  const name = themeName(theme, label);
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]} accessible accessibilityLabel={`테마 ${name}`}>
      <Text style={[type.caption, { color: tone.fg }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = themed(() => ({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, maxWidth: 120 },
}));
