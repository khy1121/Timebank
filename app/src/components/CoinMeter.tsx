import { StyleSheet, View } from 'react-native';

import type { Importance } from '@/domain/interest';
import { color, radius } from '@/theme/tokens';

/** 중요도를 엽전 개수로 보여준다. 엽전 1개 = 원금 1,000냥. (FR-020) */
export function CoinMeter({ level }: { level: Importance }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`중요도 ${level}`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= level;
        return (
          <View key={i} style={[styles.coin, on ? styles.coinOn : styles.coinOff]}>
            <View style={[styles.hole, on ? styles.holeOn : styles.holeOff]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  coin: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinOn: { backgroundColor: color.accentCoin, borderColor: color.inkOutline },
  coinOff: { backgroundColor: color.bgSunken, borderColor: color.borderDefault },
  hole: { width: 7, height: 7, borderRadius: 1, borderWidth: 1.5 },
  holeOn: { backgroundColor: color.mascotCream, borderColor: color.inkOutline },
  holeOff: { backgroundColor: color.bgSurface, borderColor: color.borderDefault },
});
