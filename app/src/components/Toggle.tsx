import { Pressable, View } from 'react-native';

import { color, radius, stroke, themed } from '@/theme/tokens';

type Props = { value: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean };

/** 켬·끔 스위치. 색 외에 손잡이 위치로도 상태를 구분한다. */
export function Toggle({ value, onChange, label, disabled }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      hitSlop={8}
      style={[styles.track, value ? styles.trackOn : styles.trackOff, disabled && styles.disabled]}>
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = themed(() => ({
  track: {
    width: 52,
    height: 32,
    borderRadius: radius.full,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  trackOn: { backgroundColor: color.brandPrimary },
  trackOff: { backgroundColor: color.bgSunken },
  knob: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: color.bgSurface,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
  },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },
  disabled: { opacity: 0.45 },
}));
