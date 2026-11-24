import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount, gradeLevel, gradeTable } from '@/domain/interest';
import { color, radius, stroke, type } from '@/theme/tokens';

import { Button } from './Button';

type Props = { visible: boolean; grade: number; totalInterest: number; onClose: () => void };

const LEVEL_COLOR = { good: color.okFg, warn: color.accentCoinDeep, bad: color.debtFg } as const;
const TABLE = gradeTable();

/** 신용등급 기준표. 홈 요약 카드의 "신용 N등급"을 누르면 아래에서 뜬다. (FR-025, 화면설계서 6절) */
export function GradeSheet({ visible, grade, totalInterest, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={[type.headline, styles.ink]} accessibilityRole="header">
              신용등급 기준
            </Text>
            <Text style={[type.caption, styles.muted]}>
              연체된 할 일에 붙은 이자를 모두 더해 정해요. 지금은 {formatAmount(totalInterest)}냥이라 {grade}등급이에요.
            </Text>
          </View>
          <View style={styles.list}>
            {TABLE.map((row, i) => {
              const mine = row.grade === grade;
              return (
                <View
                  key={row.grade}
                  style={[styles.row, i > 0 && styles.rowBorder, mine && styles.rowMine]}
                  accessible
                  accessibilityLabel={`${row.grade}등급, 이자 ${row.label}${mine ? ', 지금 내 등급' : ''}`}>
                  <Text style={[type.label, styles.grade, { color: LEVEL_COLOR[gradeLevel(row.grade)] }]}>{row.grade}등급</Text>
                  <Text style={[type.caption, styles.flex, styles.ink]}>{row.label}</Text>
                  {mine ? <Text style={[type.caption, styles.me]}>지금</Text> : null}
                </View>
              );
            })}
          </View>
          <Button label="닫기" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22, 34, 74, 0.45)', justifyContent: 'flex-end', padding: 16 },
  sheet: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 16,
    gap: 12,
  },
  head: { gap: 4 },
  list: { borderRadius: radius.md, borderWidth: stroke.hairline, borderColor: color.borderDefault, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  rowMine: { backgroundColor: color.brandSoft },
  grade: { width: 52 },
  flex: { flex: 1 },
  ink: { color: color.textPrimary },
  muted: { color: color.textSecondary },
  me: { color: color.brandPrimary },
});
