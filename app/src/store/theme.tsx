import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loadThemeFonts } from '@/theme/fonts';
import { DEFAULT_THEME, toThemeCode, type ThemeCode } from '@/theme/themes';
import { applyTheme } from '@/theme/tokens';

/**
 * 지금 테마 (FR-112). 이 기기에 저장해 두고 앱을 켤 때 그 테마로 시작한다.
 * 테마를 바꾸면 토큰 값을 바꾼 뒤 version을 올린다. 화면들은 version을 key로 다시 그려져 새 색·글꼴이 바로 보인다.
 */

const KEY = 'todo-interest/theme';

type Store = {
  theme: ThemeCode;
  /** 테마가 바뀔 때마다 오른다. 화면을 다시 그릴 key로 쓴다 */
  version: number;
  /** 테마 글꼴을 불러온 뒤 바꾼다. 실패하면 false */
  setTheme: (code: ThemeCode) => Promise<boolean>;
};

const ThemeContext = createContext<Store | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeCode | null>(null);
  const [version, setVersion] = useState(0);

  // 저장된 테마로 시작한다. 글꼴을 못 불러오면 기본 테마로
  useEffect(() => {
    let active = true;
    (async () => {
      let code = DEFAULT_THEME;
      try {
        code = toThemeCode(await AsyncStorage.getItem(KEY));
        await loadThemeFonts(code);
      } catch (e) {
        console.warn('저장된 테마를 불러오지 못했어요', e);
        code = DEFAULT_THEME;
      }
      if (!active) return;
      applyTheme(code);
      setThemeState(code);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback(async (code: ThemeCode) => {
    try {
      await loadThemeFonts(code);
    } catch (e) {
      console.warn('테마 글꼴을 불러오지 못했어요', e);
      return false;
    }
    applyTheme(code);
    setThemeState(code);
    setVersion((v) => v + 1);
    AsyncStorage.setItem(KEY, code).catch((e) => console.warn('테마를 저장하지 못했어요', e));
    return true;
  }, []);

  const store = useMemo<Store | null>(() => (theme ? { theme, version, setTheme } : null), [theme, version, setTheme]);
  // 테마를 정하기 전에는 아무것도 그리지 않는다(기본 테마가 잠깐 보였다 바뀌지 않게)
  if (!store) return null;
  return <ThemeContext.Provider value={store}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Store {
  const store = useContext(ThemeContext);
  if (!store) throw new Error('ThemeProvider 안에서만 쓸 수 있어요');
  return store;
}
