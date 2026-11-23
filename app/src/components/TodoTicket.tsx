import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount, type TodoView } from '@/domain/interest';
import { color, radius, stroke, type } from '@/theme/tokens';

import { Amount } from './Amount';
import { Badge } from './Badge';
import { CoinMeter } from './CoinMeter';

const STUB_WIDTH = 56;
const NOTCH = 14;

const STUB_BG = { overdue: color.debtBg, today: color.brandSoft, upcoming: color.bgSurface } as const;

function badgeOf(view: TodoView) {
  if (view.state === 'overdue') return <Badge kind="overdue" label={`연체 ${view.overdueDays}일`} />;
  if (view.state === 'today') return <Badge kind="today" label="오늘까지" />;
  return <Badge kind="due" label={`D-${view.daysLeft}`} />;
}

type Props = { view: TodoView; onRepay?: () => void; onOpen?: () => void };

/**
 * 할 일 한 건. 절취선이 있는 차용증 모양.
 * 왼쪽 조각을 누르면 상환(완료), 나머지를 누르면 상세로 간다. (FR-013, 014, 018, 028)
 */
export function TodoTicket({ view, onRepay, onOpen }: Props) {
  const { todo, state } = view;
  const overdue = state === 'overdue';
  return (
    <View style={styles.ticket}>
      <Pressable
        onPress={onRepay}
        accessibilityRole="button"
        accessibilityLabel={`${todo.title} 상환하기`}
        style={[styles.stub, { backgroundColor: STUB_BG[state] }]}>
        <View style={styles.check} />
      </Pressable>

      <View style={styles.dashes} pointerEvents="none">
        {Array.from({ length: 14 }, (_, i) => (
          <View key={i} style={styles.dash} />
        ))}
      </View>

      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${todo.title} 자세히 보기`} style={styles.body}>
        <View style={styles.rowTitle}>
          <Text style={[type.headline, styles.title]} numberOfLines={1}>
            {todo.title}
          </Text>
          {badgeOf(view)}
        </View>
        <View style={styles.rowAmount}>
          <CoinMeter level={todo.importance} />
          <Amount value={overdue ? view.debt : view.principal} tone={overdue ? 'debt' : 'ink'} />
        </View>
        {overdue ? (
          <View style={styles.meter}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(4, Math.round(view.capRatio * 100))}%` }]} />
            </View>
            <Text style={[type.caption, styles.speed]}>
              {view.capped ? '상한에 닿아서 더 붙지 않아요' : `하루에 ${formatAmount(view.nextDayInterest)}냥씩 붙는 중`}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <View style={[styles.notch, styles.notchTop]} pointerEvents="none" />
      <View style={[styles.notch, styles.notchBottom]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    flexDirection: 'row',
    backgroundColor: color.bgSurface,
    borderRadius: radius.md,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    overflow: 'hidden',
  },
  stub: { width: STUB_WIDTH, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSurface,
  },
  dashes: {
    position: 'absolute',
    left: STUB_WIDTH - 1,
    top: 0,
    bottom: 0,
    width: 2,
    justifyContent: 'space-around',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dash: { width: 1.5, height: 4, backgroundColor: color.inkOutline },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: color.textPrimary },
  rowAmount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meter: { gap: 4 },
  track: { height: 6, borderRadius: radius.full, backgroundColor: color.bgSunken, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.full, backgroundColor: color.debtFg },
  speed: { color: color.debtFg },
  notch: {
    position: 'absolute',
    left: STUB_WIDTH - NOTCH / 2 - stroke.outline,
    width: NOTCH,
    height: NOTCH,
    borderRadius: radius.full,
    backgroundColor: color.bgPage,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
  },
  notchTop: { top: -NOTCH / 2 - stroke.outline },
  notchBottom: { bottom: -NOTCH / 2 - stroke.outline },
});
