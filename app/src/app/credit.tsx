import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { GRADE_TONE, GradeBadge } from '@/components/GradeBadge';
import { Mascot } from '@/components/Mascot';
import { TopBar } from '@/components/TopBar';
import { gradeOf, nextStep, partItems, signed, tagOf, titleOf, voiceLine } from '@/domain/credit';
import { dayOfMonth, weekdayLabel } from '@/domain/dates';
import { weekdayLine, weekdayReport, WEEKDAY_BANK_STAGE, type WeekdayReport } from '@/domain/weekday';
import { STATEMENT_BANK_STAGE } from '@/domain/statement';
import { useCredit } from '@/store/credit';
import { useProfile } from '@/store/profile';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, themed, type } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

/** TI-SCR-20 내 신용 (FR-097~100). 순위 탭의 내 점수 카드, 홈의 신용 카드에서 온다. 피그마 111:254, 111:353 */
export default function CreditScreen() {
  const { info, failed, refresh } = useCredit();
  const { today, account, todos, repayments } = useTodos();
  const { profile } = useProfile();
  const [range, setRange] = useState<'week' | 'month'>('week');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!info) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar title="내 신용" onLead={goBack} />
        <View style={styles.content}>
          <Text style={[type.body, styles.secondary]}>{failed ? '신용 점수를 받아 오지 못했어요. 연결되면 다시 받아요.' : '불러오는 중이에요.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bankrupt = account.state === 'bankrupt';
  const g = gradeOf(info.score);
  const step = nextStep(info.score);
  const tag = tagOf(info, today);
  const items = partItems(info.weekParts);
  const tone = GRADE_TONE[g.tone];
  const bars =
    range === 'week'
      ? info.week.map((d) => ({ key: d.day, value: d.delta, label: d.day === today ? '오늘' : weekdayLabel(d.day), caption: d.delta ? signed(d.delta) : undefined }))
      : monthBars(info.weeks);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="내 신용" onLead={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Mascot size={88} />
          <View style={[styles.title, { backgroundColor: tone.bg, borderColor: tone.fg }]}>
            <Text style={[type.label, { color: tone.fg }]}>{titleOf(info.score, bankrupt)}</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <Text style={[type.numberXL, styles.ink]} accessibilityLabel={`${info.score}점`}>
            {info.score}
            <Text style={[type.unitL, styles.ink]}>점</Text>
          </Text>
          <View style={[styles.chip, { backgroundColor: info.weekDelta < 0 ? color.debtBg : color.okBg }]}>
            <Text style={[type.label, { color: info.weekDelta < 0 ? color.debtFg : color.okFg }]}>{info.weekDelta < 0 ? '▼' : '▲'} {Math.abs(info.weekDelta)}</Text>
          </View>
          <View style={styles.flex} />
          <GradeBadge score={info.score} />
        </View>
        {tag ? <Text style={[type.label, { color: tag === '전망: 긍정적' ? color.okFg : tag === '신규 고객' ? color.brandPrimary : color.debtFg }]}>{tag}</Text> : null}
        <Text style={[type.body, styles.secondary]}>
          {g.desc}. {voiceLine(info.score, profile?.voice ?? 'spicy')}
        </Text>

        <View style={styles.section}>
          <View style={styles.track} accessibilityLabel={step.next ? `${step.next}까지 ${step.points}점` : '가장 높은 등급'}>
            <View style={[styles.fill, { width: `${Math.round(Math.max(0.04, step.progress) * 100)}%` }]} />
          </View>
          <View style={styles.between}>
            <Text style={[type.label, styles.ink]}>{g.code}</Text>
            <Text style={[type.caption, styles.secondary]}>{step.next ? `${step.next}까지 ${step.points}점` : '가장 높은 등급이에요'}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.tabs}>
            <Chip label="주간" selected={range === 'week'} onPress={() => setRange('week')} grow />
            <Chip label="월간" selected={range === 'month'} onPress={() => setRange('month')} grow />
          </View>
          <BarChart
            bars={bars}
            signed={range === 'week'}
            summary={range === 'week' ? '최근 7일 하루별 점수 변화' : `최근 ${info.weeks.length}주 주말 점수`}
          />
          <Text style={[type.caption, styles.muted]}>{range === 'week' ? '최근 7일, 하루에 오르내린 점수' : weeksCaption(info.weeks.length)}</Text>
        </View>

        <View style={styles.parts} accessibilityLabel={`이번 주 ${items.map((i) => `${i.label} ${signed(i.value)}`).join(', ')}`}>
          {items.map((i) => (
            <View key={i.label} style={styles.part}>
              <Text style={[type.headline, { color: i.value < 0 ? color.debtFg : i.value > 0 ? color.okFg : color.textSecondary }]}>{signed(i.value)}</Text>
              <Text style={[type.caption, styles.secondary]}>{i.label}</Text>
            </View>
          ))}
        </View>

        <WeekdayPanel unlocked={account.bankStage >= WEEKDAY_BANK_STAGE} report={weekdayReport(todos, repayments)} />

        <Button label="등급표" variant="secondary" onPress={() => router.push('/grades')} />
        <Button label={account.bankStage >= STATEMENT_BANK_STAGE ? '지난달 명세서' : '🔒 지난달 명세서 (중앙은행)'} variant="secondary" onPress={() => router.push('/statement')} />
        <Text style={[type.caption, styles.muted]}>점수는 서버에 저장된 기록으로 매겨요. 방금 한 일은 서버에 올라간 뒤에 반영돼요.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** 요일 분석 (읍내 금고 혜택). 요일마다 기한 안에 끝낸 비율 막대와 한 줄 */
function WeekdayPanel({ unlocked, report }: { unlocked: boolean; report: WeekdayReport }) {
  if (!unlocked) {
    return (
      <View style={styles.panel}>
        <Text style={[type.label, styles.ink]}>요일 분석</Text>
        <Text style={[type.caption, styles.secondary]}>🔒 읍내 금고를 열면 내가 잘 지키는 요일과 자주 미루는 요일을 보여 드려요.</Text>
      </View>
    );
  }
  return (
    <View style={styles.panel} accessible accessibilityLabel={`요일 분석. ${weekdayLine(report)}`}>
      <Text style={[type.label, styles.ink]}>요일 분석</Text>
      <View style={styles.weekRow}>
        {report.days.map((d) => {
          const pct = d.rate === null ? 0 : Math.round(d.rate * 100);
          const tone = d === report.best ? color.okFg : d === report.worst ? color.debtFg : color.accentCoin;
          return (
            <View key={d.day} style={styles.weekCol}>
              <Text style={[type.caption, styles.muted]}>{d.rate === null ? '-' : `${pct}%`}</Text>
              <View style={styles.weekTrack}>
                <View style={[styles.weekFill, { height: `${Math.max(d.rate === null ? 0 : 6, pct)}%`, backgroundColor: tone }]} />
              </View>
              <Text style={[type.caption, d === report.best || d === report.worst ? styles.ink : styles.secondary]}>{d.name}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[type.caption, styles.secondary]}>{weekdayLine(report)}</Text>
    </View>
  );
}

/** 주가 많으면(은행 혜택으로 13주·52주) 막대가 빽빽해지지 않게 4주마다 하나만 남긴다. 마지막(이번 주)은 늘 남긴다 */
function monthBars(weeks: { weekEnd: string; score: number }[]) {
  const step = weeks.length > 13 ? 4 : weeks.length > 7 ? 2 : 1;
  const last = weeks.length - 1;
  return weeks
    .map((w, i) => ({ w, i }))
    .filter(({ i }) => (last - i) % step === 0)
    .map(({ w, i }) => ({
      key: w.weekEnd,
      value: w.score,
      label: i === last ? '이번 주' : step >= 4 ? `${Number(w.weekEnd.slice(5, 7))}월` : `${dayOfMonth(w.weekEnd)}일`,
      caption: step === 1 ? String(w.score) : undefined,
    }));
}

function weeksCaption(n: number): string {
  const tail = n >= 52 ? ' (본점 혜택)' : n >= 13 ? ' (동네 창구 혜택)' : '';
  return `최근 ${n}주, 주마다 점수${tail}`;
}

const styles = themed(() => ({
  safe: layout.screen,
  content: layout.content,
  section: layout.section,
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 8 },
  title: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1.5 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  track: { height: 12, borderRadius: radius.full, backgroundColor: color.bgSunken, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: color.brandPrimary },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  panel: { ...layout.panel, padding: 12, gap: 10 },
  tabs: { flexDirection: 'row', gap: 8 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  weekCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekTrack: { width: 14, height: 72, borderRadius: radius.full, backgroundColor: color.bgSunken, justifyContent: 'flex-end', overflow: 'hidden' },
  weekFill: { width: '100%', borderRadius: radius.full },
  parts: { ...layout.panel, flexDirection: 'row', paddingVertical: 12 },
  part: { flex: 1, alignItems: 'center', gap: 2 },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
}));
