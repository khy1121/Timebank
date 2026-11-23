import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Stamp } from '@/components/Stamp';
import { TopBar } from '@/components/TopBar';
import { groupByMonth, historySummary, type Repayment } from '@/domain/records';
import { useTodos } from '@/store/todos';
import { color, hardShadow, radius, stroke, type } from '@/theme/tokens';

const shortDate = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

/** TI-SCR-06 상환 내역 (FR-016, FR-024) */
export default function HistoryScreen() {
  const { repayments, today } = useTodos();
  const summary = historySummary(repayments);
  const groups = groupByMonth(repayments, today);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="상환 내역" onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.panel, hardShadow(4)]}>
          <View style={styles.paid}>
            <Text style={[type.label, styles.muted]}>지금까지 낸 이자</Text>
            <Amount value={summary.paidInterest} size="XL" />
          </View>
          <View style={styles.counts}>
            <View style={styles.count}>
              <Stamp kind="repaid" size={36} />
              <Text style={[type.headline, styles.ink]}>{summary.repaidCount}건</Text>
            </View>
            <View style={styles.count}>
              <Stamp kind="forgiven" size={36} />
              <Text style={[type.headline, styles.ink]}>{summary.forgivenCount}건</Text>
            </View>
          </View>
        </View>

        {groups.length === 0 ? <SpeechBubble text="아직 상환한 일이 없어요. 할 일을 끝내면 여기에 도장이 찍혀요." /> : null}

        {groups.map((g) => (
          <View key={g.key} style={styles.group}>
            <Text style={[type.label, styles.month]} accessibilityRole="header">
              {g.label}
            </Text>
            <View style={styles.rows}>
              {g.records.map((r, i) => (
                <Row key={r.id} record={r} first={i === 0} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ record, first }: { record: Repayment; first: boolean }) {
  const forgiven = record.kind === 'forgiven';
  return (
    <View style={[styles.row, !first && styles.rowBorder]}>
      <Stamp kind={record.kind} />
      <View style={styles.rowText}>
        <Text style={[type.headline, styles.ink]} numberOfLines={1}>
          {record.title}
        </Text>
        <Text style={[type.caption, styles.muted]}>{shortDate(record.settledOn)}</Text>
      </View>
      <View style={styles.rowAmount}>
        <Text style={[type.caption, styles.tertiary]}>{forgiven ? '탕감한 빚' : '낸 이자'}</Text>
        <Amount value={forgiven ? record.principal + record.interest : record.interest} tone={forgiven ? 'muted' : 'ink'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bgPage },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 20 },
  panel: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 20,
    gap: 12,
  },
  paid: { gap: 2 },
  counts: { flexDirection: 'row', gap: 20 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muted: { color: color.textSecondary },
  tertiary: { color: color.textTertiary },
  ink: { color: color.textPrimary },
  group: { gap: 8 },
  month: { color: color.textSecondary, paddingLeft: 8 },
  rows: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  rowText: { flex: 1, gap: 4 },
  rowAmount: { alignItems: 'flex-end', gap: 2 },
});
