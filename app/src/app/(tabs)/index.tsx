import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '@/components/Button';
import { GradeSheet } from '@/components/GradeSheet';
import { HistoryList } from '@/components/HistoryList';
import { GRADE_TONE } from '@/components/GradeBadge';
import { Segmented } from '@/components/Segmented';
import { HomeStage } from '@/components/HomeStage';
import { Mascot } from '@/components/Mascot';
import { Snackbar } from '@/components/Snackbar';
import { TodoTicket } from '@/components/TodoTicket';
import { gradeOf, titleOf } from '@/domain/credit';
import { diffDays } from '@/domain/dates';
import { formatAmount, sortViews, summarize, viewOf } from '@/domain/interest';
import { homeMessage, repayMessage } from '@/domain/messages';
import { completionPreview, shopLockReason } from '@/domain/savings';
import { feedback } from '@/lib/feedback';
import { useGroups } from '@/store/groups';
import { useOpenProofs } from '@/store/openProofs';
import { useProfile } from '@/store/profile';
import { useCredit } from '@/store/credit';
import { useStanding } from '@/store/standing';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, hardShadow, radius, stroke, themed, type } from '@/theme/tokens';

const UNDO_MS = 5000;

type View_ = 'open' | 'done';

/** TI-SCR-03 홈 (v6): 위는 마스코트 무대, 아래 흰 판에 순자산·한마디·할 일 목록. 피그마 109:118 */
export default function HomeScreen() {
  const { todos, today, repay, undoRepay, account, repayments, settlementFor } = useTodos();
  const standing = useStanding();
  const { info: credit } = useCredit();
  const { groups } = useGroups();
  const openProofs = useOpenProofs();
  const { needsOnboarding } = useProfile();
  const [lastRepaid, setLastRepaid] = useState<{ id: string; text: string } | null>(null);
  // 상점이 잠겼을 때 잔고 칩을 누르면 잠깐 띄우는 안내
  const [lockNote, setLockNote] = useState<string | null>(null);
  const [showing, setShowing] = useState<View_>('open');
  const [gradeOpen, setGradeOpen] = useState(false);

  const { summary, views } = useMemo(() => {
    const open = todos.filter((t) => t.status === 'open');
    return { summary: summarize(todos, today), views: sortViews(open.map((t) => viewOf(t, today))) };
  }, [todos, today]);

  useEffect(() => {
    if (!lockNote) return;
    const timer = setTimeout(() => setLockNote(null), 3000);
    return () => clearTimeout(timer);
  }, [lockNote]);

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
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* 피그마 v6 홈 109:118: 위는 무대, 아래는 흰 판 */}
          <View style={styles.top}>
            <View style={styles.header}>
              <Text style={[type.title, styles.title]} accessibilityRole="header">
                todobank
              </Text>
              <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="설정" hitSlop={12}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={3} stroke={color.textPrimary} strokeWidth={2} />
                  <Path
                    d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
                    stroke={color.textPrimary}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </Pressable>
            </View>
            <HomeStage
              cash={account.cash}
              score={credit?.score ?? null}
              rank={credit?.rank ?? null}
              participants={credit?.participants ?? null}
              onRank={() => router.navigate('/standing')}
              onGrade={() => setGradeOpen(true)}
              onWallet={() => {
                const lock = shopLockReason(account, today);
                if (lock) setLockNote(lock);
                else router.navigate('/shop');
              }}
            />
          </View>

          <View style={styles.sheet}>
            <WorthRow account={account} score={credit?.score ?? null} today={today} />
            <Text style={[type.body, styles.ink]}>{message}</Text>

          {account.state !== 'normal' ? (
            <Pressable
              onPress={() => router.push('/bankrupt')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.debtBanner, pressed && styles.pressed]}>
              <Text style={[type.label, styles.debtText]}>
                {account.state === 'bankrupt' ? '파산 중이에요. 회생까지 남은 날 보기' : '순자산이 마이너스예요. 빚 갚는 법 보기'}
              </Text>
              <Text style={[type.label, styles.debtText]}>›</Text>
            </Pressable>
          ) : null}

          <View style={layout.section}>
            <View style={styles.filters}>
              <Segmented
                items={[
                  { key: 'open', label: `진행 중 ${views.length}` },
                  { key: 'done', label: '끝낸 일' },
                ]}
                value={showing}
                onChange={(k) => setShowing(k as View_)}
              />
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
                  <Mascot size={96} />
                </View>
                <Text style={[type.headline, styles.ink]}>미룰 일이 하나도 없네요</Text>
                <Text style={[type.body, styles.secondary, styles.center]}>할 일을 적고 기한 안에 끝내면 냥을 벌어요.</Text>
                <View style={styles.emptyAction}>
                  <Button label="할 일 추가" onPress={() => router.push('/todo/new')} />
                </View>
              </View>
            ) : (
              <View style={styles.list}>
                {views.map((v) => (
                  <TodoTicket
                    key={v.todo.id}
                    view={v}
                    onRepay={() => {
                      const stake = todos.find((t) => t.id === v.todo.id)?.stakeGroupId ?? null;
                      const preview = completionPreview(v.principal, v.overdueDays, v.interest, account.streak, !!stake, account.bankStage);
                      const repaymentId = repay(v.todo.id);
                      if (preview.gained > 0) feedback.buy();
                      else feedback.tap();
                      setLastRepaid({ id: v.todo.id, text: repayMessage(preview, v.principal) });
                      // 그룹에 들어가 있으면 바로 인증을 권한다. 건너뛸 수 있다 (FR-078)
                      if (repaymentId && groups.length > 0) router.push({ pathname: '/proof', params: { repaymentId } });
                    }}
                    onOpen={() => router.push({ pathname: '/todo/[id]', params: { id: v.todo.id } })}
                  />
                ))}
              </View>
            )}
          </View>
          </View>
        </ScrollView>

        {/* 할 일이 있으면 오른쪽 아래에 떠 있는 추가 버튼. 비어 있으면 가운데 큰 버튼을 쓴다 */}
        {views.length > 0 && !lastRepaid && !lockNote ? (
          <Pressable
            onPress={() => router.push('/todo/new')}
            accessibilityRole="button"
            accessibilityLabel="할 일 추가"
            hitSlop={6}
            style={({ pressed }) => [styles.fab, !pressed && hardShadow(4), pressed && styles.fabPressed]}>
            {/* 글자 '+'는 글꼴마다 위아래로 어긋나서 선으로 그린다 */}
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path d="M12 3v18M3 12h18" stroke={color.textOnPrimary} strokeWidth={3} strokeLinecap="round" />
            </Svg>
          </Pressable>
        ) : null}

        <View style={styles.footer}>
          {lockNote && !lastRepaid ? (
            <Snackbar
              text={lockNote}
              actionLabel={account.state === 'bankrupt' ? '자세히' : '빚 보기'}
              onAction={() => {
                setLockNote(null);
                router.push('/bankrupt');
              }}
            />
          ) : null}
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
        </View>
        <GradeSheet visible={gradeOpen} score={credit?.score ?? null} onClose={() => setGradeOpen(false)} />
      </SafeAreaView>
    </View>
  );
}

