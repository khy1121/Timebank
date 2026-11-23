import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayOfMonth, weekdayLabel } from '@/domain/dates';
import { formatAmount } from '@/domain/interest';
import { dailyScores, type RankChange, type StandingWeek, type StatusCode } from '@/domain/standing';
import type { Repayment } from '@/domain/records';
import { color, hardShadow, radius, stroke, type } from '@/theme/tokens';

import { BarChart } from './BarChart';
import { StatusStamp } from './StatusStamp';

type Props = {
  status: StatusCode;
  message: string;
  current: StandingWeek | null;
  change: RankChange;
  repayments: Repayment[];
  today: string;
  onPress: () => void;
};

const CHANGE_COLOR = { up: color.okFg, down: color.debtFg, same: color.textSecondary, new: color.textTertiary } as const;
const CHANGE_MARK = { up: '▲', down: '▼', same: '–', new: '' } as const;

/** 홈의 이번 주 순위와 상태. 누르면 순위 화면으로 간다. (FR-065~069) */
export function StandingCard({ status, message, current, change, repayments, today, onPress }: Props) {
  const days = dailyScores(repayments, today);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`이번 주 순위. ${current ? `${current.participants}명 중 ${current.rank}등` : '순위 없음'}. 자세히 보기`}
      style={({ pressed }) => [styles.card, !pressed && hardShadow(3), pressed && styles.pressed]}>
      <View style={styles.top}>
        <StatusStamp code={status} />
        <View style={styles.rank}>
          <Text style={[type.headline, styles.ink]}>
            {current ? `${current.participants}명 중 ${current.rank}등` : '순위를 불러오는 중'}
          </Text>
          <Text style={[type.caption, { color: CHANGE_COLOR[change.kind] }]}>
            {CHANGE_MARK[change.kind] ? `${CHANGE_MARK[change.kind]} ` : ''}
            {change.text}
          </Text>
        </View>
      </View>
      <Text style={[type.body, styles.message]}>{message}</Text>
      <BarChart
        height={48}
        signed
        bars={days.map((d) => ({ key: d.date, value: d.score, label: d.date === today ? '오늘' : weekdayLabel(d.date) }))}
        summary={`최근 7일 하루별 점수: ${days.map((d) => `${dayOfMonth(d.date)}일 ${formatAmount(d.score)}`).join(', ')}`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 16,
    gap: 12,
  },
  pressed: { transform: [{ translateY: 2 }] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { flex: 1, gap: 2, alignItems: 'flex-end' },
  ink: { color: color.textPrimary },
  message: { color: color.inkOutline },
});
