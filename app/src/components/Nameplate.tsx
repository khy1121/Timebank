import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';

import { NAMEPLATE_LABEL, nameplateDecor, type Nameplate } from '@/domain/bank';
import { color, themed, type } from '@/theme/tokens';

/**
 * 이름표 (FR-113, 상점기획서 11.4절). 순위표·그룹 목록 한 줄 전체의 배경.
 * 재료 서열(종이 < 구리 < 은 < 금 < 백금 < 다이아)을 따르고, 위로 갈수록 테두리·무늬·광택·도장이 하나씩 더해진다.
 * 무늬는 움직이지 않고 아주 옅게 깔아 글자 대비 4.5:1을 지킨다. 색만으로 구분하지 않게 꾸밈 개수도 다르다.
 */

type Look = {
  /** 바탕. 두 색이면 위→아래 광택 */
  fill: [string, string] | [string, string, string];
  border?: { color: string; width: number; double?: boolean };
  /** 아래쪽에만 얇은 선 */
  underline?: string;
  pattern?: 'dots' | 'coins' | 'diagonal';
  patternColor?: string;
};

export const NAMEPLATE_LOOK: Record<Exclude<Nameplate, 'none'>, Look> = {
  hanji: { fill: ['#F7F0E1', '#F7F0E1'] },
  copper: { fill: ['#F8E6D8', '#F8E6D8'], underline: '#B87333' },
  silver: { fill: ['#F6F8FA', '#DFE4EA'], border: { color: '#A3ADB8', width: 1 }, pattern: 'dots', patternColor: '#8D98A5' },
  gold: { fill: ['#FFF6D6', '#F4D987'], border: { color: '#C9981E', width: 1.5 }, pattern: 'coins', patternColor: '#B9861A' },
  platinum: { fill: ['#F5F8FC', '#D5DFEA'], border: { color: '#7F94AB', width: 2.5 }, pattern: 'coins', patternColor: '#6F849B' },
  diamond: { fill: ['#E9F8FF', '#DDF1FF', '#F1E8FF'], border: { color: '#5E9BD6', width: 1.5, double: true }, pattern: 'diagonal', patternColor: '#5E9BD6' },
};

/** 줄 뒤에 까는 배경. 부모는 overflow: hidden이어야 한다 */
export function NameplateBackground({ plate, radius = 0 }: { plate: Nameplate; radius?: number }) {
  if (plate === 'none') return null;
  const look = NAMEPLATE_LOOK[plate];
  const id = `np-${plate}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            {look.fill.map((c, i) => (
              <Stop key={i} offset={i / (look.fill.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
          {look.pattern === 'dots' ? (
            <Pattern id={`${id}-pat`} width={10} height={10} patternUnits="userSpaceOnUse">
              <Circle cx={5} cy={5} r={1} fill={look.patternColor} opacity={0.18} />
            </Pattern>
          ) : look.pattern === 'coins' ? (
            <Pattern id={`${id}-pat`} width={22} height={22} patternUnits="userSpaceOnUse">
              <Circle cx={11} cy={11} r={5} fill="none" stroke={look.patternColor} strokeWidth={1} opacity={0.16} />
              <Rect x={9.5} y={9.5} width={3} height={3} fill="none" stroke={look.patternColor} strokeWidth={0.8} opacity={0.16} />
            </Pattern>
          ) : look.pattern === 'diagonal' ? (
            <Pattern id={`${id}-pat`} width={8} height={8} patternUnits="userSpaceOnUse">
              <Line x1={0} y1={8} x2={8} y2={0} stroke={look.patternColor} strokeWidth={1} opacity={0.14} />
            </Pattern>
          ) : null}
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" rx={radius} fill={`url(#${id}-fill)`} />
        {look.pattern ? <Rect x={0} y={0} width="100%" height="100%" rx={radius} fill={`url(#${id}-pat)`} /> : null}
      </Svg>
      {look.border ? (
        <View style={[StyleSheet.absoluteFill, { borderWidth: look.border.width, borderColor: look.border.color, borderRadius: radius }]}>
          {look.border.double ? <View style={[styles.inner, { borderColor: look.border.color, borderRadius: Math.max(0, radius - 3) }]} /> : null}
        </View>
      ) : null}
      {look.underline ? <View style={[styles.underline, { backgroundColor: look.underline }]} /> : null}
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
      <NameplateBackground plate={plate} radius={8} />
      <Text style={[type.caption, styles.swatchText, nameplateNameStyle(plate)]}>{NAMEPLATE_LABEL[plate]}</Text>
      <NameplateStamp plate={plate} />
    </View>
  );
}

const styles = themed(() => ({
  inner: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, borderWidth: 1 },
  underline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
  stamp: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 3, transform: [{ rotate: '-6deg' }] },
  stampText: { fontFamily: type.stamp.fontFamily, fontSize: 10, lineHeight: 13 },
  bold: { fontFamily: type.headline.fontFamily },
  swatch: { borderRadius: 8, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: color.bgSurface },
  swatchNone: { borderWidth: 1, borderColor: color.borderDefault },
  swatchText: { color: color.textPrimary },
}));
