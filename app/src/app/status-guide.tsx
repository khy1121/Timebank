import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusStamp } from '@/components/StatusStamp';
import { TopBar } from '@/components/TopBar';
import { MIN_PARTICIPANTS, STATUS, STATUS_ORDER } from '@/domain/standing';
import { useStanding } from '@/store/standing';
import { color, radius, stroke, type } from '@/theme/tokens';

/** TI-SCR-12 상태 기준. 상태 14개를 판정 순서대로 보여주고 지금 내 상태를 강조한다. (FR-066) */
export default function StatusGuideScreen() {
  const { status } = useStanding();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="상태 기준" onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={[type.body, styles.ink]}>위에서부터 차례로 보고, 처음 맞는 상태 하나가 붙어요.</Text>
          <Text style={[type.caption, styles.muted]}>
            이번 주에 겨룬 사람이 {MIN_PARTICIPANTS}명보다 적으면 하위·상위 % 조건은 건너뛰어요. 상태는 최근 7일 기록으로 매일 다시 정해요.
          </Text>
        </View>

        <View style={styles.list}>
          {STATUS_ORDER.map((code, i) => {
            const s = STATUS[code];
            const mine = code === status;
            return (
              <View
                key={code}
                style={[styles.row, i > 0 && styles.rowBorder, mine && styles.rowMine]}
                accessible
                accessibilityLabel={`${i + 1}번 ${s.label}. ${s.rule}${mine ? '. 지금 내 상태' : ''}`}>
                <Text style={[type.caption, styles.order]}>{i + 1}</Text>
                <View style={styles.stamp}>
                  <StatusStamp code={code} />
                </View>
                <Text style={[type.caption, styles.rule]}>{s.rule}</Text>
                {mine ? <Text style={[type.caption, styles.me]}>지금</Text> : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bgPage },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  intro: { gap: 6, paddingHorizontal: 4 },
  list: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  rowMine: { backgroundColor: color.brandSoft },
  order: { width: 18, color: color.textTertiary },
  stamp: { width: 128 },
  rule: { flex: 1, color: color.textSecondary },
  me: { color: color.brandPrimary },
  ink: { color: color.textPrimary },
  muted: { color: color.textSecondary },
});
