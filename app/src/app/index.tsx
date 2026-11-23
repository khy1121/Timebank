import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DayStrip } from '@/components/DayStrip';
import { DebtCard } from '@/components/DebtCard';
import { Snackbar } from '@/components/Snackbar';
import { SpeechBubble } from '@/components/SpeechBubble';
import { StandingCard } from '@/components/StandingCard';
import { TodoTicket } from '@/components/TodoTicket';
import { WalletChip } from '@/components/WalletChip';
import { forecastSeries, sortViews, summarize, viewOf, weekDays } from '@/domain/interest';
import { homeMessage, repayMessage } from '@/domain/messages';
import { repayEffect } from '@/domain/wallet';
import { feedback } from '@/lib/feedback';
import { useProfile } from '@/store/profile';
import { useStanding } from '@/store/standing';
import { useTodos } from '@/store/todos';
import { color, type } from '@/theme/tokens';

const UNDO_MS = 5000;

/** TI-SCR-03 홈 */
export default function HomeScreen() {
  const { todos, today, repay, undoRepay, wallet, repayments } = useTodos();
  const standing = useStanding();
  const { needsOnboarding } = useProfile();
  const [lastRepaid, setLastRepaid] = useState<{ id: string; text: string } | null>(null);

  const { summary, views, days, series } = useMemo(() => {
    const open = todos.filter((t) => t.status === 'open');
    return {
      summary: summarize(todos, today),
      views: sortViews(open.map((t) => viewOf(t, today))),
      days: weekDays(todos, today),
      series: forecastSeries(todos, today),
    };
  }, [todos, today]);

  useEffect(() => {
    if (!lastRepaid) return;
    const timer = setTimeout(() => setLastRepaid(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [lastRepaid]);

  const message = homeMessage(summary, views);

  // 가입 직후 한 번은 첫 실행 안내를 먼저 보여준다 (FR-050)
  if (needsOnboarding) return <Redirect href="/onboarding" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[type.title, styles.title]} accessibilityRole="header">
            할 일 이자
          </Text>
          <WalletChip balance={wallet.balance} onPress={() => router.push('/shop')} />
          <Pressable onPress={() => router.push('/history')} accessibilityRole="button" accessibilityLabel="상환 내역" hitSlop={12}>
            <Text style={[type.label, styles.link]}>내역</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="설정" hitSlop={12}>
            <Text style={[type.label, styles.link]}>설정</Text>
          </Pressable>
        </View>

        <DebtCard summary={summary} series={series} />
        <StandingCard
          status={standing.status}
          message={standing.message}
          current={standing.current}
          change={standing.change}
          repayments={repayments}
          today={today}
          onPress={() => router.push('/standing')}
        />
        <DayStrip days={days} />
        {message ? <SpeechBubble text={message} /> : null}

        <View style={styles.list}>
          {views.map((v) => (
            <TodoTicket
              key={v.todo.id}
              view={v}
              onRepay={() => {
                // 잔고가 0 아래로 내려가지 않으므로 실제로 빠지는 이자는 잔고만큼까지다
                const effect = repayEffect(v.principal, v.overdueDays, v.interest, wallet.streak);
                repay(v.todo.id);
                if (effect.gained > 0) feedback.buy();
                else feedback.tap();
                setLastRepaid({ id: v.todo.id, text: repayMessage({ ...effect, lost: Math.min(effect.lost, wallet.balance) }) });
              }}
              onOpen={() => router.push({ pathname: '/todo/[id]', params: { id: v.todo.id } })}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {lastRepaid ? (
          <Snackbar
            text={lastRepaid.text}
            actionLabel="되돌리기"
            onAction={() => {
              undoRepay(lastRepaid.id);
              setLastRepaid(null);
            }}
          />
        ) : null}
        <Button label="할 일 추가" onPress={() => router.push('/todo/new')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bgPage },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { flex: 1, color: color.textPrimary },
  link: { color: color.brandPrimary },
  list: { gap: 12 },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12, backgroundColor: color.bgPage },
});
