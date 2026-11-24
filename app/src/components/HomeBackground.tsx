import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLook } from '@/store/look';
import { color, themed } from '@/theme/tokens';

/** 홈 배경 무늬 그림. 모두 이음새 없이 이어지는 512px 타일이다. */
export const BACKGROUNDS: Record<string, number> = {
  'bg-coins': require('@/assets/images/backgrounds/bg-coins.png'),
  'bg-hanji': require('@/assets/images/backgrounds/bg-hanji.png'),
  'bg-clouds': require('@/assets/images/backgrounds/bg-clouds.png'),
  'bg-night': require('@/assets/images/backgrounds/bg-night.png'),
};

// 글자가 잘 보이도록 연하게 깐다. 어두운 밤하늘은 조금 더 연하게.
const OPACITY: Record<string, number> = { 'bg-coins': 0.07, 'bg-hanji': 0.55, 'bg-clouds': 0.16, 'bg-night': 0.1 };

/** 타일 한 장의 화면 크기. 그림은 512px이고 화면에는 이 크기로 이어 붙인다 */
const TILE = 256;

/**
 * 홈 화면 뒤에 상점에서 산 배경 무늬를 깐다. (FR-064, 상점기획서 3.3)
 * 이미지의 repeat 모드는 웹에서 한 장만 그려져서, 화면 크기에 맞춰 타일을 직접 늘어놓는다.
 */
export function HomeBackground({ children }: { children: ReactNode }) {
  const { background } = useLook();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const source = BACKGROUNDS[background] ?? BACKGROUNDS['bg-coins'];
  const cols = Math.ceil(size.w / TILE);
  const rows = Math.ceil(size.h / TILE);
  return (
    <View style={styles.fill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* 마지막 줄·칸의 타일이 화면 밖으로 넘친다. 잘라 두지 않으면 웹에서 창이 뜰 때 화면이 옆으로 밀린다 */}
      <View style={[StyleSheet.absoluteFill, styles.clip, { opacity: OPACITY[background] ?? 0.07 }]} pointerEvents="none" accessible={false}>
        {Array.from({ length: rows * cols }, (_, i) => (
          <Image
            key={i}
            source={source}
            style={[styles.tile, { left: (i % cols) * TILE, top: Math.floor(i / cols) * TILE }]}
            contentFit="cover"
            accessible={false}
          />
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = themed(() => ({
  fill: { flex: 1, backgroundColor: color.bgPage },
  clip: { overflow: 'hidden' },
  tile: { position: 'absolute', width: TILE, height: TILE },
}));
