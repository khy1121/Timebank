import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { color, live, stroke, themed, type } from '@/theme/tokens';

type Tone = 'default' | 'muted' | 'warn' | 'danger';

type Props = {
  label: string;
  /** 이름 아래 작은 설명 */
  hint?: string;
  /** 오른쪽에 보여줄 현재 값 */
  value?: string;
  /** 오른쪽에 둘 부품(스위치 등). value 대신 쓴다 */
  right?: ReactNode;
  tone?: Tone;
  /** 누를 수 있으면 오른쪽에 화살표를 보여준다 */
  onPress?: () => void;
  /** 묶음의 첫 줄이면 위 구분선을 그리지 않는다 */
  first?: boolean;
  /** right가 넓을 때(칩 여러 개) 이름 아래 줄에 둔다 */
  stacked?: boolean;
};

const TONE = live(() => ({
  default: color.textPrimary,
  muted: color.textSecondary,
  warn: color.accentCoinDeep,
  danger: color.debtFg,
}) as const);

/** 설정 화면의 한 줄. */
export function SettingRow({ label, hint, value, right, tone = 'default', onPress, first, stacked }: Props) {
  const content = (
    <>
      <View style={[styles.text, stacked && styles.stackedText]}>
        <Text style={[type.body, { color: TONE[tone] }]}>
          {tone === 'warn' ? '! ' : ''}
          {label}
        </Text>
        {hint ? <Text style={[type.caption, styles.hint]}>{hint}</Text> : null}
      </View>
      {right ?? (value ? <Text style={[type.body, styles.value]}>{value}</Text> : null)}
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </>
  );
  const rowStyle = [styles.row, stacked && styles.stacked, !first && styles.border];

  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = themed(() => ({
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  stacked: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  border: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  pressed: { backgroundColor: color.bgSunken },
  text: { flex: 1, gap: 2 },
  stackedText: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  hint: { color: color.textSecondary },
  value: { color: color.textSecondary },
  chevron: { fontSize: 22, lineHeight: 24, color: color.textTertiary, fontFamily: type.body.fontFamily },
}));
