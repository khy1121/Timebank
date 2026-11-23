import { StyleSheet, Text, View } from 'react-native';

import { color, radius, stroke, type } from '@/theme/tokens';

export type Bar = { key: string; value: number; label: string; caption?: string };

type Props = {
  bars: Bar[];
  height?: number;
  /** 음수 막대를 가운데 선 아래로 그린다 (주간 점수) */
  signed?: boolean;
  /** 마지막 막대(이번 주·오늘)를 강조한다 */
  highlightLast?: boolean;
  /** 화면 읽기 프로그램용 요약 */
  summary: string;
};

/** 막대 차트. 주간(하루별 점수)과 월간(주별 상위 비율)에 쓴다. (FR-069) */
export function BarChart({ bars, height = 120, signed = false, highlightLast = true, summary }: Props) {
  const maxAbs = Math.max(1, ...bars.map((b) => Math.abs(b.value)));
  const half = signed ? height / 2 : height;
  return (
    <View accessible accessibilityLabel={summary}>
      <View style={[styles.plot, { height }]}>
        {signed ? <View style={[styles.zero, { top: half }]} /> : null}
        {bars.map((b, i) => {
          const last = highlightLast && i === bars.length - 1;
          const h = Math.max(b.value === 0 ? 0 : 4, Math.round((Math.abs(b.value) / maxAbs) * (half - 4)));
          const negative = b.value < 0;
          const fill = negative ? color.debtFg : last ? color.brandPrimary : color.accentCoin;
          return (
            <View key={b.key} style={styles.col}>
              {signed ? (
                <View style={{ height, justifyContent: 'flex-start' }}>
                  <View style={{ height: half, justifyContent: 'flex-end' }}>
                    {!negative && h > 0 ? <View style={[styles.bar, { height: h, backgroundColor: fill }]} /> : null}
                  </View>
                  <View style={{ height: half }}>
                    {negative ? <View style={[styles.bar, { height: h, backgroundColor: fill }]} /> : null}
                  </View>
                </View>
              ) : (
                <View style={{ height, justifyContent: 'flex-end' }}>
                  <View style={[styles.bar, { height: Math.max(h, 4), backgroundColor: fill }]} />
                </View>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {bars.map((b, i) => (
          <View key={b.key} style={styles.col}>
            <Text style={[type.caption, styles.label, highlightLast && i === bars.length - 1 && styles.labelOn]} numberOfLines={1}>
              {b.label}
            </Text>
            {b.caption ? (
              <Text style={[type.caption, styles.caption]} numberOfLines={1}>
                {b.caption}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', gap: 8, position: 'relative' },
  zero: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color.borderDefault },
  col: { flex: 1, alignItems: 'stretch' },
  bar: { borderRadius: radius.sm, borderWidth: stroke.outline - 0.5, borderColor: color.inkOutline },
  labels: { flexDirection: 'row', gap: 8, marginTop: 6 },
  label: { color: color.textSecondary, textAlign: 'center' },
  labelOn: { color: color.textPrimary, fontFamily: type.label.fontFamily },
  caption: { color: color.textTertiary, textAlign: 'center', fontSize: 11 },
});
