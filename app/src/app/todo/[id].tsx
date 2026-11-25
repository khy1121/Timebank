import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ActionSheet';
import { Amount } from '@/components/Amount';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { CoinMeter } from '@/components/CoinMeter';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { SpeechBubble } from '@/components/SpeechBubble';
import { dueBubble, TODO_GONE } from '@/domain/messages';
import { TopBar } from '@/components/TopBar';
import { addDays, formatKoreanDate } from '@/domain/dates';
import { formatAmount, viewOf } from '@/domain/interest';
import { interestHistory } from '@/domain/records';
import { completionPreview } from '@/domain/savings';
import { feedback } from '@/lib/feedback';
import { useGroups } from '@/store/groups';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, themed, type } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

/** TI-SCR-05 할 일 상세. 지금 끝내면 돌려받는 냥과 깎이는 원금을 보여준다 (시간적금기획서 4.4, 피그마 71:523) */
export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todos, today, repay, remove, update, account, removeRefundFor, extendFeeFor } = useTodos();
  const { groups } = useGroups();
  const [askDelete, setAskDelete] = useState(false);
  const [pickExtend, setPickExtend] = useState(false);
  // 고른 연장 일수. 수수료가 있으면 한 번 더 묻는다
  const [askExtend, setAskExtend] = useState<{ days: number; fee: number } | null>(null);
  const todo = todos.find((t) => t.id === id && t.status === 'open');

  if (!todo) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar onLead={goBack} />
        <View style={styles.missing}>
          <SpeechBubble text={TODO_GONE} />
        </View>
      </SafeAreaView>
    );
  }

  const v = viewOf(todo, today);
  const overdue = v.state === 'overdue';
  const group = todo.stakeGroupId ? groups.find((g) => g.id === todo.stakeGroupId) : undefined;
  const inGroup = !!todo.stakeGroupId;
  const preview = completionPreview(v.principal, v.overdueDays, v.interest, account.streak, inGroup, account.bankStage);
  // 기한 안이면 끝냈을 때 돌아올 냥(그룹이면 인정받았을 때)
  const payout = preview.pending ? preview.promised : preview.back;
  const refund = removeRefundFor(todo.id);
  const freeDelete = !overdue && refund === v.principal;
  const rows = interestHistory(v.principal, v.overdueDays);
  // 기한 미루기: 연체 전에만 (FR-011). 상세에서 바로 고를 수 있게 한다 (2026-11-24 휴대폰 확인: 수정 화면에서 찾기 어려움)
  const extendInput = (days: number) => ({ title: todo.title, importance: todo.importance, dueDate: addDays(todo.dueDate, days) });
  const extendOptions = [1, 2, 3, 7].map((days) => ({ days, fee: extendFeeFor(todo.id, extendInput(days)) }));
  const applyExtend = (days: number) => {
    update(todo.id, extendInput(days));
    feedback.tap();
  };
  const dueText = overdue
    ? `${formatKoreanDate(todo.dueDate)}까지였어요`
    : v.state === 'today'
      ? '오늘까지예요'
      : `${formatKoreanDate(todo.dueDate)}까지`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar
        onLead={goBack}
        action="수정"
        onAction={() => router.push({ pathname: '/todo-edit/[id]', params: { id: todo.id } })}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={[type.title, styles.title]} accessibilityRole="header">
            {todo.title}
          </Text>
          <View style={styles.meta}>
            <Text style={[type.body, styles.muted]}>{dueText}</Text>
            {overdue ? <Badge kind="overdue" label={`연체 ${v.overdueDays}일`} /> : null}
            {v.state === 'upcoming' ? <Badge kind="due" label={`D-${v.daysLeft}`} /> : null}
            {!overdue ? (
              <Pressable
                onPress={() => setPickExtend(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="기한 미루기"
                style={({ pressed }) => [styles.extend, pressed && styles.pressed]}>
                <Text style={[type.label, styles.extendText]}>기한 미루기</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.now}>
            <Text style={[type.label, styles.muted]}>
              {preview.forfeit ? '늦어서 보증금을 돌려받지 못해요' : overdue ? '지금 끝내면 돌려받는 냥' : inGroup ? '기한 안에 끝내고 인정받으면 돌려받는 냥' : '기한 안에 끝내면 돌려받는 냥'}
            </Text>
            <Amount value={payout} size="XL" tone={overdue ? 'debt' : 'ink'} />
          </View>
          <View style={styles.divider} />
          <View style={styles.line}>
            <Text style={[type.body, styles.lineLabel]}>중요도</Text>
            <CoinMeter level={todo.importance} />
          </View>
          <View style={styles.line}>
            <Text style={[type.body, styles.lineLabel]}>{inGroup ? `걸어 둔 보증금 · ${group?.name ?? '그룹'}` : '걸어 둔 원금'}</Text>
            <Amount value={v.principal} />
          </View>
          {overdue ? (
            <View style={styles.line}>
              <Text style={[type.body, styles.lineLabel]}>연체료 (하루 10%씩 불어나요)</Text>
              <Amount value={-v.interest} tone="debt" />
            </View>
          ) : (
            <View style={styles.line}>
              <Text style={[type.body, styles.lineLabel]}>{inGroup ? '이자 + 그룹 보너스' : '이자 (기한 안에 끝내면)'}</Text>
              <Amount value={preview.gained} prefix="+" />
            </View>
          )}
        </View>

        {overdue ? (
          <View style={styles.history}>
            <Text style={[type.headline, styles.title]}>하루마다 깎인 냥</Text>
            {rows.map((r) => (
              <View key={r.day} style={styles.line}>
                <Text style={[type.body, styles.lineLabel, r.future && styles.future]}>
                  {r.future ? '내일이면' : r.day === v.overdueDays ? `${r.day}일째 (오늘)` : `${r.day}일째`}
                </Text>
                <Text style={[type.label, r.future ? styles.future : styles.added]}>−{formatAmount(r.added)}</Text>
                <View style={styles.total}>
                  <Amount value={v.principal * 2 - r.total} tone={r.future ? 'muted' : 'ink'} />
                </View>
              </View>
            ))}
            {v.capped ? <Text style={[type.caption, styles.muted]}>상한에 닿아서 더 깎이지 않아요.</Text> : null}
          </View>
        ) : (
          <SpeechBubble text={dueBubble(v.state === 'today' ? 'today' : 'upcoming', payout, v.daysLeft, v.nextDayInterest)} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={preview.pending ? '끝내고 인증 올리기' : preview.forfeit ? '끝내기' : `끝내고 ${formatAmount(preview.back)}냥 돌려받기`}
          onPress={() => {
            const repaymentId = repay(todo.id);
            if (overdue) feedback.tap();
            else feedback.buy();
            // 홈에서 상환할 때와 같이, 그룹에 들어가 있으면 바로 인증을 권한다 (FR-078)
            if (repaymentId && (inGroup || groups.length > 0)) router.replace({ pathname: '/proof', params: { repaymentId } });
            else goBack();
          }}
        />
        <Button label={freeDelete ? '지우기' : '포기하기'} variant="secondary" onPress={() => setAskDelete(true)} />
      </View>

      <ActionSheet
        visible={pickExtend}
        title={extendOptions[0].fee === 0 ? '얼마나 미룰까요? 지금은 무료예요' : `얼마나 미룰까요? 하루에 ${formatAmount(extendOptions[0].fee)}냥`}
        actions={extendOptions.map((o) => ({
          label: `${o.days === 7 ? '일주일' : `${o.days}일`} 미루기 · ${formatKoreanDate(addDays(todo.dueDate, o.days))}${o.fee > 0 ? ` (${formatAmount(o.fee)}냥)` : ''}`,
          onPress: () => (o.fee > 0 ? setAskExtend(o) : applyExtend(o.days)),
        }))}
        onClose={() => setPickExtend(false)}
      />

      <ConfirmSheet
        visible={!!askExtend}
        title={askExtend ? `기한을 ${askExtend.days}일 미룰까요?` : ''}
        message={askExtend ? `연장 수수료 ${formatAmount(askExtend.fee)}냥이 통장에서 빠져요. 미룬 날마다 원금의 5%예요.` : ''}
        confirmLabel={askExtend ? `${formatAmount(askExtend.fee)}냥 내고 미루기` : '미루기'}
        onConfirm={() => {
          if (askExtend) applyExtend(askExtend.days);
          setAskExtend(null);
        }}
        onCancel={() => setAskExtend(null)}
      />

      <ConfirmSheet
        visible={askDelete}
        title={freeDelete ? '이 할 일을 지울까요?' : '포기할까요?'}
        message={
          freeDelete
            ? `등록한 지 1시간이 안 돼서 원금 ${formatAmount(refund)}냥을 모두 돌려받아요. 기록 없이 사라져요.`
            : refund >= 0
              ? `기한 전이라 원금의 절반 ${formatAmount(refund)}냥을 돌려받아요. 나머지 ${formatAmount(v.principal - refund)}냥은 잃고, 내역에 포기로 남아요.`
              : `원금과 연체료를 합쳐 ${formatAmount(v.principal - refund)}냥을 잃어요. 내역에 포기로 남아요.`
        }
        confirmLabel={freeDelete ? '지우기' : '포기하기'}
        danger
        onConfirm={() => {
          setAskDelete(false);
          remove(todo.id);
          goBack();
        }}
        onCancel={() => setAskDelete(false)}
      />
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  missing: { padding: 24 },
  content: layout.content,
  heading: { gap: 8 },
  title: { color: color.textPrimary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  muted: { color: color.textSecondary },
  panel: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 20,
    gap: 12,
  },
  now: { gap: 2 },
  divider: { height: 1, backgroundColor: color.borderDefault },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineLabel: { flex: 1, color: color.textSecondary },
  history: { gap: 10 },
  added: { color: color.debtFg },
  future: { color: color.textTertiary },
  total: { width: 92, alignItems: 'flex-end' },
  footer: layout.footer,
  extend: {
    marginLeft: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: stroke.hairline,
    borderColor: color.brandPrimary,
    backgroundColor: color.brandSoft,
  },
  extendText: { color: color.brandPrimary },
  pressed: { opacity: 0.7 },
}));
