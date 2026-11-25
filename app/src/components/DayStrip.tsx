import { Text, View } from 'react-native';

import { dayOfMonth, weekdayLabel } from '@/domain/dates';
import type { WeekDay } from '@/domain/interest';
import { color, live, radius, stroke, themed, type } from '@/theme/tokens';

const DOT = live(() => ({ overdue: color.debtFg, upcoming: color.brandPrimary }));
const DOT_LABEL = { overdue: '연체된 기한', upcoming: '다가오는 기한' } as const;

/** 오늘을 가운데 둔 7일. 빨간 점은 연체된 기한, 파란 점은 다가오는 기한. (FR-017) */
export function DayStrip({ days }: { days: WeekDay[] }) {
  return (
    <View style={styles.row}>
      {days.map((d) => {
        const a11y = `${dayOfMonth(d.date)}일 ${weekdayLabel(d.date)}요일${d.isToday ? ', 오늘' : ''}${d.dot ? `, ${DOT_LABEL[d.dot]}` : ''}`;
        return (
          <View key={d.date} style={styles.cell} accessible accessibilityLabel={a11y}>
            <Text style={[type.caption, d.isToday ? styles.todayLabel : styles.label]}>{weekdayLabel(d.date)}</Text>
            <View style={[styles.date, d.isToday && styles.today]}>
              <Text style={[type.headline, d.isToday ? styles.todayNum : styles.num]}>{dayOfMonth(d.date)}</Text>
            </View>
            <View style={[styles.dot, d.dot ? { backgroundColor: DOT[d.dot] } : null]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', gap: 4 },
  label: { color: color.textTertiary },
  todayLabel: { color: color.brandPrimary },
  date: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  today: { backgroundColor: color.brandPrimary, borderWidth: stroke.outline, borderColor: color.inkOutline },
  num: { color: color.textPrimary },
  todayNum: { color: color.textOnPrimary },
  dot: { width: 6, height: 6, borderRadius: radius.full },
}));
