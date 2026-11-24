import { StyleSheet, type TextStyle } from 'react-native';

import { DEFAULT_THEME, THEMES, type ThemeCode, type ThemeDef } from './themes';

/**
 * 디자인 토큰. 값은 지금 테마(themes.ts)에서 온다. (화면설계서 10절, 상점기획서 11.3절)
 * 테마를 바꾸면 applyTheme이 아래 객체들의 값을 그 자리에서 바꾼다. 그래서 color.brandPrimary처럼 그리는 순간에 읽는 값은
 * 바로 바뀌고, 화면의 스타일 묶음은 themed()로 만들어 테마가 바뀔 때 다시 계산한다.
 * 모듈을 불러올 때 한 번만 읽어 상수에 넣으면(예: const X = { fg: color.okFg }) 테마가 바뀌어도 그대로라 쓰지 않는다.
 */

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
/** a에 b를 t만큼 섞는다 (t=0이면 a) */
export const mix = (a: string, b: string, t: number) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};

function buildColor(th: ThemeDef) {
  const v = th.v6;
  return {
    bgPage: v.white,
    bgSurface: v.cream,
    bgSunken: v.sand,
    textPrimary: v.ink,
    textSecondary: v.sub,
    textTertiary: v.mute,
    textOnPrimary: '#FFFFFF',
    borderDefault: mix(v.cream, v.ink, 0.12),
    brandPrimary: v.brand,
    brandPressed: v.brandDeep,
    brandSoft: mix(v.brand, '#FFFFFF', 0.86),
    debtFg: v.bad,
    debtBg: v.rose,
    debtPressed: mix(v.bad, '#000000', 0.2),
    okFg: v.ok,
    okBg: mix(v.ok, '#FFFFFF', 0.86),
    inkOutline: v.line,
    mascotCream: '#FFF1CF',
    accentCoin: v.coin,
    accentCoinDeep: v.warn,
    accentCheek: '#FF8A3D',
    accentSprout: v.ok,
    // 홈 무대 (피그마 v6/sky, v6/hill)
    stageSky: v.sky,
    stageHill: v.hill,
    // 상점 꾸미기 (domain/shop.ts의 value와 같은 이름). 테마와 상관없다
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
  };
}

const t = (fontFamily: string, fontSize: number, lineHeight: number, letterSpacing = 0): TextStyle => ({
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
});

function buildFont(th: ThemeDef) {
  const f = th.fonts;
  if (f.weighted) {
    return { regular: 'Pretendard-Regular', medium: 'Pretendard-Medium', semiBold: 'Pretendard-SemiBold', bold: 'Pretendard-Bold', extraBold: 'Pretendard-ExtraBold' };
  }
  // 굵기가 하나뿐인 글꼴: 제목·숫자는 display, 본문은 body
  return { regular: f.body, medium: f.bodyMedium, semiBold: f.display, bold: f.display, extraBold: f.display };
}

function buildType(font: ReturnType<typeof buildFont>, scale = 1) {
  // 제목·숫자 글꼴만 키운다. 본문 글꼴은 그대로
  const d = (fontFamily: string, size: number, line: number, spacing = 0) => t(fontFamily, Math.round(size * scale), Math.round(line * scale), spacing);
  return {
    display: d(font.bold, 36, 44),
    title: d(font.bold, 22, 30),
    headline: d(font.semiBold, 17, 24),
    body: t(font.regular, 16, 24),
    label: t(font.medium, 14, 20),
    caption: t(font.regular, 13, 18),
    numberXL: d(font.extraBold, 44, 48, -0.88),
    numberL: d(font.bold, 28, 34, -0.42),
    numberM: d(font.bold, 18, 24, -0.18),
    unitL: d(font.semiBold, 20, 48),
    unitM: d(font.semiBold, 15, 34),
    unitS: t(font.medium, 12, 24),
    stamp: d(font.extraBold, 15, 18, 0.3),
  };
}

