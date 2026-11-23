import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, stroke, type } from '@/theme/tokens';

type Props = { label: string; selected: boolean; onPress: () => void };

/** 여러 줄 중 하나를 고르는 선택지. 고른 줄은 색과 동그라미 안의 점으로 구분한다. */
export function OptionRow({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.row, selected ? styles.on : styles.off]}>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.dot} /> : null}</View>
      <Text style={[type.body, styles.label]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
  },
  on: { backgroundColor: color.brandSoft, borderColor: color.inkOutline },
  off: { backgroundColor: color.bgSurface, borderColor: color.borderDefault },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: stroke.outline,
    borderColor: color.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bgSurface,
  },
  radioOn: { borderColor: color.inkOutline },
  dot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: color.brandPrimary },
  label: { color: color.textPrimary },
});
