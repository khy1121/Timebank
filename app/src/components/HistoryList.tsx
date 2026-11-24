import { Pressable, StyleSheet, Text, View } from 'react-native';

import { groupByMonth, historySummary, type Repayment } from '@/domain/records';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

import { Amount } from './Amount';
import { SpeechBubble } from './SpeechBubble';
import { Stamp } from './Stamp';

const shortDate = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

type Props = {
  repayments: Repayment[];
  today: string;
  /** 지금 인증을 올릴 수 있는 상환 ID. 이 줄에 "인증 올리기"를 보여준다 (FR-078) */
  canProof?: (repaymentId: string) => boolean;
  onProof?: (repaymentId: string) => void;
};

/** 끝낸 일: 지금까지 낸 이자, 완납·탕감 수, 달별 기록 (FR-016, FR-024). 홈의 "끝낸 일"과 상환 내역 화면이 같이 쓴다. */
export function HistoryList({ repayments, today, canProof, onProof }: Props) {
  const summary = historySummary(repayments);
  const groups = groupByMonth(repayments, today);
  return (
    <View style={styles.wrap}>
    <View style={styles.panel}>
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
            <Row key={r.id} record={r} first={i === 0} onProof={onProof && canProof?.(r.id) ? () => onProof(r.id) : undefined} />
          ))}
        </View>
      </View>
    ))}
    </View>
  );
}

function Row({ record, first, onProof }: { record: Repayment; first: boolean; onProof?: () => void }) {
  const forgiven = record.kind === 'forgiven';
  return (
    <View style={[styles.row, !first && styles.rowBorder]}>
      <Stamp kind={record.kind} />
      <View style={styles.rowText}>
        <Text style={[type.headline, styles.ink]} numberOfLines={1}>
          {record.title}
        </Text>
        <Text style={[type.caption, styles.muted]}>{shortDate(record.settledOn)}</Text>
        {onProof ? (
          <Pressable
            onPress={onProof}
            accessibilityRole="button"
            accessibilityLabel={`${record.title} 그룹에 인증 올리기`}
            hitSlop={8}
            style={({ pressed }) => [styles.proof, pressed && styles.pressed]}>
            <Text style={[type.caption, styles.brand]}>인증 올리기</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.rowAmount}>
        <Text style={[type.caption, styles.tertiary]}>{forgiven ? '탕감한 빚' : '낸 이자'}</Text>
        <Amount value={forgiven ? record.principal + record.interest : record.interest} tone={forgiven ? 'muted' : 'ink'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20 },
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
  rows: layout.list,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  rowText: { flex: 1, gap: 4 },
  proof: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: stroke.hairline, borderColor: color.brandPrimary },
  pressed: { opacity: 0.8 },
  brand: { color: color.brandPrimary },
  rowAmount: { alignItems: 'flex-end', gap: 2 },
});