/** 순자산과 칭호 (흰 판 맨 위). 빚이 있으면 빨강, 파산 중이면 회생까지 남은 날 */
function WorthRow({ account, score, today }: { account: ReturnType<typeof useTodos>['account']; score: number | null; today: string }) {
  const bankrupt = account.state === 'bankrupt' && !!account.rehabOn;
  const negative = account.netWorth < 0;
  const big = bankrupt ? '파산 중' : `${negative ? '−' : ''}${formatAmount(Math.abs(account.netWorth))}냥`;
  const sub = bankrupt
    ? `회생까지 ${Math.max(0, diffDays(today, account.rehabOn!))}일 · 회생 지원금 5,000냥`
    : `통장 ${account.cash < 0 ? '−' : ''}${formatAmount(Math.abs(account.cash))}냥 · 걸어 둔 적금 ${formatAmount(account.savings)}냥`;
  const grade = score === null ? null : gradeOf(score);
  const title = score === null ? null : titleOf(score, account.state === 'bankrupt');
  return (
    <View style={styles.worthWrap} accessible accessibilityLabel={`순자산 ${big}. ${sub}${title ? `. 칭호 ${title}` : ''}`}>
      <View style={styles.worth}>
        <Text style={[type.body, styles.secondary]}>순자산</Text>
        <Text style={[type.numberM, { color: negative || bankrupt ? color.debtFg : color.textPrimary }]}>{big}</Text>
        <View style={styles.flex} />
        {grade && title ? (
          <View style={[styles.titleBadge, { backgroundColor: GRADE_TONE[grade.tone].fg }]}>
            <Text style={[type.label, styles.onBrand]}>{title}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[type.caption, styles.secondary]}>{sub}</Text>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: color.bgPage },
  // 위쪽 안전 영역도 하늘색으로 이어지게
  safe: { flex: 1, backgroundColor: color.stageSky },
  scroll: { flexGrow: 1, backgroundColor: color.bgPage },
  top: { backgroundColor: color.stageSky },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.GUTTER, paddingTop: 8 },
  title: { flex: 1, color: color.textPrimary },
  // 무대 위로 살짝 올라오는 흰 판
  sheet: {
    flexGrow: 1,
    marginTop: -24,
    paddingHorizontal: layout.GUTTER,
    paddingTop: 20,
    paddingBottom: 96,
    gap: layout.SECTION_GAP,
    backgroundColor: color.bgPage,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  worthWrap: { gap: 2 },
  worth: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  titleBadge: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  onBrand: { color: color.textOnPrimary },
  flex: { flex: 1 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fab: {
    position: 'absolute',
    right: layout.GUTTER,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: radius.full >= 99 ? 30 : radius.lg,
    backgroundColor: color.brandPrimary,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: { backgroundColor: color.brandPressed },
  list: { gap: 12 },
  empty: { alignItems: 'center', gap: 8, paddingTop: 24 },
  emptyAction: { alignSelf: 'stretch', marginTop: 12 },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  center: { textAlign: 'center' },
  // 되돌리기·잠김 안내 띠
  footer: { position: 'absolute', left: layout.GUTTER, right: layout.GUTTER, bottom: 12, gap: 8 },
  debtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: color.debtBg,
  },
  debtText: { color: color.debtFg },
  pressed: { opacity: 0.8 },
}));
