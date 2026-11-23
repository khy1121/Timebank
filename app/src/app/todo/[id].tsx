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
import { feedback } from '@/lib/feedback';
import { useGroups } from '@/store/groups';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

/** TI-SCR-05 할 일 상세 */
export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todos, today, repay, remove } = useTodos();
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
            <Text style={[type.label, styles.muted]}>{overdue ? '지금 갚을 빚' : '걸어 둔 원금'}</Text>
            <Amount value={overdue ? v.debt : v.principal} size="XL" tone={overdue ? 'debt' : 'ink'} />
          </View>
          <View style={styles.divider} />
          <View style={styles.line}>
            <Text style={[type.body, styles.lineLabel]}>중요도</Text>
            <CoinMeter level={todo.importance} />
          </View>
          {overdue ? (
            <>
              <View style={styles.line}>
                <Text style={[type.body, styles.lineLabel]}>원금</Text>
                <Amount value={v.principal} />
              </View>
              <View style={styles.line}>
                <Text style={[type.body, styles.lineLabel]}>붙은 이자</Text>
                <Amount value={v.interest} />
              </View>
            </>
          ) : null}
        </View>

        {overdue ? (
          <View style={styles.history}>
            <Text style={[type.headline, styles.title]}>이자가 붙은 날</Text>
            {rows.map((r) => (
              <View key={r.day} style={styles.line}>
                <Text style={[type.body, styles.lineLabel, r.future && styles.future]}>
                  {r.future ? '내일이면' : r.day === v.overdueDays ? `${r.day}일째 (오늘)` : `${r.day}일째`}
                </Text>
                <Text style={[type.label, r.future ? styles.future : styles.added]}>+{formatAmount(r.added)}</Text>
                <View style={styles.total}>
                  <Amount value={r.total} tone={r.future ? 'muted' : 'ink'} />
                </View>
              </View>
            ))}
            {v.capped ? <Text style={[type.caption, styles.muted]}>상한(원금의 10배)에 닿아서 더 붙지 않아요.</Text> : null}
          </View>
        ) : (
          <SpeechBubble
            text={
              v.state === 'today'
                ? `오늘 끝내면 이자가 붙지 않아요. 넘기면 내일부터 하루에 ${formatAmount(v.nextDayInterest)}냥씩 붙어요.`
                : `기한까지 ${v.daysLeft}일 남았어요. 넘기면 하루에 ${formatAmount(v.nextDayInterest)}냥씩 붙기 시작해요.`
            }
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="상환하기"
          onPress={() => {
            const repaymentId = repay(todo.id);
            if (overdue) feedback.tap();
            else feedback.buy();
            // 홈에서 상환할 때와 같이, 그룹에 들어가 있으면 바로 인증을 권한다 (FR-078)
            if (repaymentId && groups.length > 0) router.replace({ pathname: '/proof', params: { repaymentId } });
            else router.back();
          }}
        />
        <Button label={overdue ? '탕감하고 삭제' : '삭제'} variant="secondary" onPress={() => setAskDelete(true)} />
      </View>

      <ConfirmSheet
        visible={askDelete}
        title={overdue ? `${formatAmount(v.debt)}냥의 빚을 탕감할까요?` : '이 할 일을 삭제할까요?'}
        message={overdue ? '할 일은 목록에서 사라지고, 내역에 탕감으로 남아요.' : '아직 기한 전이라 기록 없이 사라져요.'}
        confirmLabel={overdue ? '탕감하고 삭제' : '삭제'}
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
