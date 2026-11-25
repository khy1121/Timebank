import { Modal, Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { color, radius, stroke, themed, type } from '@/theme/tokens';

export type SheetAction = { label: string; danger?: boolean; onPress: () => void };

type Props = { visible: boolean; title?: string; actions: SheetAction[]; onClose: () => void };

/** 고를 것이 여러 개인 아래쪽 창. 인증의 신고·차단·삭제 같은 것에 쓴다. */
export function ActionSheet({ visible, title, actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기">
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
          {title ? (
            <Text style={[type.headline, styles.title]} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {actions.map((a, i) => (
            <Pressable
              key={a.label}
              onPress={() => {
                onClose();
                a.onPress();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, (i > 0 || title) && styles.rowBorder, pressed && styles.pressed]}>
              <Text style={[type.body, { color: a.danger ? color.debtFg : color.textPrimary }]}>{a.label}</Text>
            </Pressable>
          ))}
          <View style={styles.rowBorder} />
          <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Text style={[type.body, styles.cancel]}>그만두기</Text>
          </Pressable>
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
    paddingVertical: 8,
    overflow: 'hidden',
  },
  title: { color: color.textPrimary, paddingHorizontal: 20, paddingVertical: 12 },
  row: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 20 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  pressed: { backgroundColor: color.bgSunken },
  cancel: { color: color.textSecondary },
}));
