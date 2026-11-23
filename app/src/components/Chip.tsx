import { Pressable, StyleSheet, Text } from 'react-native';

import { color, hardShadow, radius, stroke, type } from '@/theme/tokens';

type Props = { label: string; selected: boolean; onPress: () => void; grow?: boolean; a11yLabel?: string; disabled?: boolean };

/** 여러 개 중 하나를 고르는 칩. */
export function Chip({ label, selected, onPress, grow, a11yLabel, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ selected, disabled: !!disabled }}
      style={[
        styles.chip,
        grow && styles.grow,
        selected ? [styles.on, hardShadow(2)] : styles.off,
        disabled && styles.disabled,
      ]}>
      <Text style={[type.label, { color: selected ? color.textOnPrimary : color.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 48,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: stroke.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1, paddingHorizontal: 0 },
  on: { backgroundColor: color.brandPrimary, borderColor: color.inkOutline },
  off: { backgroundColor: color.bgSurface, borderColor: color.borderDefault },
  disabled: { opacity: 0.45 },
});
