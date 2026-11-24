import { outfitOf, type Outfit } from '@/domain/closet';
import { resolveLook, type Look } from '@/domain/shop';
import { toShape, type StampShape } from '@/domain/stampShape';
import { color } from '@/theme/tokens';

import { useProfile } from './profile';
import { useTodos } from './todos';
import { toThemeCode, type ThemeCode } from '@/theme/themes';

export type ColorToken = keyof typeof color;

/** 색 토큰 이름을 실제 색으로. 모르는 이름이면 기본 색. */
export function tokenColor(name: string, fallback: string): string {
  return (color as Record<string, string>)[name] ?? fallback;
}

/**
 * 지금 착용한 꾸미기. 가지지 않은 물건이면 기본 물건으로 보인다. (FR-064)
 * 설정을 아직 못 읽었거나 로그인 전이면 전부 기본 물건이다.
 */
export function useLook(): {
  items: Look;
  outfit: Outfit;
  inkColor: string;
  stampWord: string;
  stampShape: StampShape;
  bubbleColor: string;
  /** 홈 배경 그림 이름 (bg-coins 등) */
  background: string;
  /** 고른 테마 (FR-112) */
  theme: ThemeCode;
} {
  const { profile } = useProfile();
  const { owned } = useTodos();
  const items = resolveLook(profile?.equipped ?? {}, owned);
  return {
    items,
    outfit: outfitOf(profile?.equipped ?? {}, owned),
    inkColor: tokenColor(items.stampInk.value, color.inkRed),
    stampWord: items.stampWord.value,
    stampShape: toShape(items.stampShape.value),
    background: items.background.value,
    theme: toThemeCode(items.theme.value),
    bubbleColor: tokenColor(items.bubble.value, color.bubbleCream),
  };
}
