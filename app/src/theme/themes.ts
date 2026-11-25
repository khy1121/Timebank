/**
 * 테마 다섯 가지. 피그마 "v6 말랑 저금통" 변수 컬렉션의 모드와 같은 값이다(상점기획서 11.3절, 화면설계서 10절).
 * 테마는 색·글꼴·모서리·테두리·그림자만 바꾸고 화면 짜임은 그대로다.
 * 피그마 값(v6/*)을 앱 토큰 이름(bgPage, brandPrimary …)으로 옮기는 일은 tokens.ts의 buildTokens가 한다.
 */

export type ThemeCode = 'mallang' | 'timebank' | 'giro' | 'notebook' | 'arcade';

export const DEFAULT_THEME: ThemeCode = 'mallang';

export type FontSet = {
  /** 제목·숫자 */
  display: string;
  /** 본문 */
  body: string;
  /** 본문 중간 굵기(라벨). 없으면 body */
  bodyMedium: string;
  /** 시간 통장처럼 굵기를 나눠 쓰는 글꼴이면 true (제목은 Bold, 큰 숫자는 ExtraBold) */
  weighted?: boolean;
  /** 제목·숫자 글꼴의 글자가 작게 그려지면 키우는 비율 (손글씨 Gaegu) */
  displayScale?: number;
  /**
   * 제목 글꼴 글자가 줄 가운데보다 위(+면 아래로 내림)에 그려지는 정도. 글자 크기에 곱한다.
   * 도장처럼 글자를 테두리 한가운데 두어야 할 때 쓴다. 글꼴 위아래 여백 값으로 잰 것
   */
  centerNudge?: number;
};

export type ThemeDef = {
  code: ThemeCode;
  name: string;
  /** v6 변수 값 */
  v6: {
    sky: string;
    hill: string;
    white: string;
    cream: string;
    sand: string;
    rose: string;
    brand: string;
    brandDeep: string;
    coin: string;
    ok: string;
    warn: string;
    bad: string;
    ink: string;
    sub: string;
    mute: string;
    line: string;
    silver: string;
    bronze: string;
    /** 아래 탭에서 고른 칸의 바탕과 글자 */
    tabOn: string;
    tabOnText: string;
  };
  radius: { sm: number; md: number; lg: number; xl: number; full: number };
  stroke: { outline: number; hairline: number };
  /** 카드 아래 그림자. 없으면 null */
  cardShadow: string | null;
  /** 누르는 버튼 아래 딱 떨어지는 그림자 색과 거리. 없으면 null */
  buttonDrop: { color: string; x: number; y: number } | null;
  fonts: FontSet;
};

