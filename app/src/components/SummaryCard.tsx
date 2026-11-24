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
  /** "신용 N등급"을 누르면 등급 기준표를 연다 (FR-025) */
  onGrade: () => void;
};

const CHANGE_COLOR = { up: color.okFg, down: color.debtFg, same: color.textSecondary, new: color.textTertiary } as const;
const GRADE_COLOR = { good: color.okFg, warn: color.accentCoinDeep, bad: color.debtFg } as const;

/**
 * 홈 맨 위 요약: 지금 갚을 빚, 이번 주 상태, 마스코트 한마디, 이번 주 순위와 신용등급.
 * 예전 빚 카드·순위 카드·말풍선을 하나로 합쳤다. 누르면 순위 탭으로 간다. 피그마 SummaryCard 56:1932
 */
export function SummaryCard({ summary, status, message, current, change, onPress, onGrade }: Props) {
  const hasDebt = summary.totalDebt > 0;
  const rank = current ? `이번 주 ${current.participants}명 중 ${current.rank}등` : '이번 주 순위는 할 일을 끝내면 생겨요';
  const label = `지금 갚을 빚 ${hasDebt ? `${formatAmount(summary.totalDebt)}냥` : '없음'}. ${rank}. 순위 자세히 보기`;
  // 웹에서 버튼 안에 버튼을 둘 수 없어서, 카드 틀은 View로 두고 누르는 곳을 나눈다
  return (
    <View style={styles.card}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
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
          {current && change.text ? (
            <Text style={[type.caption, { color: CHANGE_COLOR[change.kind] }]} numberOfLines={1}>
              {change.text}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          onPress={onGrade}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`신용 ${summary.grade}등급. 등급 기준 보기`}
          style={({ pressed }) => pressed && styles.pressed}>
          <Text style={[type.caption, styles.gradeLink, { color: GRADE_COLOR[gradeLevel(summary.grade)] }]}>신용 {summary.grade}등급 ⓘ</Text>
        </Pressable>
        <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel="순위 자세히 보기" style={({ pressed }) => pressed && styles.pressed}>
          <Text style={[type.label, styles.secondary]}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...layout.card, borderRadius: radius.xl, padding: 16, gap: 12 },
  body: { gap: 12 },
  rank: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressed: { opacity: 0.8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  debt: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: color.bgSunken },
  gradeLink: { textDecorationLine: 'underline' },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
});
