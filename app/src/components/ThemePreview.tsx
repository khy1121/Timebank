import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { Text, View, type TextStyle } from 'react-native';

import { loadThemeFonts } from '@/theme/fonts';
import { THEMES, type ThemeCode } from '@/theme/themes';
import { themed } from '@/theme/tokens';

/**
 * 상점 테마 미리보기. 그 테마로 바꾸면 홈이 어떻게 보이는지 작게 그린다.
 * 하늘과 언덕, 잔고, 할 일 카드, 버튼, 아래 탭을 그 테마의 색·글꼴·모서리·테두리로 보여 준다.
 * 아직 안 불러온 테마 글꼴은 이 미리보기가 보일 때 불러온다.
 */
export function ThemePreview({ code }: { code: ThemeCode }) {
  const th = THEMES[code];
  const v = th.v6;
  const fontsReady = useThemeFonts(code);
  const display: TextStyle = fontsReady ? { fontFamily: th.fonts.display } : {};
  const body: TextStyle = fontsReady ? { fontFamily: th.fonts.body } : {};
  const scale = th.fonts.displayScale ?? 1;
  const outline = th.stroke.outline ? 1.5 : 0;
  const r = (n: number) => Math.min(n, 18);

  return (
    <View style={[styles.frame, { backgroundColor: v.sky, borderRadius: r(th.radius.lg) }]} accessible={false}>
      <View style={[styles.hill, { backgroundColor: v.hill }]} />
      <View style={styles.top}>
        <View style={[styles.coinPill, { backgroundColor: v.white, borderRadius: th.radius.full >= 99 ? 99 : th.radius.sm, borderColor: v.line, borderWidth: outline }]}>
          <View style={[styles.coin, { backgroundColor: v.coin }]} />
          <Text style={[styles.amount, display, { color: v.ink, fontSize: 15 * scale }]}>4,850냥</Text>
        </View>
      </View>
      <View style={[styles.sheet, { backgroundColor: v.white, borderTopLeftRadius: r(th.radius.xl), borderTopRightRadius: r(th.radius.xl) }]}>
        <View
          style={[
            styles.ticket,
            {
              backgroundColor: v.cream,
              borderRadius: r(th.radius.md),
              borderColor: v.line,
              borderWidth: outline,
              boxShadow: th.cardShadow ?? undefined,
            },
          ]}>
          <View style={[styles.ticketBar, { backgroundColor: v.brand }]} />
          <View style={styles.ticketText}>
            <Text style={[styles.ticketTitle, display, { color: v.ink, fontSize: 13 * scale }]} numberOfLines={1}>
              보고서 쓰기
            </Text>
            <Text style={[styles.ticketSub, body, { color: v.sub }]} numberOfLines={1}>
              내일까지 · 원금 3,000냥
            </Text>
          </View>
          <View style={[styles.button, { backgroundColor: v.brand, borderRadius: th.radius.full >= 99 ? 99 : th.radius.sm, borderColor: v.line, borderWidth: outline }, th.buttonDrop ? { boxShadow: `${th.buttonDrop.x}px ${th.buttonDrop.y / 2}px 0px 0px ${th.buttonDrop.color}` } : null]}>
            <Text style={[styles.buttonText, body, { color: v.white }]}>끝냄</Text>
          </View>
        </View>
        <View style={[styles.tabBar, { backgroundColor: v.ink, borderRadius: r(th.radius.lg) }]}>
          <View style={[styles.tabOn, { backgroundColor: v.tabOn, borderRadius: r(th.radius.md) }]} />
          <View style={[styles.tabDot, { backgroundColor: v.mute }]} />
          <View style={[styles.tabDot, { backgroundColor: v.mute }]} />
          <View style={[styles.tabDot, { backgroundColor: v.mute }]} />
        </View>
      </View>
    </View>
  );
}

/** 테마 글꼴을 불러왔는지. 안 불러왔으면 불러오고 다 되면 다시 그린다 */
function useThemeFonts(code: ThemeCode): boolean {
  const names = Object.values(THEMES[code].fonts).filter((f): f is string => typeof f === 'string');
  const loaded = names.every((n) => Font.isLoaded(n));
  const [, setDone] = useState(false);
  useEffect(() => {
    if (loaded) return;
    let active = true;
    loadThemeFonts(code)
      .then(() => active && setDone(true))
      .catch((e) => console.warn('테마 글꼴을 불러오지 못했어요', e));
    return () => {
      active = false;
    };
  }, [code, loaded]);
  return loaded;
}

const styles = themed(() => ({
  frame: { width: '100%', overflow: 'hidden' },
  hill: { position: 'absolute', left: '-40%', right: '-40%', top: 40, height: 400, borderRadius: 999 },
  top: { height: 58, alignItems: 'center', justifyContent: 'center' },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  coin: { width: 10, height: 10, borderRadius: 5 },
  amount: { fontSize: 15 },
  sheet: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, gap: 8 },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10 },
  ticketBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  ticketText: { flex: 1, gap: 2 },
  ticketTitle: { fontSize: 13 },
  ticketSub: { fontSize: 10 },
  button: { paddingHorizontal: 10, paddingVertical: 4 },
  buttonText: { fontSize: 11 },
  tabBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 24, paddingHorizontal: 4 },
  tabOn: { width: 40, height: 16 },
  tabDot: { width: 8, height: 8, borderRadius: 4 },
}));
