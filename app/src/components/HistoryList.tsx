import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { formatAmount } from '@/domain/interest';
import { groupByMonth, type Repayment } from '@/domain/records';
import type { Settlement, SettlementStamp } from '@/domain/savings';
import * as layout from '@/theme/layout';
import { color, live, radius, stroke, themed, type } from '@/theme/tokens';

import { SpeechBubble } from './SpeechBubble';
import { HISTORY_EMPTY } from '@/domain/messages';
import { ForfeitSticker, Stamp } from './Stamp';

const shortDate = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatAmount(Math.abs(n))}`;

type Props = {
  repayments: Repayment[];
  today: string;
  /** 기록마다 도장과 손익 (시간적금기획서 12절) */
  settlementFor: (r: Repayment) => Settlement;
  /** 지금 인증을 올릴 수 있는 상환 ID. 이 줄에 "인증 올리기"를 보여준다 (FR-078) */
  canProof?: (repaymentId: string) => boolean;
  onProof?: (repaymentId: string) => void;
};

const LABEL: Record<SettlementStamp, string> = { saved: '번 냥', late: '연체료', forgive: '포기', forfeit: '보증금', pending: '인정 대기' };
const NAME = { saved: '적립', late: '연체', forgive: '포기', forfeit: '몰수' } as const;
const AMOUNT_COLOR: Record<SettlementStamp, string> = live(() => ({
  saved: color.okFg,
  late: color.debtFg,
  forgive: color.textTertiary,
  forfeit: color.debtFg,
  pending: color.textSecondary,
}));

function Mark({ stamp, size }: { stamp: SettlementStamp; size: number }) {
  return stamp === 'forfeit' ? <ForfeitSticker size={size} /> : <Stamp kind={stamp} size={size} />;
}

/**
 * 끝낸 일: 이번 달 손익, 도장별 건수, 달별 기록 (FR-016, FR-024, 시간적금기획서 12절).
 * 홈의 "끝낸 일"과 상환 내역 화면이 같이 쓴다.
 */
export function HistoryList({ repayments, today, settlementFor, canProof, onProof }: Props) {
  const month = today.slice(0, 7);
  const thisMonth = repayments.filter((r) => r.settledOn.slice(0, 7) === month).map(settlementFor);
  const net = thisMonth.reduce((s, x) => s + x.amount, 0);
  const count = (k: SettlementStamp) => thisMonth.filter((x) => x.stamp === k).length;
  const groups = groupByMonth(repayments, today);
  return (
    <View style={styles.wrap}>
      <View style={styles.panel}>
        <View style={styles.paid}>
          <Text style={[type.label, styles.muted]}>이번 달 번 냥 − 잃은 냥</Text>
          <Text style={[type.numberXL, { color: net < 0 ? color.debtFg : color.textPrimary }]}>
            {signed(net)}
            <Text style={[type.unitL, styles.muted]}>냥</Text>
          </Text>
        </View>
        <View style={styles.counts}>
          {(['saved', 'late', 'forgive', 'forfeit'] as const).map((k) => (
            <View key={k} style={styles.count} accessible accessibilityLabel={`${NAME[k]} ${count(k)}건`}>
              <Mark stamp={k} size={28} />
              <Text style={[type.headline, styles.ink]}>{count(k)}건</Text>
            </View>
          ))}
        </View>
      </View>

      {groups.length === 0 ? <SpeechBubble text={HISTORY_EMPTY} /> : null}

      {groups.map((g) => (
        <View key={g.key} style={styles.group}>
          <Text style={[type.label, styles.month]} accessibilityRole="header">
            {g.label}
          </Text>
          <View style={styles.rows}>
            {g.records.map((r, i) => (
              <Row
                key={r.id}
                record={r}
                settlement={settlementFor(r)}
                first={i === 0}
                onProof={onProof && canProof?.(r.id) ? () => onProof(r.id) : undefined}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function Row({ record, settlement, first, onProof }: { record: Repayment; settlement: Settlement; first: boolean; onProof?: () => void }) {
  const { stamp, amount, verified } = settlement;
  const label = stamp === 'saved' && verified ? '번 냥 · 인정' : LABEL[stamp];
  return (
    <View style={[styles.row, !first && styles.rowBorder]}>
      <Mark stamp={stamp} size={44} />
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
      <View style={styles.rowAmount} accessible accessibilityLabel={`${label} ${signed(amount)}냥`}>
        <Text style={[type.caption, styles.tertiary]}>{label}</Text>
        {stamp === 'pending' ? (
          <Text style={[type.caption, { color: AMOUNT_COLOR.pending }]}>인정받으면 돌아와요</Text>
        ) : (
          <Text style={[type.numberM, { color: AMOUNT_COLOR[stamp] }]}>
            {signed(amount)}
            <Text style={[type.unitS, { color: AMOUNT_COLOR[stamp] }]}>냥</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = themed(() => ({
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
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muted: { color: color.textSecondary },
  tertiary: { color: color.textTertiary },
  ink: { color: color.textPrimary },
  group: { gap: 8 },
  month: { color: color.textSecondary, paddingLeft: 8 },
  rows: layout.list,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  rowText: { flex: 1, gap: 4 },
  rowAmount: { alignItems: 'flex-end', gap: 2, maxWidth: 140 },
  proof: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: stroke.hairline,
    borderColor: color.brandPrimary,
  },
  pressed: { opacity: 0.8 },
  brand: { color: color.brandPrimary },
}));
