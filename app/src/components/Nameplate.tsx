import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { NAMEPLATE_LABEL, nameplateDecor, type Nameplate } from '@/domain/bank';
import { color, themed, type } from '@/theme/tokens';

/**
 * 이름표 (FR-113, 상점기획서 11.4절). 순위표·그룹 목록에서 내 줄의 테두리.
 * 줄 바탕은 모두 같고 테두리만 바뀐다(바탕까지 바꾸면 목록이 어지러워서, 2026-11-25 사용자 결정).
 * 재료 서열(한지 < 구리 < 은 < 금 < 백금 < 다이아)을 따라 테두리가 굵어지고, 백금·다이아에는 은행 도장이 붙는다.
 * 색만으로 구분하지 않게 굵기와 도장도 다르다.
 */

type Look = {
  /** 테두리 색. 여러 색이면 왼쪽→오른쪽으로 섞는다(다이아) */
  colors: [string] | [string, string, string];
  width: number;
};

export const NAMEPLATE_LOOK: Record<Exclude<Nameplate, 'none'>, Look> = {
  hanji: { colors: ['#C9B38A'], width: 1.5 },
  copper: { colors: ['#B87333'], width: 1.5 },
  silver: { colors: ['#A3ADB8'], width: 2 },
  gold: { colors: ['#C9981E'], width: 2.5 },
  platinum: { colors: ['#5F7790'], width: 3 },
  diamond: { colors: ['#5E9BD6', '#B48CF0', '#4FC3CF'], width: 3 },
};

/** 줄 위에 겹치는 테두리. 부모 줄과 같은 radius를 넘긴다 */
export function NameplateBorder({ plate, radius = 0 }: { plate: Nameplate; radius?: number }) {
  if (plate === 'none') return null;
  const look = NAMEPLATE_LOOK[plate];
  if (look.colors.length === 1) {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: look.width, borderColor: look.colors[0], borderRadius: radius }]} />;
  }
  return <GradientBorder plate={plate} look={look} radius={radius} />;
}

/** 여러 색 테두리(다이아). SVG 선은 크기를 알아야 안쪽에 맞게 그릴 수 있어 먼저 잰다 */
function GradientBorder({ plate, look, radius }: { plate: Nameplate; look: Look; radius: number }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const id = `np-${plate}`;
  const half = look.width / 2;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              {look.colors.map((c, i) => (
                <Stop key={i} offset={i / (look.colors.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={half} y={half} width={size.w - look.width} height={size.h - look.width} rx={Math.max(0, radius - half)} fill="none" stroke={`url(#${id})`} strokeWidth={look.width} />
        </Svg>
      ) : null}
    </View>
  );
}

/** 본점·중앙은행 이름표에 붙는 은행 도장 */
export function NameplateStamp({ plate }: { plate: Nameplate }) {
  if (!nameplateDecor(plate).stamp) return null;
  const ink = plate === 'diamond' ? '#3D6FB8' : color.inkRed;
  return (
    <View style={[styles.stamp, { borderColor: ink }]} accessible accessibilityLabel={`${NAMEPLATE_LABEL[plate]} 이름표`}>
      <Text style={[styles.stampText, { color: ink }]}>{plate === 'diamond' ? '중앙' : '본점'}</Text>
    </View>
  );
}

/** 이름 글자: 다이아 이름표면 굵게 */
export function nameplateNameStyle(plate: Nameplate) {
  return nameplateDecor(plate).bold ? styles.bold : null;
}

/** 옷장 이름표 고르기 칸에 쓰는 작은 견본 */
export function NameplateSwatch({ plate, size = 56 }: { plate: Nameplate; size?: number }) {
  return (
    <View style={[styles.swatch, { width: size * 1.6, height: size * 0.6 }, plate === 'none' && styles.swatchNone]}>
      <NameplateBorder plate={plate} radius={8} />
      <Text style={[type.caption, styles.swatchText, nameplateNameStyle(plate)]}>{NAMEPLATE_LABEL[plate]}</Text>
      <NameplateStamp plate={plate} />
    </View>
  );
}

const styles = themed(() => ({
  stamp: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 3, transform: [{ rotate: '-6deg' }] },
  stampText: { fontFamily: type.stamp.fontFamily, fontSize: 10, lineHeight: 13 },
  bold: { fontFamily: type.headline.fontFamily },
  swatch: { borderRadius: 8, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: color.bgSurface },
  swatchNone: { borderWidth: 1, borderColor: color.borderDefault },
  swatchText: { color: color.textPrimary },
}));
