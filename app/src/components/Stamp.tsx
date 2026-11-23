import { StyleSheet, Text, View } from 'react-native';

import { useLook } from '@/store/look';
import { color, radius, type } from '@/theme/tokens';

type Kind = 'repaid' | 'forgiven';

type Props = {
  kind: Kind;
  size?: number;
  /** 상점 미리보기처럼 착용한 것과 다른 모양을 보여줄 때만 넘긴다 */
  ink?: string;
  word?: string;
};

/**
 * 상환(완납) 또는 탕감 처리된 할 일에 찍는 도장.
 * 완납 도장의 잉크와 글자는 상점에서 산 것으로 바꿀 수 있다. 탕감 도장은 바꾸지 않는다. (FR-064)
 */
export function Stamp({ kind, size = 44, ink, word }: Props) {
  const look = useLook();
  const tint = kind === 'forgiven' ? color.textTertiary : (ink ?? look.inkColor);
  const label = kind === 'forgiven' ? '탕감' : (word ?? look.stampWord);
  const inner = size - 10;
  // 글자가 많으면 도장 안에 들어가도록 줄인다
  const fontSize = Math.round(size * (label.length >= 3 ? 0.22 : 0.27));
  return (
    <View
      style={[styles.outer, { width: size, height: size, borderColor: tint }]}
      accessible
      accessibilityLabel={`${kind === 'forgiven' ? '탕감' : '완납'} 도장`}>
      <View style={[styles.inner, { width: inner, height: inner, borderColor: tint }]}>
        <Text style={[type.stamp, styles.text, { color: tint, fontSize, lineHeight: Math.round(fontSize * 1.2) }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: radius.full, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  inner: { borderRadius: radius.full, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  text: { transform: [{ rotate: '-12deg' }] },
});
