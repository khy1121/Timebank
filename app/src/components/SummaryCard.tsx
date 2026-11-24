import { Pressable, Text, View } from 'react-native';

import { diffDays } from '@/domain/dates';
import { gradeOf, signed, type CreditInfo } from '@/domain/credit';
import { formatAmount, type Summary } from '@/domain/interest';
import type { Account } from '@/domain/savings';
import * as layout from '@/theme/layout';
import { color, radius, themed, type } from '@/theme/tokens';

import { GRADE_TONE, GradeBadge } from './GradeBadge';
import { Mascot } from './Mascot';

type Props = {
  summary: Summary;
  /** 통장·적금·순자산 (시간적금기획서) */
  account: Pick<Account, 'cash' | 'savings' | 'netWorth' | 'state' | 'rehabOn'>;
  /** 마스코트가 하는 한 줄. 할 일 상황 문구가 있으면 그것, 없으면 상태 문구 */
  message: string;
  /** 신용 점수. 아직 못 받았으면 null (FR-097) */
  credit: CreditInfo | null;
  onPress: () => void;
  /** "신용 AA"를 누르면 등급 기준표를 연다 (FR-098) */
  onGrade: () => void;
};


/**
 * 홈 맨 위 요약: 순자산(통장 + 걸어 둔 적금), 이번 주 상태, 마스코트 한마디, 이번 주 순위와 신용등급.
 * 순자산을 크게 보여준다. 원금을 걸면 통장이 마이너스로 보여 겁주지 않게 한다 (시간적금기획서 5절).
 * 예전 빚 카드·순위 카드·말풍선을 하나로 합쳤다. 누르면 순위 탭으로 간다. 피그마 SummaryCard 56:1932
 */
export function SummaryCard({ account, message, credit, onPress, onGrade, today }: Props & { today: string }) {
  const negative = account.netWorth < 0;
  const bankrupt = account.state === 'bankrupt' && account.rehabOn;
  const big = bankrupt ? '파산 중' : `${account.netWorth < 0 ? '−' : ''}${formatAmount(Math.abs(account.netWorth))}냥`;
  const sub = bankrupt
    ? `회생까지 ${Math.max(0, diffDays(today, account.rehabOn!))}일 · 회생 지원금 5,000냥`
    : `통장 ${account.cash < 0 ? '−' : ''}${formatAmount(Math.abs(account.cash))}냥 · 걸어 둔 적금 ${formatAmount(account.savings)}냥`;
  const rank = credit ? `전체 ${credit.participants}명 중 ${credit.rank}등` : '신용 점수를 불러오는 중이에요';
  const label = `순자산 ${big}. ${sub}. ${rank}. 순위 자세히 보기`;
  // 웹에서 버튼 안에 버튼을 둘 수 없어서, 카드 틀은 View로 두고 누르는 곳을 나눈다
  return (
    <View style={styles.card}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <View style={styles.top}>
          <View accessible={false} importantForAccessibility="no-hide-descendants">
            <Mascot size={56} />
          </View>
          <View style={styles.debt}>
            <Text style={[type.caption, styles.secondary]}>{negative ? '순자산 · 빚이 있어요' : '순자산'}</Text>
            <Text style={[type.numberL, { color: negative || bankrupt ? color.debtFg : color.textPrimary }]}>{big}</Text>
          </View>
          {credit ? <GradeBadge score={credit.score} /> : null}
        </View>

        <Text style={[type.caption, styles.secondary]}>{sub}</Text>

        <Text style={[type.body, styles.ink]}>{message}</Text>
      </Pressable>

      <View style={styles.row}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${rank}. 순위 자세히 보기`}
          style={({ pressed }) => [styles.rank, pressed && styles.pressed]}>
          <Text style={[type.label, styles.ink]} numberOfLines={1}>
            {rank}
          </Text>
          {credit ? (
            <Text style={[type.caption, { color: credit.weekDelta < 0 ? color.debtFg : credit.weekDelta > 0 ? color.okFg : color.textSecondary }]} numberOfLines={1}>
              {credit.score}점, 이번 주 {signed(credit.weekDelta)}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          onPress={onGrade}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={credit ? `신용 ${gradeOf(credit.score).code}. 등급 기준 보기` : '등급 기준 보기'}
          style={({ pressed }) => pressed && styles.pressed}>
          <Text style={[type.caption, styles.gradeLink, { color: credit ? GRADE_TONE[gradeOf(credit.score).tone].fg : color.textSecondary }]}>
            {credit ? `신용 ${gradeOf(credit.score).code}` : '신용'} ⓘ
          </Text>
        </Pressable>
        <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel="순위 자세히 보기" style={({ pressed }) => pressed && styles.pressed}>
          <Text style={[type.label, styles.secondary]}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  card: { ...layout.card, borderRadius: radius.xl, padding: 16, gap: 12 },
  body: { gap: 12 },
  // 등수와 변화는 두 줄로 쌓고 줄어들 수 있게 한다. 좁은 화면에서 신용등급 링크를 덮지 않게 (2026-11-24 휴대폰에서 겹침)
  rank: { flex: 1, minWidth: 0, gap: 2 },
  pressed: { opacity: 0.8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  debt: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: color.bgSunken },
  gradeLink: { textDecorationLine: 'underline' },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
}));