const first = THEMES[DEFAULT_THEME];

export const color = buildColor(first);
export const radius = { ...first.radius };
export const stroke = { ...first.stroke };
export const font = buildFont(first);
export const type = buildType(font);
export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 } as const;

/** 지금 테마의 그림자 값 */
export const shadow = { card: first.cardShadow as string | null, drop: first.buttonDrop as ThemeDef['buttonDrop'] };

let current: ThemeCode = DEFAULT_THEME;
let version = 0;

export function currentTheme(): ThemeCode {
  return current;
}

/** 테마가 바뀔 때마다 오르는 수. 스타일 묶음을 다시 계산할지 정할 때 쓴다 */
export function themeVersion(): number {
  return version;
}

const listeners = new Set<() => void>();
export function onThemeChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 토큰 값을 그 자리에서 바꾼다. 글꼴은 먼저 loadThemeFonts로 불러 둔다 */
export function applyTheme(code: ThemeCode): void {
  const th = THEMES[code];
  Object.assign(color, buildColor(th));
  Object.assign(radius, th.radius);
  Object.assign(stroke, th.stroke);
  Object.assign(font, buildFont(th));
  Object.assign(type, buildType(font, th.fonts.displayScale ?? 1));
  shadow.card = th.cardShadow;
  shadow.drop = th.buttonDrop;
  current = code;
  version += 1;
  for (const fn of listeners) fn();
}

/** 누르는 버튼 아래 딱 떨어지는 그림자. 테마에 없으면 빈 스타일 */
export const hardShadow = (offsetY = 3) =>
  shadow.drop ? { boxShadow: `${shadow.drop.x}px ${shadow.drop.y || offsetY}px 0px 0px ${shadow.drop.color}` } : {};

/**
 * 테마를 따라가는 스타일 묶음. StyleSheet.create 대신 쓴다.
 * 처음 읽을 때 계산하고, 테마가 바뀐 뒤 처음 읽을 때 다시 계산한다.
 */
type Styles = Parameters<typeof StyleSheet.create>[0];

export function themed<S extends Styles>(factory: () => S & Styles): Readonly<S> {
  let cached: Readonly<S> | null = null;
  let at = -1;
  const get = (): Readonly<S> => {
    if (!cached || at !== version) {
      cached = StyleSheet.create(factory());
      at = version;
    }
    return cached;
  };
  return new Proxy({} as Readonly<S>, {
    get: (_target, prop) => get()[prop as keyof S],
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_target, prop) => ({ enumerable: true, configurable: true, value: get()[prop as keyof S] }),
  });
}

/**
 * 테마 색을 담은 상수 묶음(예: 상태별 글자색 표). 모듈을 불러올 때 값을 굳히지 않고, 테마가 바뀌면 다시 계산한다.
 */
export function live<T extends object>(factory: () => T): T {
  let cached: T | null = null;
  let at = -1;
  const get = (): T => {
    if (!cached || at !== version) {
      cached = factory();
      at = version;
    }
    return cached;
  };
  return new Proxy({} as T, {
    get: (_target, prop) => get()[prop as keyof T],
    has: (_target, prop) => prop in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_target, prop) => ({ enumerable: true, configurable: true, value: get()[prop as keyof T] }),
  });
}

/**
 * 한 줄 입력칸 글자. iOS는 한 줄 TextInput에 lineHeight를 주면 글자가 세로 가운데보다 아래로 처진다.
 * 그래서 줄 높이를 빼고, 안드로이드는 글꼴 여백을 없애고 가운데로 맞춘다. (2026-11-24 휴대폰 확인)
 */
const oneLine = ({ lineHeight: _lineHeight, ...rest }: TextStyle): TextStyle => ({
  ...rest,
  includeFontPadding: false,
  textAlignVertical: 'center',
});
export const inputType = {
  get body() {
    return oneLine(type.body);
  },
  get title() {
    return oneLine(type.title);
  },
};
