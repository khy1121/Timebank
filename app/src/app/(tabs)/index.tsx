import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { GradeSheet } from '@/components/GradeSheet';
import { HistoryList } from '@/components/HistoryList';
import { HomeBackground } from '@/components/HomeBackground';
import { Mascot } from '@/components/Mascot';
import { Snackbar } from '@/components/Snackbar';
import { SummaryCard } from '@/components/SummaryCard';
import { TodoTicket } from '@/components/TodoTicket';
import { WalletChip } from '@/components/WalletChip';
import { sortViews, summarize, viewOf } from '@/domain/interest';
import { homeMessage, repayMessage } from '@/domain/messages';
import { repayEffect } from '@/domain/wallet';
import { feedback } from '@/lib/feedback';
import { useGroups } from '@/store/groups';
import { useOpenProofs } from '@/store/openProofs';
import { useProfile } from '@/store/profile';
import { useStanding } from '@/store/standing';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, type } from '@/theme/tokens';

const UNDO_MS = 5000;

type View_ = 'open' | 'done';

/** TI-SCR-03 홈 (v4): 요약 카드 하나와 할 일 목록. 피그마 57:1847, 57:2021 */
export default function HomeScreen() {
  const { todos, today, repay, undoRepay, wallet, repayments, settlementFor } = useTodos();
  const standing = useStanding();
  const { groups } = useGroups();
  const openProofs = useOpenProofs();
  const { needsOnboarding } = useProfile();
  const [lastRepaid, setLastRepaid] = useState<{ id: string; text: string } | null>(null);
  const [showing, setShowing] = useState<View_>('open');
  const [gradeOpen, setGradeOpen] = useState(false);

  const { summary, views } = useMemo(() => {
    const open = todos.filter((t) => t.status === 'open');
    return { summary: summarize(todos, today), views: sortViews(open.map((t) => viewOf(t, today))) };
  }, [todos, today]);

  useEffect(() => {
    if (!lastRepaid) return;
    const timer = setTimeout(() => setLastRepaid(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [lastRepaid]);

  // 할 일 상황에 맞는 말이 있으면 그것을, 없으면 이번 주 상태 문구를 마스코트가 한다.
  // 할 일이 없을 때는 아래 빈 화면이 안내하므로 상태 문구를 쓴다(같은 말을 두 번 하지 않게)
  const message = (views.length > 0 && homeMessage(summary, views)) || standing.message;

  // 가입 직후 한 번은 첫 실행 안내를 먼저 보여준다 (FR-050)
  if (needsOnboarding) return <Redirect href="/onboarding" />;

  return (
    <HomeBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[type.title, styles.title]} accessibilityRole="header">
              할 일 이자
            </Text>
            <WalletChip balance={wallet.balance} onPress={() => router.navigate('/shop')} />
            <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="설정" hitSlop={12}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx={12} cy={12} r={3} stroke={color.inkOutline} strokeWidth={2} />
                <Path
                  d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
                  stroke={color.inkOutline}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          </View>

          <SummaryCard
            summary={summary}
            status={standing.status}
            message={message}
            current={standing.current}
            change={standing.change}
            onPress={() => router.navigate('/standing')}
            onGrade={() => setGradeOpen(true)}
          />

          <View style={layout.section}>
            <View style={styles.filters} accessibilityRole="tablist">
              <Chip label={`진행 중 ${views.length}`} selected={showing === 'open'} onPress={() => setShowing('open')} />
              <Chip label="끝낸 일" selected={showing === 'done'} onPress={() => setShowing('done')} />
            </View>

            {showing === 'done' ? (
              <HistoryList
                repayments={repayments}
                today={today}
                settlementFor={settlementFor}
                canProof={(id) => openProofs.has(id)}
                onProof={(repaymentId) => router.push({ pathname: '/proof', params: { repaymentId } })}
              />
            ) : views.length === 0 ? (
              <View style={styles.empty}>
                <View accessible={false} importantForAccessibility="no-hide-descendants">
                  <Mascot size={120} />
                </View>
                <Text style={[type.headline, styles.ink]}>미룰 일이 하나도 없네요</Text>
                <Text style={[type.body, styles.secondary, styles.center]}>할 일을 적고 기한 안에 끝내면 냥을 벌어요.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {views.map((v) => (
                  <TodoTicket
                    key={v.todo.id}
                    view={v}
                    onRepay={() => {
                      // 잔고가 0 아래로 내려가지 않으므로 실제로 빠지는 이자는 잔고만큼까지다
                      const effect = repayEffect(v.principal, v.overdueDays, v.interest, wallet.streak);
                      const repaymentId = repay(v.todo.id);
                      if (effect.gained > 0) feedback.buy();
                      else feedback.tap();
                      setLastRepaid({ id: v.todo.id, text: repayMessage({ ...effect, lost: Math.min(effect.lost, wallet.balance) }) });
                      // 그룹에 들어가 있으면 바로 인증을 권한다. 건너뛸 수 있다 (FR-078)
                      if (repaymentId && groups.length > 0) router.push({ pathname: '/proof', params: { repaymentId } });
                    }}
                    onOpen={() => router.push({ pathname: '/todo/[id]', params: { id: v.todo.id } })}
                  />
                ))}
              </View>
            )}
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
          <Button label="+ 할 일 추가" onPress={() => router.push('/todo/new')} />
        </View>
        <GradeSheet visible={gradeOpen} grade={summary.grade} totalInterest={summary.totalInterest} onClose={() => setGradeOpen(false)} />
      </SafeAreaView>
    </HomeBackground>
  );
}

const styles = StyleSheet.create({
  // 배경 무늬가 보이도록 화면 자체는 투명하게 둔다
  safe: { flex: 1 },
  content: layout.content,
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, color: color.textPrimary },
  filters: { flexDirection: 'row', gap: 8 },
  list: { gap: 12 },
  empty: { alignItems: 'center', gap: 8, paddingTop: 24 },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  center: { textAlign: 'center' },
  // 배경 무늬 위에서도 버튼 영역이 구분되도록 바탕색을 깐다
  footer: layout.footer,
});