export const THEMES: Record<ThemeCode, ThemeDef> = {
  mallang: {
    code: 'mallang',
    name: '말랑 저금통',
    v6: {
      sky: '#D6EEFF', hill: '#8FE0B5', white: '#FFFFFF', cream: '#FFF6EA', sand: '#F4EADF', rose: '#FFE4E0',
      brand: '#FF7A45', brandDeep: '#D45A2A', coin: '#FFD45C', ok: '#22B585', warn: '#E39A00', bad: '#F0524F',
      ink: '#3A2A1E', sub: '#7A6657', mute: '#B5A596', line: '#3A2A1E', silver: '#C9CFD8', bronze: '#E0A679', tabOn: '#FF7A45', tabOnText: '#FFFFFF',
    },
    radius: { sm: 10, md: 16, lg: 22, xl: 28, full: 999 },
    stroke: { outline: 0, hairline: 0 },
    cardShadow: '0px 4px 0px 0px rgba(58, 42, 30, 0.14)',
    buttonDrop: { color: '#D45A2A', x: 0, y: 4 },
    fonts: { display: 'Jua', body: 'GowunDodum', bodyMedium: 'GowunDodum', centerNudge: 0.07 },
  },
  timebank: {
    code: 'timebank',
    name: '시간 통장',
    v6: {
      sky: '#EEF3EC', hill: '#D5E2D6', white: '#FBFDF9', cream: '#F3F7F1', sand: '#E2EAE1', rose: '#F7E3DF',
      brand: '#2F6B57', brandDeep: '#1F4D3D', coin: '#E2A93B', ok: '#2F6B57', warn: '#A8741A', bad: '#C8372D',
      ink: '#22302C', sub: '#56645F', mute: '#8A9791', line: '#22302C', silver: '#C8D2CC', bronze: '#D9B48A', tabOn: '#E2A93B', tabOnText: '#22302C',
    },
    radius: { sm: 4, md: 6, lg: 6, xl: 6, full: 6 },
    stroke: { outline: 1, hairline: 1 },
    cardShadow: null,
    buttonDrop: null,
    fonts: { display: 'Pretendard-Bold', body: 'Pretendard-Regular', bodyMedium: 'Pretendard-Medium', weighted: true },
  },
  giro: {
    code: 'giro',
    name: '지로 고지서',
    v6: {
      sky: '#FFFFFF', hill: '#FDEDF1', white: '#FFFFFF', cream: '#FFF7F9', sand: '#F4F4F4', rose: '#FFE0E0',
      brand: '#000000', brandDeep: '#000000', coin: '#FFD400', ok: '#1C4FD8', warn: '#A85F00', bad: '#E0202A',
      ink: '#000000', sub: '#555555', mute: '#999999', line: '#E8486B', silver: '#D9D9D9', bronze: '#F3A9B8', tabOn: '#FFD400', tabOnText: '#000000',
    },
    radius: { sm: 0, md: 0, lg: 0, xl: 0, full: 0 },
    stroke: { outline: 1.5, hairline: 1 },
    cardShadow: null,
    buttonDrop: null,
    fonts: { display: 'BlackHanSans', body: 'IBMPlexSansKR-Regular', bodyMedium: 'IBMPlexSansKR-Medium', centerNudge: 0.1 },
  },
  notebook: {
    code: 'notebook',
    name: '방학 숙제 공책',
    v6: {
      sky: '#FCFDFE', hill: '#DCE7F4', white: '#FFFFFF', cream: '#FFFBE0', sand: '#EEF2F7', rose: '#FFE3E3',
      brand: '#2456C8', brandDeep: '#2B2F3A', coin: '#FFE55C', ok: '#1F8A4C', warn: '#B86E00', bad: '#E0393E',
      ink: '#2B2F3A', sub: '#5C6373', mute: '#9AA1AE', line: '#2B2F3A', silver: '#D5DCE6', bronze: '#E3B58F', tabOn: '#FFE55C', tabOnText: '#2B2F3A',
    },
    radius: { sm: 6, md: 10, lg: 10, xl: 16, full: 14 },
    stroke: { outline: 1.5, hairline: 1 },
    cardShadow: '2px 3px 0px 0px #2B2F3A',
    buttonDrop: { color: '#2B2F3A', x: 2, y: 3 },
    fonts: { display: 'Gaegu-Bold', body: 'GowunDodum', bodyMedium: 'GowunDodum', displayScale: 1.2, centerNudge: -0.04 },
  },
  arcade: {
    code: 'arcade',
    name: '오락실 저금통',
    v6: {
      sky: '#EEF1FF', hill: '#C9D2FF', white: '#FFFFFF', cream: '#F4F6FF', sand: '#DDE3FF', rose: '#FFE1E1',
      brand: '#2B4BFF', brandDeep: '#14142B', coin: '#FFC83D', ok: '#12995A', warn: '#E08A00', bad: '#F03E3E',
      ink: '#14142B', sub: '#4A4A68', mute: '#8C8CA6', line: '#14142B', silver: '#C9CFD8', bronze: '#E0A679', tabOn: '#FFC83D', tabOnText: '#14142B',
    },
    radius: { sm: 0, md: 0, lg: 0, xl: 0, full: 0 },
    stroke: { outline: 3, hairline: 2 },
    cardShadow: '4px 4px 0px 0px #14142B',
    buttonDrop: { color: '#14142B', x: 4, y: 4 },
    fonts: { display: 'DoHyeon', body: 'Pretendard-Regular', bodyMedium: 'Pretendard-Medium', centerNudge: 0.05 },
  },
};

/** 상점 진열 순서(개발 난이도 순, 상점기획서 11.3절) */
export const THEME_ORDER: ThemeCode[] = ['mallang', 'timebank', 'giro', 'notebook', 'arcade'];

export function toThemeCode(value: string | null | undefined): ThemeCode {
  return value && value in THEMES ? (value as ThemeCode) : DEFAULT_THEME;
}
