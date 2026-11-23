import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

type Props = {
  /** none: 탭 화면처럼 돌아갈 곳이 없을 때 */
  lead?: 'back' | 'close' | 'none';
  title?: string;
  onLead?: () => void;
  action?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

/** 화면 상단. 뒤로 가기 또는 닫기, 제목, 오른쪽 행동 하나. 탭 화면은 lead='none'으로 제목만 크게 보인다. */
export function TopBar({ lead = 'back', title, onLead, action, onAction, actionDisabled }: Props) {
  return (
    <View style={[styles.bar, lead === 'none' && styles.barTab]}>
      {lead === 'none' ? null : (
      <Pressable
        onPress={onLead}
        accessibilityRole="button"
        accessibilityLabel={lead === 'back' ? '뒤로 가기' : '닫기'}
        hitSlop={10}
        style={styles.lead}>
        <Text style={styles.glyph}>{lead === 'back' ? '‹' : '✕'}</Text>
      </Pressable>
      )}
      <Text style={[lead === 'none' ? type.title : type.headline, styles.title]} numberOfLines={1} accessibilityRole="header">
        {title ?? ''}
      </Text>
      {action ? (
        <Pressable
          onPress={onAction}
          disabled={actionDisabled}
          accessibilityRole="button"
          accessibilityLabel={action}
          accessibilityState={{ disabled: !!actionDisabled }}
          hitSlop={10}>
          <Text style={[type.headline, { color: actionDisabled ? color.textTertiary : color.brandPrimary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 16 },
  barTab: { paddingLeft: 16 },
  lead: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 26, lineHeight: 30, color: color.inkOutline, fontFamily: type.body.fontFamily },
  title: { flex: 1, color: color.textPrimary },
});
