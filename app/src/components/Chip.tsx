import { Pressable, Text } from 'react-native';

import { color, radius, stroke, themed, type } from '@/theme/tokens';

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
        selected ? styles.on : styles.off,
        disabled && styles.disabled,
      ]}>
      <Text style={[type.label, { color: selected ? color.textOnPrimary : color.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = themed(() => ({
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
  // 외곽선 없는 테마에서는 카드 바탕과 구분되게 한 단계 짙게
  off: { backgroundColor: stroke.outline === 0 ? color.bgSunken : color.bgSurface, borderColor: color.borderDefault },
  disabled: { opacity: 0.45 },
}));
