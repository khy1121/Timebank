import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useLook } from '@/store/look';
import { color, radius, stroke, type } from '@/theme/tokens';

/**
 * 마스코트가 건네는 한마디. 문구는 미리 정한 목록에서 고른다. (FR-055)
 * 말풍선 색은 상점에서 산 것으로 바꿀 수 있다. (FR-064)
 */
export function SpeechBubble({ text, tint }: { text: string; tint?: string }) {
  const look = useLook();
  return (
    <View style={styles.row} accessible accessibilityLabel={text}>
      <Image source={require('@/assets/images/mascot-coin.png')} style={styles.mascot} contentFit="contain" accessible={false} />
      <View style={[styles.bubble, { backgroundColor: tint ?? look.bubbleColor }]}>
        <Text style={[type.body, styles.text]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  mascot: { width: 60, height: 60 },
  bubble: {
    flex: 1,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  text: { color: color.inkOutline },
});
