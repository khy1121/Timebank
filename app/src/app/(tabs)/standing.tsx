import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { BarChart } from '@/components/BarChart';
import { Chip } from '@/components/Chip';
import { SpeechBubble } from '@/components/SpeechBubble';
import { StatusStamp } from '@/components/StatusStamp';
import { TopBar } from '@/components/TopBar';
import { dayOfMonth, weekdayLabel } from '@/domain/dates';
import { formatAmount } from '@/domain/interest';
import { dailyScores, MIN_PARTICIPANTS, STATUS, topPercent, weeklyBars } from '@/domain/standing';
import { track } from '@/lib/events';
import { useFriends } from '@/store/friends';
import { useScoreBreakdown, useStanding } from '@/store/standing';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

type Range = 'week' | 'month';

/** TI-SCR-11 이번 주 순위. 상태, 등수, 지난주 대비, 주간·월간 차트, 점수 설명. 상태 기준은 TI-SCR-12로 뺐다. (FR-065~069) */
export default function StandingScreen() {
  const { weeks, current, change, status, message, failed } = useStanding();
  const { repayments, today } = useTodos();
  const { incomingCount } = useFriends();
  const breakdown = useScoreBreakdown();
  const [range, setRange] = useState<Range>('week');

  // 순위를 받아 온 뒤 한 번 남긴다 (상태별 재방문율을 보려고)
  const viewed = current ? `${current.weekEnd}:${current.rank}` : null;
  useEffect(() => {
    if (!viewed || !current) return;
    track('standing_view', { status, rank: current.rank, participants: current.participants });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewed]);

  const days = dailyScores(repayments, today);
  const monthly = weeklyBars(weeks);
  const gap = current ? current.topScore - current.score : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar lead="none" title="순위" action={incomingCount > 0 ? `친구 ${incomingCount}` : '친구'} onAction={() => router.push('/friends')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <StatusStamp code={status} size="l" />
          {current ? (
            <>
              <Text style={[type.title, styles.ink]}>
                {current.participants}명 중 {current.rank}등
              </Text>
              <Text style={[type.body, styles.muted]}>
                {current.participants >= MIN_PARTICIPANTS ? `상위 ${topPercent(current.rank, current.participants)}%예요. ` : ''}
                {change.text}
              </Text>
              {gap > 0 ? <Text style={[type.caption, styles.muted]}>1등보다 {formatAmount(gap)}냥 뒤처졌어요</Text> : null}
            </>
          ) : (
            <Text style={[type.body, styles.muted]}>{failed ? '순위를 받아 오지 못했어요. 연결되면 다시 받아요.' : '순위를 불러오는 중이에요.'}</Text>
          )}
        </View>

        <SpeechBubble text={message} />

        <View style={styles.section}>
          <View style={styles.tabs} accessibilityRole="radiogroup">
            <Chip label="주간" selected={range === 'week'} onPress={() => setRange('week')} />
            <Chip label="월간" selected={range === 'month'} onPress={() => setRange('month')} />
          </View>
          <View style={styles.card}>
            {range === 'week' ? (
              <>
                <Text style={[type.label, styles.ink]}>최근 7일, 하루에 번 냥에서 낸 이자를 뺀 값</Text>
                <BarChart
                  signed
                  bars={days.map((d) => ({
                    key: d.date,
                    value: d.score,
                    label: d.date === today ? '오늘' : weekdayLabel(d.date),
                    caption: d.score === 0 ? '' : formatAmount(d.score),
                  }))}
                  summary={`최근 7일 하루별 점수: ${days.map((d) => `${dayOfMonth(d.date)}일 ${formatAmount(d.score)}`).join(', ')}`}
                />
              </>
            ) : (
              <>
                <Text style={[type.label, styles.ink]}>최근 {monthly.length}주, 주마다 몇 등이었는지</Text>
                {monthly.length ? (
                  <BarChart
                    bars={monthly.map((b, i) => ({
                      key: b.weekEnd,
                      value: b.value,
                      label: i === monthly.length - 1 ? '이번 주' : `${monthly.length - 1 - i}주 전`,
                      caption: b.label,
                    }))}
                    summary={`주별 순위: ${monthly.map((b) => b.label).join(', ')}`}
                  />
                ) : (
                  <Text style={[type.body, styles.muted]}>아직 기록이 없어요.</Text>
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[type.headline, styles.ink]} accessibilityRole="header">
            이번 주 점수
          </Text>
          <View style={styles.card}>
            <Row label="기한 안에 갚아서 번 냥" value={breakdown.earned} />
            <Row label="연체로 낸 이자" value={-breakdown.paid} />
            <Row label="지금 붙고 있는 이자" value={-breakdown.accruing} />
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={[type.headline, styles.ink]}>점수</Text>
              <Amount value={breakdown.total} tone={breakdown.total < 0 ? 'debt' : 'ink'} />
            </View>
            <Text style={[type.caption, styles.muted]}>
              순위는 서버에 저장된 기록으로 매겨요. 방금 한 일은 서버에 올라간 뒤에 순위에 반영돼요.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/status-guide')}
          accessibilityRole="button"
          accessibilityLabel={`왜 ${STATUS[status].label}인가요? 상태 기준 14개 보기`}
          style={({ pressed }) => [styles.why, pressed && styles.pressed]}>
          <View style={styles.whyText}>
            <Text style={[type.label, styles.ink]}>왜 &quot;{STATUS[status].label}&quot;인가요?</Text>
            <Text style={[type.caption, styles.muted]}>{STATUS[status].rule}</Text>
          </View>
          <Text style={[type.label, styles.link]}>기준 14개 ›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={[type.body, styles.muted]}>{label}</Text>
      <Amount value={value} prefix={value > 0 ? '+' : ''} tone={value < 0 ? 'debt' : 'ink'} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  content: layout.content,
  hero: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 20,
    gap: 8,
  },
  section: { gap: 10 },
  tabs: { flexDirection: 'row', gap: 8 },
  card: { ...layout.panel, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  divider: { height: 1, backgroundColor: color.borderDefault },
  why: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  whyText: { flex: 1, gap: 2 },
  link: { color: color.brandPrimary },
  pressed: { backgroundColor: color.bgSunken },
  ink: { color: color.textPrimary },
  muted: { color: color.textSecondary },
});
