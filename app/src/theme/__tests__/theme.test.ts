import { itemsOf } from '@/domain/shop';

import { loadThemeFonts } from '../fonts';
import { DEFAULT_THEME, THEME_ORDER, THEMES, toThemeCode, type ThemeCode } from '../themes';
import { applyTheme, color, currentTheme, font, live, onThemeChange, radius, themed, themeVersion, tokensFor, type } from '../tokens';

// 글꼴은 실제로 불러오지 않고, 어떤 이름을 불러 달라고 했는지만 본다
const mockLoaded = new Set<string>();
const mockRequested: string[][] = [];
jest.mock('expo-font', () => ({
  isLoaded: (name: string) => mockLoaded.has(name),
  loadAsync: async (map: Record<string, number>) => {
    mockRequested.push(Object.keys(map));
    for (const k of Object.keys(map)) mockLoaded.add(k);
  },
}));

const CODES = Object.keys(THEMES) as ThemeCode[];

/** WCAG 상대 휘도 */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

afterEach(() => applyTheme(DEFAULT_THEME));

describe('테마 목록 (FR-112)', () => {
  it('코드와 열쇠가 같고, 순서 목록과 상점 물건이 다섯 테마를 모두 담는다', () => {
    for (const c of CODES) expect(THEMES[c].code).toBe(c);
    expect([...THEME_ORDER].sort()).toEqual([...CODES].sort());
    const shop = itemsOf('theme');
    expect(shop.map((i) => i.value).sort()).toEqual([...CODES].sort());
    for (const i of shop) expect(i.name).toBe(THEMES[i.value as ThemeCode].name);
  });

  it('모르는 값은 기본 테마(말랑 저금통)로 본다', () => {
    expect(toThemeCode('arcade')).toBe('arcade');
    expect(toThemeCode('neon')).toBe(DEFAULT_THEME);
    expect(toThemeCode(null)).toBe(DEFAULT_THEME);
    expect(DEFAULT_THEME).toBe('mallang');
  });

  it('색은 모두 #RRGGBB이고, 본문 글자는 바탕과 대비 4.5:1 이상이다 (NFR-007)', () => {
    for (const c of CODES) {
      const v = THEMES[c].v6;
      for (const [k, hex] of Object.entries(v)) expect([c, k, /^#[0-9A-F]{6}$/i.test(hex)]).toEqual([c, k, true]);
      expect([c, contrast(v.ink, v.white) >= 4.5]).toEqual([c, true]);
      expect([c, contrast(v.ink, v.cream) >= 4.5]).toEqual([c, true]);
    }
  });
});

describe('테마 바꾸기', () => {
  it('토큰 값이 그 자리에서 바뀌고, 바꿀 때마다 판이 오르고 알림이 온다', () => {
    const before = themeVersion();
    const heard: number[] = [];
    const off = onThemeChange(() => heard.push(themeVersion()));
    applyTheme('arcade');
    off();
    expect(currentTheme()).toBe('arcade');
    expect(color.brandPrimary).toBe(THEMES.arcade.v6.brand);
    expect(color.bgPage).toBe(THEMES.arcade.v6.white);
    expect(radius.lg).toBe(THEMES.arcade.radius.lg);
    expect(font.bold).toBe(THEMES.arcade.fonts.display);
    expect(themeVersion()).toBe(before + 1);
    expect(heard).toEqual([before + 1]);
  });

  it('tokensFor는 그 테마를 적용했을 때의 토큰과 같다 (상점 미리보기)', () => {
    for (const c of CODES) {
      const t = tokensFor(c);
      applyTheme(c);
      expect([c, t.color]).toEqual([c, { ...color }]);
      expect([c, t.type]).toEqual([c, { ...type }]);
      expect([c, t.radius]).toEqual([c, { ...radius }]);
    }
  });

  it('글자가 작게 그려지는 손글씨 테마는 제목·숫자 글자만 키운다', () => {
    applyTheme('notebook');
    const scale = THEMES.notebook.fonts.displayScale ?? 1;
    expect(scale).toBeGreaterThan(1);
    expect(type.title.fontSize).toBe(Math.round(22 * scale));
    expect(type.body.fontSize).toBe(16);
  });

  it('themed·live로 만든 값은 테마가 바뀐 뒤 다시 계산된다', () => {
    const styles = themed(() => ({ box: { backgroundColor: color.brandPrimary } }));
    const tone = live(() => ({ brand: color.brandPrimary }));
    expect(styles.box.backgroundColor).toBe(THEMES.mallang.v6.brand);
    expect(tone.brand).toBe(THEMES.mallang.v6.brand);
    applyTheme('giro');
    expect(styles.box.backgroundColor).toBe(THEMES.giro.v6.brand);
    expect(tone.brand).toBe(THEMES.giro.v6.brand);
  });
});

describe('테마 글꼴', () => {
  it('테마를 고를 때 그 테마의 제목·본문 글꼴을 불러온다', async () => {
    for (const c of CODES) {
      mockRequested.length = 0;
      mockLoaded.clear();
      await loadThemeFonts(c);
      const names = mockRequested.flat();
      const f = THEMES[c].fonts;
      expect([c, names.includes(f.display), names.includes(f.body), names.includes(f.bodyMedium)]).toEqual([c, true, true, true]);
    }
  });

  it('이미 불러온 글꼴은 다시 부르지 않는다', async () => {
    mockLoaded.clear();
    await loadThemeFonts('giro');
    mockRequested.length = 0;
    await loadThemeFonts('giro');
    expect(mockRequested).toEqual([]);
  });
});
