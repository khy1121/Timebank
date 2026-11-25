import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { color, radius, shadow, themed, type } from '@/theme/tokens';

/** 칸 고르기. 연한 바탕 위에서 고른 칸만 하얗게 떠 있다 (피그마 v6 고르기 탭) */
export function Segmented<K extends string>({ items, value, onChange }: { items: { key: K; label: string }[]; value: K; onChange: (key: K) => void }) {
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segItem, on && styles.segOn]}>
            <Text style={[type.label, { color: on ? color.textPrimary : color.textSecondary }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themed(() => ({
  seg: { flex: 1, flexDirection: 'row', padding: 4, borderRadius: radius.full, backgroundColor: color.bgSunken },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.full },
  segOn: { backgroundColor: color.bgPage, ...(shadow.card ? { boxShadow: shadow.card } : {}) },
}));
