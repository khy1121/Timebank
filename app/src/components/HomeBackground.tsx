import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

import { useLook } from '@/store/look';
import { color } from '@/theme/tokens';

/** 홈 배경 무늬 그림. 모두 이음새 없이 이어지는 512px 타일이다. */
export const BACKGROUNDS: Record<string, number> = {
  'bg-coins': require('@/assets/images/backgrounds/bg-coins.png'),
  'bg-hanji': require('@/assets/images/backgrounds/bg-hanji.png'),
  'bg-clouds': require('@/assets/images/backgrounds/bg-clouds.png'),
  'bg-night': require('@/assets/images/backgrounds/bg-night.png'),
};

// 글자가 잘 보이도록 연하게 깐다. 어두운 밤하늘은 조금 더 연하게.
const OPACITY: Record<string, number> = { 'bg-coins': 0.07, 'bg-hanji': 0.55, 'bg-clouds': 0.16, 'bg-night': 0.1 };

/** 홈 화면 뒤에 상점에서 산 배경 무늬를 깐다. (FR-064, 상점기획서 3.3) */
export function HomeBackground({ children }: { children: ReactNode }) {
  const { background } = useLook();
  return (
    <ImageBackground
      source={BACKGROUNDS[background] ?? BACKGROUNDS['bg-coins']}
      resizeMode="repeat"
      style={styles.fill}
      imageStyle={{ opacity: OPACITY[background] ?? 0.07 }}
      accessible={false}>
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bgPage },
});
