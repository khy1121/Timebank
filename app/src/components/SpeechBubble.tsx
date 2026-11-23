import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, stroke, type } from '@/theme/tokens';

/** 마스코트가 건네는 한마디. 문구는 미리 정한 목록에서 고른다. (FR-055) */
export function SpeechBubble({ text }: { text: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={text}>
      <Image source={require('@/assets/images/mascot-coin.png')} style={styles.mascot} contentFit="contain" accessible={false} />
      <View style={styles.bubble}>
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
    backgroundColor: color.mascotCream,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  text: { color: color.inkOutline },
});
