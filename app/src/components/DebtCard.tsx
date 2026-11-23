import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { Summary } from '@/domain/interest';
import { color, hardShadow, radius, stroke, type } from '@/theme/tokens';

import { Amount } from './Amount';
import { GradeGauge } from './GradeGauge';

type Props = { summary: Summary; series: number[] };

/** 홈 상단. 지금 갚을 빚, 신용등급, 그대로 둘 때의 7일 뒤 예상액. (FR-023, 025, 027, 029) */
export function DebtCard({ summary, series }: Props) {
  const max = Math.max(...series, 1);
  return (
    <View style={[styles.card, hardShadow(4)]}>
      <View style={styles.top}>
        <View style={styles.total}>
          <Text style={[type.label, styles.totalLabel]}>지금 갚을 빚</Text>
          {summary.totalDebt > 0 ? (
            <Amount value={summary.totalDebt} size="XL" tone="onBrand" />
          ) : (
            <Text style={[type.numberL, styles.none]}>빚이 없어요</Text>
          )}
        </View>
        <Image
          source={require('@/assets/images/mascot-coin.png')}
          style={styles.mascot}
          contentFit="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
      </View>

      <View style={styles.panel}>
        <GradeGauge grade={summary.grade} />
        {summary.forecast7 !== null ? (
          <View style={styles.forecast}>
            <View style={styles.forecastText}>
              <Text style={[type.caption, styles.forecastLabel]}>이대로 두면 7일 뒤</Text>
              <Amount value={summary.forecast7} tone={summary.forecast7 > 0 ? 'debt' : 'ink'} />
            </View>
            <View style={styles.bars} accessible={false}>
              {series.map((v, i) => (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      height: 6 + Math.round((v / max) * 26),
                      backgroundColor: i === 0 ? color.brandPrimary : color.debtFg,
                      opacity: i === 0 ? 1 : 0.35 + i * 0.09,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.brandPrimary,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 20,
    gap: 16,
  },
  top: { flexDirection: 'row', alignItems: 'flex-end' },
  total: { flex: 1, gap: 4 },
  totalLabel: { color: color.textOnPrimary, opacity: 0.8 },
  none: { color: color.textOnPrimary },
  mascot: { width: 84, height: 84 },
  panel: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  forecast: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  forecastText: { flex: 1, gap: 2 },
  forecastLabel: { color: color.textSecondary },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 8, borderRadius: 2 },
});
