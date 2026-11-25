import { Pressable } from 'react-native';
import { Text } from '@/components/Text';

import { color, hardShadow, live, radius, stroke, themed, type } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'kakao';

/** pressed: 누르고 있는 동안의 바탕색 */
const STYLE = live(() => ({
  primary: { face: color.brandPrimary, pressed: color.brandPressed, fg: color.textOnPrimary, outlined: false },
  // 외곽선이 없는 테마(말랑 저금통)에서는 카드 바탕과 구분되게 한 단계 짙은 바탕을 쓴다
  secondary: stroke.outline === 0
    ? { face: color.bgSunken, pressed: color.borderDefault, fg: color.textPrimary, outlined: false }
    : { face: color.bgSurface, pressed: color.bgSunken, fg: color.textPrimary, outlined: true },
  danger: { face: color.debtFg, pressed: color.debtPressed, fg: color.textOnPrimary, outlined: false },
  kakao: { face: color.kakaoYellow, pressed: color.kakaoYellowPressed, fg: color.kakaoLabel, outlined: false },
}) as const);

type Props = { label: string; onPress?: () => void; variant?: Variant; disabled?: boolean };

/**
 * 버튼. 누르면 바탕색이 짙어진다. 테두리·바닥 그림자는 테마를 따른다(화면설계서 10절)
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
        // 테마에 딱 떨어지는 그림자가 있으면 주 버튼 아래에 깐다(말랑 저금통의 진한 주황 바닥)
        variant === 'primary' && !disabled && !pressed && hardShadow(),
      ]}>
      <Text style={[type.headline, { color: disabled ? color.textTertiary : s.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = themed(() => ({
  face: { alignSelf: 'stretch', height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
}));
