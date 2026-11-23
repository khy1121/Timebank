import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount, gradeLevel, type Summary } from '@/domain/interest';
import type { RankChange, StandingWeek, StatusCode } from '@/domain/standing';
import * as layout from '@/theme/layout';
import { color, radius, type } from '@/theme/tokens';

import { Mascot } from './Mascot';
import { StatusStamp } from './StatusStamp';

type Props = {
  summary: Summary;
  status: StatusCode;
  /** 마스코트가 하는 한 줄. 할 일 상황 문구가 있으면 그것, 없으면 상태 문구 */
  message: string;
  current: StandingWeek | null;
  change: RankChange;
  onPress: () => void;
};

const CHANGE_COLOR = { up: color.okFg, down: color.debtFg, same: color.textSecondary, new: color.textTertiary } as const;
const GRADE_COLOR = { good: color.okFg, warn: color.accentCoinDeep, bad: color.debtFg } as const;

/**
 * 홈 맨 위 요약: 지금 갚을 빚, 이번 주 상태, 마스코트 한마디, 이번 주 순위와 신용등급.
 * 예전 빚 카드·순위 카드·말풍선을 하나로 합쳤다. 누르면 순위 탭으로 간다. 피그마 SummaryCard 56:1932
 */
export function SummaryCard({ summary, status, message, current, change, onPress }: Props) {
  const hasDebt = summary.totalDebt > 0;
  const rank = current ? `이번 주 ${current.participants}명 중 ${current.rank}등` : '이번 주 순위는 할 일을 끝내면 생겨요';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`지금 갚을 빚 ${hasDebt ? `${formatAmount(summary.totalDebt)}냥` : '없음'}. ${rank}. 신용 ${summary.grade}등급. 순위 자세히 보기`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Mascot size={56} />
        </View>
        <View style={styles.debt}>
          <Text style={[type.caption, styles.secondary]}>지금 갚을 빚</Text>
          <Text style={[type.numberL, { color: hasDebt ? color.debtFg : color.textPrimary }]}>
            {hasDebt ? `${formatAmount(summary.totalDebt)}냥` : '0냥'}
          </Text>
        </View>
        <StatusStamp code={status} />
      </View>

      <Text style={[type.body, styles.ink]}>{message}</Text>

      <View style={styles.row}>
        <Text style={[type.label, styles.ink]} numberOfLines={1}>
          {rank}
        </Text>
        {current && change.text ? (
          <Text style={[type.caption, { color: CHANGE_COLOR[change.kind] }]} numberOfLines={1}>
            {change.text}
          </Text>
        ) : null}
        <View style={styles.flex} />
        <Text style={[type.caption, { color: GRADE_COLOR[gradeLevel(summary.grade)] }]}>신용 {summary.grade}등급</Text>
        <Text style={[type.label, styles.secondary]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...layout.card, borderRadius: radius.xl, padding: 16, gap: 12 },
  pressed: { opacity: 0.8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  debt: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: color.bgSunken },
  flex: { flex: 1 },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
});
