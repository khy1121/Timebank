import { Pressable, Text, View } from 'react-native';

import { formatAmount, type TodoView } from '@/domain/interest';
import { color, radius, shadow, stroke, themed, type } from '@/theme/tokens';

type Props = { view: TodoView; onRepay?: () => void; onOpen?: () => void };

const DAY_WORD: Record<number, string> = { 1: '하루', 2: '이틀', 3: '사흘', 4: '나흘' };

/** 할 일 아래 한 줄: 연체 정도, 오늘까지, 남은 날 */
export function ticketLine(view: TodoView): string {
  if (view.state === 'overdue') {
    if (view.capped) return `${view.overdueDays}일 늦음, 상한에 닿아 더 깎이지 않아요`;
    return `${view.overdueDays}일 늦음, 하루에 ${formatAmount(view.nextDayInterest)}냥씩 깎이는 중`;
  }
  if (view.state === 'today') return '오늘까지';
  if (view.daysLeft === 1) return '내일까지';
  return `${DAY_WORD[view.daysLeft] ?? `${view.daysLeft}일`} 남음`;
}

/**
 * 할 일 한 건 (피그마 v6 홈 109:118). 왼쪽 동그라미를 누르면 끝내기, 나머지를 누르면 상세로 간다. (FR-013, 014, 018, 028)
 * 금액 알약은 걸어 둔 원금이고, 연체 중이면 지금 끝냈을 때 돌려받는 냥(원금 − 연체료)이다 (시간적금기획서 4.4)
 */
export function TodoTicket({ view, onRepay, onOpen }: Props) {
  const { todo, state } = view;
  const overdue = state === 'overdue';
  const amount = overdue ? view.principal - view.interest : view.principal;
  const line = ticketLine(view);
  return (
    <View style={[styles.card, overdue && styles.cardOverdue]}>
      <Pressable
        onPress={onRepay}
        accessibilityRole="button"
        accessibilityLabel={`${todo.title} 끝내기`}
        hitSlop={8}
        style={({ pressed }) => [styles.check, pressed && styles.checkPressed]}
      />
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${todo.title}. ${line}. ${amount < 0 ? '마이너스 ' : ''}${formatAmount(Math.abs(amount))}냥. 자세히 보기`}
        style={styles.body}>
        <View style={styles.text}>
          <Text style={[type.headline, styles.title]} numberOfLines={1}>
            {todo.title}
          </Text>
          <Text style={[type.caption, overdue ? styles.lineOverdue : styles.line]} numberOfLines={1}>
            {line}
          </Text>
        </View>
        <View style={[styles.pill, overdue ? styles.pillOverdue : styles.pillCoin]}>
          <Text style={[type.label, styles.pillText, overdue && styles.pillTextOverdue]}>
            {amount < 0 ? '−' : ''}
            {formatAmount(Math.abs(amount))}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = themed(() => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    ...(shadow.card ? { boxShadow: shadow.card } : {}),
  },
  cardOverdue: { backgroundColor: color.debtBg },
  check: {
    width: 28,
    height: 28,
    borderRadius: radius.full >= 99 ? 14 : radius.sm,
    backgroundColor: color.bgPage,
    borderWidth: stroke.outline || 0,
    borderColor: color.inkOutline,
    ...(shadow.card ? { boxShadow: shadow.card } : {}),
  },
  checkPressed: { backgroundColor: color.okBg },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { color: color.textPrimary },
  line: { color: color.textSecondary },
  lineOverdue: { color: color.debtFg },
  pill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.full, minWidth: 64, alignItems: 'center' },
  pillCoin: { backgroundColor: color.accentCoin },
  pillOverdue: { backgroundColor: color.debtFg },
  pillText: { color: color.textPrimary, fontFamily: type.numberM.fontFamily },
  pillTextOverdue: { color: color.textOnPrimary },
}));
