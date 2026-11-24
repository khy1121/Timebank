import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { CoinMeter } from '@/components/CoinMeter';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { SpeechBubble } from '@/components/SpeechBubble';
import { TopBar } from '@/components/TopBar';
import { formatKoreanDate } from '@/domain/dates';
import { formatAmount, viewOf } from '@/domain/interest';
import { interestHistory } from '@/domain/records';
import { completionPreview } from '@/domain/savings';
import { feedback } from '@/lib/feedback';
import { useGroups } from '@/store/groups';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

/** TI-SCR-05 할 일 상세. 지금 끝내면 돌려받는 냥과 깎이는 원금을 보여준다 (시간적금기획서 4.4, 피그마 71:523) */
export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todos, today, repay, remove, account, removeRefundFor } = useTodos();
  const { groups } = useGroups();
  const [askDelete, setAskDelete] = useState(false);
  const todo = todos.find((t) => t.id === id && t.status === 'open');

  if (!todo) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar onLead={() => router.back()} />
        <View style={styles.missing}>
          <SpeechBubble text="이미 처리했거나 없는 할 일이에요." />
        </View>
      </SafeAreaView>
    );
  }

  const v = viewOf(todo, today);
  const overdue = v.state === 'overdue';
  const group = todo.stakeGroupId ? groups.find((g) => g.id === todo.stakeGroupId) : undefined;
  const inGroup = !!todo.stakeGroupId;
  const preview = completionPreview(v.principal, v.overdueDays, v.interest, account.streak, inGroup);
  // 기한 안이면 끝냈을 때 돌아올 냥(그룹이면 인정받았을 때)
  const payout = preview.pending ? preview.promised : preview.back;
  const refund = removeRefundFor(todo.id);
  const freeDelete = !overdue && refund === v.principal;
  const rows = interestHistory(v.principal, v.overdueDays);
  const dueText = overdue
    ? `${formatKoreanDate(todo.dueDate)}까지였어요`
    : v.state === 'today'
      ? '오늘까지예요'
      : `${formatKoreanDate(todo.dueDate)}까지`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar
        onLead={() => router.back()}
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
          <SpeechBubble
            text={
              v.state === 'today'
                ? `오늘 끝내면 ${formatAmount(payout)}냥이 돌아와요. 넘기면 내일부터 원금이 하루에 ${formatAmount(v.nextDayInterest)}냥씩 깎여요.`
                : `기한까지 ${v.daysLeft}일 남았어요. 넘기면 원금이 하루에 ${formatAmount(v.nextDayInterest)}냥씩 깎이기 시작해요.`
            }
          />
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
            else router.back();
          }}
        />
        <Button label={freeDelete ? '지우기' : '포기하기'} variant="secondary" onPress={() => setAskDelete(true)} />
      </View>

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
          router.back();
        }}
        onCancel={() => setAskDelete(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
