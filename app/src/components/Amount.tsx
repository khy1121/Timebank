import { StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '@/domain/interest';
import { color, type } from '@/theme/tokens';

type Size = 'XL' | 'L' | 'M';
type Tone = 'ink' | 'debt' | 'onBrand' | 'muted';

const NUMBER = { XL: type.numberXL, L: type.numberL, M: type.numberM } as const;
const UNIT = { XL: type.unitL, L: type.unitM, M: type.unitS } as const;
const TONE = {
  ink: color.textPrimary,
  debt: color.debtFg,
  onBrand: color.textOnPrimary,
  muted: color.textTertiary,
} as const;

type Props = { value: number; size?: Size; tone?: Tone; prefix?: string };

/** 금액. 숫자는 크게, 단위 "냥"은 작게 쓴다. */
export function Amount({ value, size = 'M', tone = 'ink', prefix }: Props) {
  const text = `${prefix ?? ''}${formatAmount(value)}`;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${text}냥`}>
      <Text style={[NUMBER[size], { color: TONE[tone] }]}>{text}</Text>
      <Text style={[UNIT[size], styles.unit, { color: TONE[tone] }]}>냥</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  unit: { opacity: 0.65 },
});
