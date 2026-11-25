import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Svg, { Path } from 'react-native-svg';

import { stampPath, type StampShape } from '@/domain/stampShape';
import { useLook } from '@/store/look';
import { THEMES } from '@/theme/themes';
import { color, currentTheme, live, themed, type } from '@/theme/tokens';

/**
 * saved: 적립(기한 안에 끝냄). 상점에서 산 잉크·글자·모양으로 꾸민다
 * late: 연체(늦게 끝냄), forgive: 포기, pending: 그룹 인정을 기다리는 중
 * 몰수는 도장이 아니라 네모난 딱지(ForfeitSticker)로 보여준다
 */
export type StampKind = 'saved' | 'late' | 'forgive' | 'pending';

type Props = {
  kind: StampKind;
  size?: number;
  /** 상점 미리보기처럼 착용한 것과 다른 모양을 보여줄 때만 넘긴다 */
  ink?: string;
  word?: string;
  shape?: StampShape;
};

const FIXED: Record<Exclude<StampKind, 'saved'>, { word: string; tint: string; dashed: boolean }> = live(() => ({
  late: { word: '연체', tint: color.debtFg, dashed: false },
  forgive: { word: '포기', tint: color.textTertiary, dashed: false },
  pending: { word: '대기', tint: color.textSecondary, dashed: true },
}));

export const STAMP_LABEL: Record<StampKind, string> = { saved: '적립', late: '연체', forgive: '포기', pending: '인정 대기' };

/**
 * 상환 내역에 찍는 도장. 바깥 실선과 안쪽 점선 두 겹이다. (시간적금기획서 12절, FR-064)
 * 적립 도장만 꾸밀 수 있고, 연체·포기·대기는 늘 같은 글자와 색이라 뜻이 흐려지지 않는다.
 */
export function Stamp({ kind, size = 44, ink, word, shape }: Props) {
  const look = useLook();
  const fixed = kind === 'saved' ? null : FIXED[kind];
  const tint = fixed ? fixed.tint : (ink ?? look.inkColor);
  const label = fixed ? fixed.word : (word ?? look.stampWord);
  const form: StampShape = fixed ? 'circle' : (shape ?? look.stampShape);
  // 글자가 많거나 별 모양이면 도장 안에 들어가도록 줄인다
  const fontSize = Math.round(size * (label.length >= 3 || form === 'star' || form === 'heart' ? 0.22 : 0.27));
  // 글꼴마다 글자가 줄 가운데보다 조금 위아래로 그려져서, 테두리 한가운데 오도록 내린다
  const nudge = fontSize * (THEMES[currentTheme()].fonts.centerNudge ?? 0);
  return (
    <View style={[styles.box, { width: size, height: size }]} accessible accessibilityLabel={`${STAMP_LABEL[kind]} 도장`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Path
          d={stampPath(form, size, 1.5)}
          stroke={tint}
          strokeWidth={2.5}
          strokeDasharray={fixed?.dashed ? '5,4' : undefined}
          fill="none"
          strokeLinejoin="round"
        />
        <Path d={stampPath(form, size, 5.5)} stroke={tint} strokeWidth={1} strokeDasharray="2.5,2" fill="none" strokeLinejoin="round" />
      </Svg>
      <Text
        style={[
          type.stamp,
          { color: tint, fontSize, lineHeight: Math.round(fontSize * 1.2), transform: [{ translateY: nudge }, { rotate: '-12deg' }] },
        ]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * 몰수 딱지: 그룹 보증금을 인정받지 못해 금고로 간 기록. 빨간 바탕 네모 압류딱지. (시간적금기획서 12절)
 * 같은 빨강인 연체 도장(속이 빈 동그라미)과 모양·채움으로 구분한다 (NFR-008).
 * size는 동그란 도장과 같은 자리 너비다.
 */
export function ForfeitSticker({ size = 44 }: { size?: number }) {
  const w = size;
  const h = Math.round(size * 0.68);
  const fontSize = Math.round(size * 0.27);
  const nudge = fontSize * (THEMES[currentTheme()].fonts.centerNudge ?? 0);
  return (
    <View style={[styles.box, { width: size, height: size }]} accessible accessibilityLabel="몰수 딱지">
      <View style={[styles.sticker, { width: w, height: h, borderRadius: Math.max(2, Math.round(size / 24)) }]}>
        <View style={styles.stickerInner}>
          <Text style={[type.stamp, styles.stickerText, { fontSize, lineHeight: Math.round(fontSize * 1.2), transform: [{ translateY: nudge }] }]}>몰수</Text>
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  box: { alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  sticker: { backgroundColor: color.debtFg, padding: 3, transform: [{ rotate: '8deg' }] },
  stickerInner: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.textOnPrimary,
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerText: { color: color.textOnPrimary, letterSpacing: 1 },
}));
