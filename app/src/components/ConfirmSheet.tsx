import { Modal, Pressable, Text, View } from 'react-native';

import { color, radius, stroke, themed, type } from '@/theme/tokens';

import { Button } from './Button';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 되돌릴 수 없는 행동 앞에서 한 번 더 묻는 창. 삭제·탕감에만 쓴다. */
export function ConfirmSheet({ visible, title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="닫기">
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
          <Text style={[type.title, styles.title]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[type.body, styles.message]}>{message}</Text>
          <View style={styles.actions}>
            <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} />
            <Button label="그만두기" variant="secondary" onPress={onCancel} />
          </View>
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
    padding: 24,
    gap: 12,
  },
  title: { color: color.textPrimary },
  message: { color: color.textSecondary },
  actions: { gap: 12, marginTop: 8 },
}));
