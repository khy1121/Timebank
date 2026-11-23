import { StyleSheet, Text, View } from 'react-native';

import { STATUS, type StatusCode, type Tone } from '@/domain/standing';
import { color, radius, type } from '@/theme/tokens';

export const TONE_COLOR: Record<Tone, { fg: string; bg: string }> = {
  good: { fg: color.okFg, bg: color.okBg },
  neutral: { fg: color.textSecondary, bg: color.bgSunken },
  warn: { fg: color.accentCoinDeep, bg: color.mascotCream },
  bad: { fg: color.debtFg, bg: color.debtBg },
};

type Props = { code: StatusCode; size?: 'm' | 'l' };

/** 이번 주 상태를 도장처럼 찍어 보여준다. 색과 글자로 함께 구분한다. (FR-066) */
export function StatusStamp({ code, size = 'm' }: Props) {
  const s = STATUS[code];
  const c = TONE_COLOR[s.tone];
  const big = size === 'l';
  return (
    <View
      style={[styles.outer, { borderColor: c.fg, backgroundColor: c.bg }, big && styles.outerL]}
      accessible
      accessibilityLabel={`이번 주 상태 ${s.label}`}>
      <View style={[styles.inner, { borderColor: c.fg }]}>
        <Text style={[big ? type.title : type.headline, styles.text, { color: c.fg }]} numberOfLines={1}>
          {s.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { borderWidth: 2.5, borderRadius: radius.sm, padding: 3, transform: [{ rotate: '-4deg' }], alignSelf: 'flex-start' },
  outerL: { padding: 4 },
  inner: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 3, paddingHorizontal: 10, paddingVertical: 2 },
  text: { fontFamily: type.stamp.fontFamily },
});
