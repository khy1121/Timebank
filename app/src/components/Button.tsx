import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, stroke, type } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'kakao';

const STYLE = {
  primary: { face: color.brandPrimary, edge: color.brandPressed, fg: color.textOnPrimary, outlined: false },
  secondary: { face: color.bgSurface, edge: color.inkOutline, fg: color.inkOutline, outlined: true },
  danger: { face: color.debtFg, edge: color.debtPressed, fg: color.textOnPrimary, outlined: false },
  kakao: { face: color.kakaoYellow, edge: color.kakaoYellowPressed, fg: color.kakaoLabel, outlined: false },
} as const;

const EDGE = 4;

type Props = { label: string; onPress?: () => void; variant?: Variant; disabled?: boolean };

/** 아래쪽 단이 눌리면 사라지는 입체 버튼. 한 화면에 primary는 하나만 쓴다. */
export function Button({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const s = STYLE[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={styles.hit}>
      {({ pressed }) => {
        const down = pressed && !disabled;
        return (
          <View
            style={[
              styles.edge,
              { backgroundColor: down ? 'transparent' : disabled ? color.borderDefault : s.edge },
              down ? { paddingTop: EDGE } : { paddingBottom: EDGE },
            ]}>
            <View
              style={[
                styles.face,
                { backgroundColor: disabled ? color.bgSunken : s.face },
                (s.outlined || disabled) && {
                  borderWidth: stroke.outline,
                  borderColor: disabled ? color.borderDefault : color.inkOutline,
                },
              ]}>
              <Text style={[type.headline, { color: disabled ? color.textTertiary : s.fg }]}>{label}</Text>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { alignSelf: 'stretch' },
  edge: { borderRadius: radius.lg },
  face: { height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
