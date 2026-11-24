import { Modal, Pressable, Text, View } from 'react-native';

import { gradeOf, gradeRange, GRADES } from '@/domain/credit';
import { color, radius, stroke, themed, type } from '@/theme/tokens';

import { Button } from './Button';
import { GRADE_TONE } from './GradeBadge';

type Props = { visible: boolean; score: number | null; onClose: () => void };

/** 신용등급 기준표. 홈 요약 카드의 "신용 AA"를 누르면 아래에서 뜬다. (FR-098) */
export function GradeSheet({ visible, score, onClose }: Props) {
  const mine = score === null ? null : gradeOf(score).code;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={[type.headline, styles.ink]} accessibilityRole="header">
              신용등급
            </Text>
            <Text style={[type.caption, styles.muted]}>
              끝내면 오르고 미루면 깎여요.{score === null ? '' : ` 지금은 ${score}점이라 ${mine}예요.`}
            </Text>
          </View>
          <View style={styles.list}>
            {GRADES.map((g, i) => {
              const r = gradeRange(g.code);
              const me = g.code === mine;
              return (
                <View
                  key={g.code}
                  style={[styles.row, i > 0 && styles.rowBorder, me && styles.rowMine]}
                  accessible
                  accessibilityLabel={`${g.code}, ${r.min}점에서 ${r.max}점, ${g.title}${me ? ', 지금 내 등급' : ''}`}>
                  <Text style={[type.label, styles.grade, { color: GRADE_TONE[g.tone].fg }]}>{g.code}</Text>
                  <Text style={[type.caption, styles.flex, styles.ink]}>
                    {r.min}~{r.max.toLocaleString('ko-KR')}점, {g.title}
                  </Text>
                  {me ? <Text style={[type.caption, styles.me]}>지금</Text> : null}
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

const styles = themed(() => ({
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
  grade: { width: 40 },
  flex: { flex: 1 },
  ink: { color: color.textPrimary },
  muted: { color: color.textSecondary },
  me: { color: color.brandPrimary },
}));
