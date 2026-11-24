import { Text, View } from 'react-native';

import { gradeOf, type GradeTone } from '@/domain/credit';
import { color, live, radius, themed, type } from '@/theme/tokens';

/** 등급 색 다섯 가지. 색만으로 구분하지 않도록 늘 등급 글자를 함께 쓴다 (NFR-008) */
export const GRADE_TONE: Record<GradeTone, { fg: string; bg: string }> = live(() => ({
  gold: { fg: color.accentCoinDeep, bg: color.mascotCream },
  good: { fg: color.okFg, bg: color.okBg },
  // BBB·BB는 테마와 상관없이 파랑 (2026-11-24 사용자 결정)
  info: { fg: '#2F6FD6', bg: '#E3EEFF' },
  warn: { fg: color.accentCheek, bg: color.mascotCream },
  bad: { fg: color.debtFg, bg: color.debtBg },
}));

type Props = { score: number; size?: 's' | 'm' | 'l' };

/** 신용 등급 글자(AAA~D). (FR-098) */
export function GradeBadge({ score, size = 'm' }: Props) {
  const g = gradeOf(score);
  const t = GRADE_TONE[g.tone];
  const text = size === 'l' ? type.title : size === 's' ? type.caption : type.label;
  return (
    <View
      style={[styles.badge, size === 'l' && styles.large, size === 's' && styles.small, { backgroundColor: t.bg, borderColor: t.fg }]}
      accessible
      accessibilityLabel={`신용 ${g.code}등급`}>
      <Text style={[text, styles.text, { color: t.fg }]}>{g.code}</Text>
    </View>
  );
}

const styles = themed(() => ({
  badge: { alignSelf: 'flex-start', minWidth: 40, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1.5 },
  large: { minWidth: 64, paddingHorizontal: 12, paddingVertical: 4 },
  small: { minWidth: 32, paddingHorizontal: 6, paddingVertical: 0 },
  text: { fontFamily: type.stamp.fontFamily },
}));
