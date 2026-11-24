import { Pressable, Text, View } from 'react-native';

import { formatAmount } from '@/domain/interest';
import { color, radius, stroke, themed, type } from '@/theme/tokens';

type Props = { balance: number; onPress: () => void };

/** 홈 상단의 냥 잔고. 누르면 상점으로 간다. (FR-060, FR-063) */
export function WalletChip({ balance, onPress }: Props) {
  const text = formatAmount(balance);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`잔고 ${text}냥, 상점 열기`}
      hitSlop={8}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <View style={styles.coin}>
        <View style={styles.hole} />
      </View>
      <Text style={[type.label, styles.amount]}>{text}</Text>
      <Text style={[type.caption, styles.unit]}>냥</Text>
    </Pressable>
  );
}

const styles = themed(() => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radius.full,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.mascotCream,
  },
  pressed: { opacity: 0.8 },
  coin: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.inkOutline,
    backgroundColor: color.accentCoin,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  hole: { width: 6, height: 6, borderRadius: 1, borderWidth: 1.5, borderColor: color.inkOutline, backgroundColor: color.mascotCream },
  amount: { color: color.textPrimary, fontFamily: type.numberM.fontFamily },
  unit: { color: color.textPrimary, opacity: 0.7 },
}));
