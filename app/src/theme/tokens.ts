import type { TextStyle } from 'react-native';

/**
 * 디자인 토큰. 피그마 "시간은행" 파일의 변수와 같은 이름·값이다.
 * (화면설계서 8절 확정 색 값, 디자인방향 4절)
 */
export const color = {
  bgPage: '#F4F6FA',
  bgSurface: '#FFFFFF',
  bgSunken: '#E9EDF4',
  textPrimary: '#111827',
  textSecondary: '#5B6472',
  textTertiary: '#9AA3B2',
  textOnPrimary: '#FFFFFF',
  borderDefault: '#E1E6EF',
  brandPrimary: '#3257F5',
  brandPressed: '#1F3FD0',
  brandSoft: '#E6ECFF',
  debtFg: '#E5484D',
  debtBg: '#FDECEC',
  debtPressed: '#B8343A',
  okFg: '#12A150',
  okBg: '#E4F6EA',
  inkOutline: '#16224A',
  mascotCream: '#FFF1CF',
  accentCoin: '#F5B93A',
  accentCoinDeep: '#C98A12',
  accentCheek: '#FF8A3D',
  accentSprout: '#3DAA5C',
  // 상점 꾸미기 (domain/shop.ts의 value와 같은 이름)
  inkRed: '#E5484D',
  inkBlue: '#2F47B8',
  inkGreen: '#1E8A4E',
  inkGold: '#B9861A',
  bubbleCream: '#FFF1CF',
  bubbleSky: '#DDEBFF',
  bubbleMint: '#DCF4E5',
  bubblePink: '#FFE2EC',
  // 카카오 로그인 버튼 (카카오 디자인 가이드의 지정 색)
  kakaoYellow: '#FEE500',
  kakaoYellowPressed: '#D9C300',
  kakaoLabel: '#191919',
} as const;

export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 } as const;

export const radius = { sm: 6, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const stroke = { outline: 2, hairline: 1 } as const;

export const font = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semiBold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extraBold: 'Pretendard-ExtraBold',
} as const;

/** 번지지 않는 단단한 그림자. 마스코트 외곽선과 같은 색. */
export const hardShadow = (offsetY = 3) => ({ boxShadow: `0px ${offsetY}px 0px 0px ${color.inkOutline}` });

const t = (fontFamily: string, fontSize: number, lineHeight: number, letterSpacing = 0): TextStyle => ({
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
});

/** 글자 스타일. 피그마의 텍스트 스타일과 같은 이름. */
export const type = {
  display: t(font.bold, 36, 44),
  title: t(font.bold, 22, 30),
  headline: t(font.semiBold, 17, 24),
  body: t(font.regular, 16, 24),
  label: t(font.medium, 14, 20),
  caption: t(font.regular, 13, 18),
  numberXL: t(font.extraBold, 44, 48, -0.88),
  numberL: t(font.bold, 28, 34, -0.42),
  numberM: t(font.bold, 18, 24, -0.18),
  unitL: t(font.semiBold, 20, 48),
  unitM: t(font.semiBold, 15, 34),
  unitS: t(font.medium, 12, 24),
  stamp: t(font.extraBold, 15, 18, 0.3),
} as const;
