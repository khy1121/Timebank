import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { color, radius, themed, type } from '@/theme/tokens';

type Props = { text: string; actionLabel?: string; onAction?: () => void };

/** 화면 아래에 잠깐 뜨는 알림. 되돌리기 같은 행동 하나를 가질 수 있다. (FR-015) */
export function Snackbar({ text, actionLabel, onAction }: Props) {
  return (
    <View style={styles.bar} accessibilityRole="alert">
      <Text style={[type.label, styles.text]}>{text}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={12}>
          <Text style={[type.label, styles.action]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themed(() => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: color.inkOutline,
  },
  text: { flex: 1, color: color.textOnPrimary },
  action: { color: color.accentCoin },
}));
