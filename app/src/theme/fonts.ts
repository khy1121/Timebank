import * as Font from 'expo-font';

import type { ThemeCode } from './themes';

/**
 * 테마 글꼴 파일. 한글 글꼴은 커서 기본 테마(말랑 저금통)와 시간 통장(Pretendard)만 처음에 불러오고,
 * 나머지는 그 테마를 고를 때 불러온다.
 */

const PRETENDARD = {
  'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.ttf'),
  'Pretendard-Medium': require('@/assets/fonts/Pretendard-Medium.ttf'),
  'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.ttf'),
  'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.ttf'),
  'Pretendard-ExtraBold': require('@/assets/fonts/Pretendard-ExtraBold.ttf'),
};

const MALLANG = {
  Jua: require('@expo-google-fonts/jua/400Regular/Jua_400Regular.ttf'),
  GowunDodum: require('@expo-google-fonts/gowun-dodum/400Regular/GowunDodum_400Regular.ttf'),
};

/** 처음에 불러올 글꼴 (앱 시작) */
export const STARTUP_FONTS = { ...PRETENDARD, ...MALLANG };

const THEME_FONTS: Record<ThemeCode, () => Record<string, number>> = {
  mallang: () => MALLANG,
  timebank: () => PRETENDARD,
  giro: () => ({
    BlackHanSans: require('@expo-google-fonts/black-han-sans/400Regular/BlackHanSans_400Regular.ttf'),
    'IBMPlexSansKR-Regular': require('@expo-google-fonts/ibm-plex-sans-kr/400Regular/IBMPlexSansKR_400Regular.ttf'),
    'IBMPlexSansKR-Medium': require('@expo-google-fonts/ibm-plex-sans-kr/500Medium/IBMPlexSansKR_500Medium.ttf'),
  }),
  notebook: () => ({
    'Gaegu-Bold': require('@expo-google-fonts/gaegu/700Bold/Gaegu_700Bold.ttf'),
    ...MALLANG,
  }),
  arcade: () => ({
    DoHyeon: require('@expo-google-fonts/do-hyeon/400Regular/DoHyeon_400Regular.ttf'),
    ...PRETENDARD,
  }),
};

export async function loadThemeFonts(code: ThemeCode): Promise<void> {
  const fonts = THEME_FONTS[code]();
  const missing = Object.fromEntries(Object.entries(fonts).filter(([name]) => !Font.isLoaded(name)));
  if (Object.keys(missing).length > 0) await Font.loadAsync(missing);
}
