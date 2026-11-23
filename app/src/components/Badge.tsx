import { StyleSheet, Text, View } from 'react-native';

import { color, radius, type } from '@/theme/tokens';

type Kind = 'overdue' | 'today' | 'due' | 'done';

const STYLE = {
  overdue: { bg: color.debtBg, fg: color.debtFg, mark: '!' },
  today: { bg: color.brandSoft, fg: color.brandPrimary, mark: null },
  due: { bg: color.bgSunken, fg: color.textSecondary, mark: null },
  done: { bg: color.okBg, fg: color.okFg, mark: '✓' },
} as const;

/** 기한 상태. 색만이 아니라 글자와 기호로도 구분한다. (NFR-008) */
export function Badge({ kind, label }: { kind: Kind; label: string }) {
  const s = STYLE[kind];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      {s.mark ? <Text style={[styles.mark, { color: s.fg }]}>{s.mark}</Text> : null}
      <Text style={[type.label, { color: s.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  mark: { ...type.label, fontFamily: type.headline.fontFamily },
});
