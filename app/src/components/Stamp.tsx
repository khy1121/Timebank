import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { stampPath, type StampShape } from '@/domain/stampShape';
import { useLook } from '@/store/look';
import { color, type } from '@/theme/tokens';

type Kind = 'repaid' | 'forgiven';

type Props = {
  kind: Kind;
  size?: number;
  /** 상점 미리보기처럼 착용한 것과 다른 모양을 보여줄 때만 넘긴다 */
  ink?: string;
  word?: string;
  shape?: StampShape;
};

/**
 * 상환(완납) 또는 탕감 처리된 할 일에 찍는 도장. 바깥 실선과 안쪽 점선 두 겹이다.
 * 완납 도장의 잉크·글자·모양은 상점에서 산 것으로 바꿀 수 있다. 탕감 도장은 늘 회색 동그라미다. (FR-064)
 */
export function Stamp({ kind, size = 44, ink, word, shape }: Props) {
  const look = useLook();
  const forgiven = kind === 'forgiven';
  const tint = forgiven ? color.textTertiary : (ink ?? look.inkColor);
  const label = forgiven ? '탕감' : (word ?? look.stampWord);
  const form: StampShape = forgiven ? 'circle' : (shape ?? look.stampShape);
  // 글자가 많거나 별 모양이면 도장 안에 들어가도록 줄인다
  const fontSize = Math.round(size * (label.length >= 3 || form === 'star' ? 0.22 : 0.27));
  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      accessible
      accessibilityLabel={`${forgiven ? '탕감' : '완납'} 도장`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Path d={stampPath(form, size, 1.5)} stroke={tint} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        <Path d={stampPath(form, size, 5.5)} stroke={tint} strokeWidth={1} strokeDasharray="2.5,2" fill="none" strokeLinejoin="round" />
      </Svg>
      <Text style={[type.stamp, styles.text, { color: tint, fontSize, lineHeight: Math.round(fontSize * 1.2) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  text: { transform: [{ rotate: '-12deg' }] },
});
