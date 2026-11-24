import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { describeOutfit, type Outfit } from '@/domain/closet';
import { itemOf, WEAR_SLOTS } from '@/domain/shop';
import { useLook } from '@/store/look';
import { themed } from '@/theme/tokens';

/** 소품 그림. 모두 마스코트와 같은 512px 캔버스에 맞춰 그려져 있어서 그대로 겹치면 된다. */
const LAYERS: Record<string, number> = {
  beanie: require('@/assets/images/closet/beanie.png'),
  gat: require('@/assets/images/closet/gat.png'),
  crown: require('@/assets/images/closet/crown.png'),
  glasses: require('@/assets/images/closet/glasses.png'),
  raincoat: require('@/assets/images/closet/raincoat.png'),
  banker: require('@/assets/images/closet/banker.png'),
};
const BASE = require('@/assets/images/closet/base.png');
// 모자를 쓰면 새싹이 모자 뒤로 비치지 않도록 새싹 없는 몸을 쓴다
const BASE_NO_SPROUT = require('@/assets/images/closet/base-nosprout.png');

type Props = {
  size: number;
  /** 넘기지 않으면 저장된 착용 모습 */
  outfit?: Outfit;
  /** 값이 바뀔 때마다 통통 튄다 */
  bounceKey?: number;
  /** 새로 입힌 소품이 위에서 떨어지듯 나타난다 (옷장에서만) */
  animateLayers?: boolean;
};

/** 마스코트. 몸 → 얼굴 → 머리 순서로 소품을 겹친다. (FR-064, FR-071) */
export function Mascot({ size, outfit, bounceKey = 0, animateLayers = false }: Props) {
  const look = useLook();
  const worn = outfit ?? look.outfit;
  const scale = useSharedValue(1);

  useEffect(() => {
    if (bounceKey === 0) return;
    scale.set(withSequence(withTiming(1.1, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 220 })));
  }, [bounceKey, scale]);

  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const box = { width: size, height: size };

  return (
    <Animated.View style={[box, bounce]} accessible accessibilityRole="image" accessibilityLabel={describeOutfit(worn)}>
      <Image source={itemOf(worn.head)?.value ? BASE_NO_SPROUT : BASE} style={[styles.layer, box]} contentFit="contain" accessible={false} />
      {WEAR_SLOTS.map((slot) => {
        const value = itemOf(worn[slot])?.value;
        const src = value ? LAYERS[value] : undefined;
        if (!src) return null;
        return animateLayers ? (
          <Animated.View key={worn[slot]} entering={FadeInDown.springify().damping(12)} style={[styles.layer, box]}>
            <Image source={src} style={box} contentFit="contain" accessible={false} />
          </Animated.View>
        ) : (
          <View key={worn[slot]} style={[styles.layer, box]}>
            <Image source={src} style={box} contentFit="contain" accessible={false} />
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = themed(() => ({
  layer: { position: 'absolute', top: 0, left: 0 },
}));
