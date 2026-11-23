import { StyleSheet, Text, View } from 'react-native';

import { gaugeFilled, gradeLevel } from '@/domain/interest';
import { color, radius, type } from '@/theme/tokens';

const LEVEL_COLOR = { good: color.accentSprout, warn: color.accentCoin, bad: color.debtFg } as const;

/** 신용등급을 10칸 게이지로 보여준다. 1등급이 가장 좋고 칸이 가득 찬다. (FR-025, FR-029) */
export function GradeGauge({ grade }: { grade: number }) {
  const filled = gaugeFilled(grade);
  const fill = LEVEL_COLOR[gradeLevel(grade)];
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`신용등급 ${grade}등급`}>
      <View style={styles.header}>
        <Text style={[type.label, styles.label]}>신용등급</Text>
        <Text style={[type.headline, styles.grade]}>{grade}등급</Text>
      </View>
      <View style={styles.segments}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={[styles.seg, { backgroundColor: i < filled ? fill : color.bgSunken }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1, color: color.textSecondary },
  grade: { color: color.textPrimary },
  segments: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 8, borderRadius: radius.full },
});
