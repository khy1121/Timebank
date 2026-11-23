import { Pressable, StyleSheet, Text } from 'react-native';

import { color, radius, stroke, type } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'kakao';

/** pressed: 누르고 있는 동안의 바탕색 */
const STYLE = {
  primary: { face: color.brandPrimary, pressed: color.brandPressed, fg: color.textOnPrimary, outlined: false },
  secondary: { face: color.bgSurface, pressed: color.bgSunken, fg: color.inkOutline, outlined: true },
  danger: { face: color.debtFg, pressed: color.debtPressed, fg: color.textOnPrimary, outlined: false },
  kakao: { face: color.kakaoYellow, pressed: color.kakaoYellowPressed, fg: color.kakaoLabel, outlined: false },
} as const;

type Props = { label: string; onPress?: () => void; variant?: Variant; disabled?: boolean };

/**
 * 버튼. 테두리는 네 면이 같은 두께이고, 누르면 바탕색이 짙어진다. (디자인방향 8.2: 그림자·바닥 두께를 쓰지 않는다)
 * 한 화면에 primary는 하나만 쓴다.
 */
export function Button({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const s = STYLE[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.face,
        { backgroundColor: disabled ? color.bgSunken : pressed ? s.pressed : s.face },
        (s.outlined || disabled) && { borderWidth: stroke.outline, borderColor: disabled ? color.borderDefault : color.inkOutline },
      ]}>
      <Text style={[type.headline, { color: disabled ? color.textTertiary : s.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { alignSelf: 'stretch', height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
