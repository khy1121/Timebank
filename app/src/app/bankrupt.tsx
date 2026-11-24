import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Mascot } from '@/components/Mascot';
import { SpeechBubble } from '@/components/SpeechBubble';
import { TopBar } from '@/components/TopBar';
import { diffDays, formatKoreanDate } from '@/domain/dates';
import { formatAmount, viewOf } from '@/domain/interest';
import { BANKRUPT_AT, completionPreview, REHAB_GRANT } from '@/domain/savings';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

const won = (n: number) => `${n < 0 ? '−' : ''}${formatAmount(Math.abs(n))}`;

/**
 * 빚과 파산·회생 (시간적금기획서 4.6, 피그마 71:687)
 * - 빚 상태: 순자산과 파산까지 남은 냥, 빚 갚는 법 세 가지, 지금 끝내면 돌아오는 할 일, 맨 아래 파산 신청
 * - 파산 중: 회생까지 남은 날, 사라진 것·그대로인 것
 * - 빚 없음: 지금 순자산과 파산 기준만
 */
export default function BankruptScreen() {
  const { account, today, todos, declareBankruptcy } = useTodos();
  const [ask, setAsk] = useState(false);
  const bankrupt = account.state === 'bankrupt' && !!account.rehabOn;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar lead="close" title={bankrupt ? '파산' : '빚'} onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {bankrupt ? (
          <Bankrupt rehabOn={account.rehabOn!} today={today} />
        ) : account.state === 'debt' ? (
          <Debt netWorth={account.netWorth} streak={account.streak} bankStage={account.bankStage} today={today} todos={todos} onBankrupt={() => setAsk(true)} />
        ) : (
          <NoDebt netWorth={account.netWorth} />
        )}
      </ScrollView>
      <ConfirmSheet
        visible={ask}
        title="파산할까요?"
        message={`빚과 걸어 둔 적금이 모두 사라지고, 7일 동안 상점이 잠기고 순위에서 빠져요. 7일 뒤 회생 지원금 ${formatAmount(REHAB_GRANT)}냥을 받아요.`}
        confirmLabel="파산하기"
        danger
        onConfirm={() => {
          setAsk(false);
          declareBankruptcy();
        }}
        onCancel={() => setAsk(false)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// 빚 상태
// ---------------------------------------------------------------------------

type TodoList = ReturnType<typeof useTodos>['todos'];

function Debt({
  netWorth,
  streak,
  bankStage,
  today,
  todos,
  onBankrupt,
}: {
  netWorth: number;
  streak: number;
  bankStage: number;
  today: string;
  todos: TodoList;
  onBankrupt: () => void;
}) {
  const limit = Math.abs(BANKRUPT_AT);
  const used = Math.min(1, Math.abs(Math.min(0, netWorth)) / limit);
  const left = Math.max(0, netWorth - BANKRUPT_AT);

  // 진행 중인 할 일: 지금 끝내면 돌아오는 냥. 연체된 것부터
  const open = todos
    .filter((t) => t.status === 'open')
    .map((t) => {
      const v = viewOf(t, today);
      const p = completionPreview(v.principal, v.overdueDays, v.interest, streak, !!t.stakeGroupId, bankStage);
      return { todo: t, v, payout: p.pending ? p.promised : p.back };
    })
    .sort((a, b) => b.v.overdueDays - a.v.overdueDays || a.todo.dueDate.localeCompare(b.todo.dueDate));
  const overdue = open.filter((o) => o.v.state === 'overdue');
  const dailyLoss = overdue.reduce((s, o) => s + o.v.nextDayInterest, 0);

  const steps = [
    overdue.length
      ? { title: '연체된 일부터 끝내기', body: `${overdue.length}개가 하루에 ${formatAmount(dailyLoss)}냥씩 깎이고 있어요. 끝내는 순간 멈춰요.` }
      : { title: '기한을 넘기지 않기', body: '지금은 연체된 일이 없어요. 기한을 넘기면 원금이 하루 10%씩 깎여요.' },
    { title: '기한 안에 끝내기', body: '원금과 이자 10%가 통장에 돌아와서 빚이 줄어요.' },
    { title: '작게 걸기', body: '빚이 있어도 할 일은 걸 수 있어요. 중요도 1~2로 작게 시작해요.' },
  ];

  return (
    <>
      <View style={[styles.hero, styles.heroDebt]} accessible accessibilityLabel={`순자산 ${won(netWorth)}냥. 파산까지 ${formatAmount(left)}냥 남았어요`}>
        <Text style={[type.label, styles.debt]}>순자산이 마이너스예요</Text>
        <View style={styles.amountRow}>
          <Text style={[type.numberXL, styles.debt]}>{won(netWorth)}</Text>
          <Text style={[type.unitL, styles.debt]}>냥</Text>
        </View>
        <View style={styles.gauge}>
          <View style={[styles.gaugeFill, { width: `${Math.max(4, used * 100)}%` }]} />
        </View>
        <View style={styles.gaugeLabels}>
          <Text style={[type.caption, styles.muted]}>0냥</Text>
          <Text style={[type.caption, styles.debt]}>파산 {won(BANKRUPT_AT)}냥</Text>
        </View>
        <Text style={[type.body, styles.ink]}>
          파산까지 <Text style={styles.strong}>{formatAmount(left)}냥</Text> 남았어요. 빚이 있는 동안 상점은 잠겨요.
        </Text>
      </View>

      <View style={layout.section}>
        <Text style={[type.headline, styles.ink]} accessibilityRole="header">
          빚 갚는 법
        </Text>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={[styles.stepNo, i === 0 && overdue.length > 0 && styles.stepNoHot]}>
              <Text style={[type.label, styles.stepNoText]}>{i + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={[type.headline, styles.ink]}>{s.title}</Text>
              <Text style={[type.body, styles.muted]}>{s.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {open.length ? (
        <View style={layout.section}>
          <Text style={[type.headline, styles.ink]} accessibilityRole="header">
            지금 끝내면 돌아오는 냥
          </Text>
          <View style={styles.list}>
            {open.slice(0, 5).map((o, i) => (
              <Pressable
                key={o.todo.id}
                onPress={() => router.push({ pathname: '/todo/[id]', params: { id: o.todo.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${o.todo.title}. 지금 끝내면 ${o.payout < 0 ? `${formatAmount(-o.payout)}냥이 통장에서 빠져요` : `${formatAmount(o.payout)}냥`}`}
                style={({ pressed }) => [styles.todoRow, i > 0 && styles.rowBorder, pressed && styles.pressed]}>
                <View style={styles.todoText}>
                  <Text style={[type.body, styles.ink]} numberOfLines={1}>
                    {o.todo.title}
                  </Text>
                  <Text style={[type.caption, o.v.state === 'overdue' ? styles.debt : styles.muted]}>
                    {o.v.state === 'overdue' ? `연체 ${o.v.overdueDays}일 · 하루 −${formatAmount(o.v.nextDayInterest)}` : formatKoreanDate(o.todo.dueDate) + '까지'}
                  </Text>
                </View>
                <Text style={[type.numberM, o.payout < 0 ? styles.debt : styles.ok]}>{o.payout < 0 ? won(o.payout) : `+${formatAmount(o.payout)}`}</Text>
                <Chevron />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <SpeechBubble text={overdue.length ? '연체된 것부터 하나만 끝내 봐요. 깎이는 게 바로 멈춰요.' : '작은 일 하나부터 기한 안에 끝내 봐요.'} />

      <View style={styles.escape}>
        <Text style={[type.label, styles.ink]}>도저히 안 되겠다면</Text>
        <Text style={[type.caption, styles.muted]}>
          파산하면 빚과 걸어 둔 적금이 사라지고, 7일 뒤 {formatAmount(REHAB_GRANT)}냥으로 다시 시작해요. {won(BANKRUPT_AT)}냥에 닿으면 저절로 파산해요.
        </Text>
        <Pressable onPress={onBankrupt} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.escapeButton, pressed && styles.pressed]}>
          <Text style={[type.label, styles.debt]}>파산 신청하기</Text>
        </Pressable>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// 파산 중
// ---------------------------------------------------------------------------

function Bankrupt({ rehabOn, today }: { rehabOn: string; today: string }) {
  const days = Math.max(0, diffDays(today, rehabOn));
  const gone = [
    ['빚', '0냥으로 사라졌어요'],
    ['걸어 둔 적금', '모두 사라졌어요'],
    ['이번 주 순위', '회생할 때까지 빠져요'],
    ['상점', '회생할 때까지 잠겨요'],
  ];
  const kept = [
    ['옷장', '산 물건은 그대로예요'],
    ['할 일', '지금도 적고 끝낼 수 있어요. 원금은 회생하는 날 걸려요'],
  ];
  return (
    <>
      <View style={[styles.hero, styles.heroCenter]} accessible accessibilityLabel={`회생까지 ${days}일. ${formatKoreanDate(rehabOn)}에 ${formatAmount(REHAB_GRANT)}냥`}>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Mascot size={88} />
        </View>
        <Text style={[type.label, styles.muted]}>회생까지</Text>
        <View style={styles.amountRow}>
          <Text style={[type.numberXL, styles.ink]}>{days}</Text>
          <Text style={[type.unitL, styles.ink]}>일</Text>
        </View>
        <View style={styles.grant}>
          <Text style={[type.label, styles.brand]}>
            {formatKoreanDate(rehabOn)} · 회생 지원금 {formatAmount(REHAB_GRANT)}냥
          </Text>
        </View>
      </View>

      <Group title="사라진 것" rows={gone} mark="x" />
      <Group title="그대로인 것" rows={kept} mark="check" />
      <SpeechBubble text="괜찮아요. 다들 한 번쯤은 무너져요. 이번엔 작은 일부터 걸어 봐요." />
    </>
  );
}

function Group({ title, rows, mark }: { title: string; rows: string[][]; mark: 'x' | 'check' }) {
  const tone = mark === 'x' ? { fg: color.debtFg, bg: color.debtBg } : { fg: color.okFg, bg: color.okBg };
  return (
    <View style={layout.section}>
      <Text style={[type.headline, styles.ink]} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.list}>
        {rows.map(([k, v], i) => (
          <View key={k} style={[styles.groupRow, i > 0 && styles.rowBorder]} accessible accessibilityLabel={`${k}. ${v}`}>
            <View style={[styles.mark, { backgroundColor: tone.bg }]}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d={mark === 'x' ? 'M6 6l12 12M18 6L6 18' : 'M5 12.5l4.5 4.5L19 7'} stroke={tone.fg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={styles.todoText}>
              <Text style={[type.label, styles.ink]}>{k}</Text>
              <Text style={[type.caption, styles.muted]}>{v}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 빚 없음
// ---------------------------------------------------------------------------

function NoDebt({ netWorth }: { netWorth: number }) {
  return (
    <>
      <View style={[styles.hero, styles.heroOk, styles.heroCenter]} accessible accessibilityLabel={`빚이 없어요. 순자산 ${won(netWorth)}냥`}>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Mascot size={88} />
        </View>
        <Text style={[type.title, styles.ink]} accessibilityRole="header">
          빚이 없어요
        </Text>
        <View style={styles.amountRow}>
          <Text style={[type.numberL, styles.ok]}>{won(netWorth)}</Text>
          <Text style={[type.unitM, styles.ok]}>냥</Text>
        </View>
        <Text style={[type.caption, styles.muted]}>순자산이 마이너스가 되면 빚, {won(BANKRUPT_AT)}냥에 닿으면 파산이에요.</Text>
      </View>
      <SpeechBubble text="이대로만 가요. 기한 안에 끝내면 이자가 계속 쌓여요." />
    </>
  );
}

function Chevron() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color.textTertiary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  content: layout.content,
  ink: { color: color.textPrimary },
  muted: { color: color.textSecondary },
  debt: { color: color.debtFg },
  ok: { color: color.okFg },
  brand: { color: color.brandPrimary },
  strong: { fontWeight: '700', color: color.debtFg },
  pressed: { opacity: 0.7 },

  hero: {
    gap: 10,
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSurface,
  },
  heroDebt: { borderColor: color.debtFg, backgroundColor: color.debtBg },
  heroOk: { backgroundColor: color.okBg },
  heroCenter: { alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  gauge: { height: 10, borderRadius: radius.full, backgroundColor: color.bgSurface, borderWidth: stroke.hairline, borderColor: color.debtFg, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: radius.full, backgroundColor: color.debtFg },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },

  step: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  stepNo: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandPrimary },
  stepNoHot: { backgroundColor: color.debtFg },
  stepNoText: { color: color.textOnPrimary },
  stepBody: { flex: 1, gap: 4 },

  list: layout.list,
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16 },
  todoText: { flex: 1, minWidth: 0, gap: 2 },


  escape: { gap: 8, padding: 16, borderRadius: radius.lg, backgroundColor: color.bgSunken },
  escapeButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: stroke.hairline,
    borderColor: color.debtFg,
    backgroundColor: color.bgSurface,
  },

  grant: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: color.brandSoft },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  mark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
