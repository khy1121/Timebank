import { StyleSheet, Text, View } from 'react-native';

import { color, radius, type } from '@/theme/tokens';

type Kind = 'repaid' | 'forgiven';

const LABEL = { repaid: '완납', forgiven: '탕감' } as const;
const TINT = { repaid: color.debtFg, forgiven: color.textTertiary } as const;

/** 상환(완납) 또는 탕감 처리된 할 일에 찍는 도장. */
export function Stamp({ kind, size = 44 }: { kind: Kind; size?: number }) {
  const tint = TINT[kind];
  const inner = size - 10;
  return (
    <View
      style={[styles.outer, { width: size, height: size, borderColor: tint }]}
      accessible
      accessibilityLabel={`${LABEL[kind]} 도장`}>
      <View style={[styles.inner, { width: inner, height: inner, borderColor: tint }]}>
        <Text style={[type.stamp, styles.text, { color: tint, fontSize: Math.round(size * 0.27) }]}>{LABEL[kind]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: radius.full, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  inner: { borderRadius: radius.full, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  text: { transform: [{ rotate: '-12deg' }] },
});
