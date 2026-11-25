import { useMemo } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { Text } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { TopBar } from '@/components/TopBar';
import { formatAmount } from '@/domain/interest';
import { lastMonth, STATEMENT_BANK_STAGE, statementOf, statementText } from '@/domain/statement';
import { weekdayLine } from '@/domain/weekday';
import { track } from '@/lib/events';
import { goBack } from '@/lib/navigation';
import { useCredit } from '@/store/credit';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, themed, type } from '@/theme/tokens';

/** 월간 명세서 (FR-111, 중앙은행 혜택). 지난달 성적표와 공유 */
export default function StatementScreen() {
  const { today, todos, repayments, account } = useTodos();
  const { info } = useCredit();
  const month = lastMonth(today);
  const s = useMemo(() => statementOf(month, todos, repayments, account.ledger, (info?.weeks ?? []).filter((w) => !info?.start || w.weekEnd >= info.start)), [month, todos, repayments, account.ledger, info]);
  const locked = account.bankStage < STATEMENT_BANK_STAGE;
  const delta = s.creditFrom !== null && s.creditTo !== null ? s.creditTo - s.creditFrom : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="월간 명세서" onLead={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {locked ? (
          <View style={styles.panel}>
            <Text style={[type.label, styles.ink]}>🔒 중앙은행을 열면 매달 지난달 명세서를 받아요</Text>
            <Text style={[type.caption, styles.secondary]}>끝낸 일, 번 냥, 신용 점수 변화, 잘 지킨 요일을 한 장에 모아 드려요.</Text>
          </View>
        ) : (
          <>
            <View style={styles.sheet} accessible accessibilityLabel={statementText(s)}>
              <View style={styles.head}>
                <View style={styles.flex}>
                  <Text style={[type.caption, styles.secondary]}>시간은행 중앙은행</Text>
                  <Text style={[type.title, styles.ink]}>{s.label} 명세서</Text>
                </View>
                <Mascot size={64} />
              </View>
              <Row label="끝낸 일" value={`${s.done}건`} />
              <Row label="기한 안" value={`${s.onTime}건${s.onTimeRate === null ? '' : ` (${Math.round(s.onTimeRate * 100)}%)`}`} />
              {s.late ? <Row label="늦게 끝냄" value={`${s.late}건`} tone="bad" /> : null}
              {s.forgiven ? <Row label="포기" value={`${s.forgiven}건`} tone="bad" /> : null}
              <Row label="번 냥" value={`${formatAmount(s.earned)}냥`} tone="ok" />
              {delta !== null ? (
                <Row label="신용 점수" value={`${s.creditFrom} → ${s.creditTo} (${delta >= 0 ? '+' : '−'}${Math.abs(delta)})`} tone={delta >= 0 ? 'ok' : 'bad'} />
              ) : null}
              <Text style={[type.caption, styles.secondary]}>{weekdayLine(s.weekday)}</Text>
            </View>
            <Button
              label="명세서 공유하기"
              onPress={() => {
                track('statement_share', { month: s.month });
                Share.share({ message: statementText(s) }).catch(() => {});
              }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  return (
    <View style={styles.row}>
      <Text style={[type.body, styles.secondary]}>{label}</Text>
      <Text style={[type.headline, { color: tone === 'ok' ? color.okFg : tone === 'bad' ? color.debtFg : color.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  content: layout.content,
  flex: { flex: 1 },
  panel: { ...layout.panel, padding: 16, gap: 4 },
  sheet: { ...layout.card, padding: 20, gap: 12, borderRadius: radius.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: color.borderDefault, borderStyle: 'dashed' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
}));
