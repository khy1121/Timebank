import * as Font from 'expo-font';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Mascot } from '@/components/Mascot';
import { TABS } from '@/components/TabBar';
import { loadThemeFonts } from '@/theme/fonts';
import { THEMES, type ThemeCode } from '@/theme/themes';
import { themed, tokensFor } from '@/theme/tokens';

/** 테마마다 한 줄 설명. 무엇이 달라지는지 말로도 알려 준다 */
const TAGLINE: Record<ThemeCode, string> = {
  mallang: '둥글고 말랑한 기본 저금통',
  timebank: '차분한 초록 은행 통장',
  giro: '각진 칸과 빨간 줄의 고지서',
  notebook: '손글씨와 삐뚤한 그림자의 공책',
  arcade: '굵은 테두리, 딱 떨어지는 그림자',
};

/** 미리보기 홈을 실제 크기로 그린 뒤 카드 너비에 맞춰 줄인다 */
const HOME_W = 360;
const HOME_H = 640;
/** 카드 너비를 재기 전에 쓰는 비율 */
const FIRST_SCALE = 0.4;
const CARD_PAD = 8;

/**
 * 상점 테마 카드. 카드 전체를 그 테마의 색·글꼴·모서리·테두리·그림자로 칠해서 다섯 개가 한눈에 구별되게 한다.
 * 위는 그 테마로 바꾼 홈 화면을 그대로 줄인 것, 아래는 그 테마 글꼴로 쓴 이름. 한 줄에 두 장씩 놓는다.
 * footer에는 착용·사기·잠김 같은 상태를 넣는다.
 */
export function ThemeCard({ code, name, wearing, footer }: { code: ThemeCode; name: string; wearing: boolean; footer: ReactNode }) {
  const tk = tokensFor(code);
  const [scale, setScale] = useState(FIRST_SCALE);
  const c = tk.color;
  const fontsReady = useThemeFonts(code);
  const outline = tk.stroke.outline;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.bgSurface,
          borderRadius: Math.min(tk.radius.xl, 24),
          borderWidth: wearing ? 3 : outline,
          borderColor: wearing ? c.brandPrimary : c.inkOutline,
          boxShadow: (tk.shadow.drop ? `${tk.shadow.drop.x}px ${tk.shadow.drop.y}px 0px 0px ${tk.shadow.drop.color}` : tk.shadow.card) ?? undefined,
        },
      ]}
      onLayout={(e) => setScale(Math.max(0.2, (e.nativeEvent.layout.width - CARD_PAD * 2 - 6) / HOME_W))}
      accessible
      accessibilityLabel={`${name} 테마. ${TAGLINE[code]}${wearing ? '. 착용 중' : ''}`}>
      <View
        style={[
          styles.phoneFrame,
          { width: HOME_W * scale, height: HOME_H * scale, borderRadius: Math.min(tk.radius.lg, 16), borderColor: c.inkOutline, borderWidth: outline ? 1.5 : 1 },
        ]}
        importantForAccessibility="no-hide-descendants">
        <View
          style={[
            styles.phoneInner,
            { left: -(HOME_W * (1 - scale)) / 2, top: -(HOME_H * (1 - scale)) / 2, transform: [{ scale }] },
          ]}>
          <MiniHome code={code} fontsReady={fontsReady} />
        </View>
      </View>

      <View style={styles.info}>
        <Text style={[fontsReady ? tk.type.headline : styles.fallbackTitle, { color: c.textPrimary }]}>{name}</Text>
        <View style={styles.footer}>{footer}</View>
      </View>
    </View>
  );
}

/** 그 테마로 바꾼 홈 화면. 실제 홈과 같은 크기·짜임으로 그린 뒤 카드에서 줄인다 */
function MiniHome({ code, fontsReady }: { code: ThemeCode; fontsReady: boolean }) {
  const { color: c, radius: r, stroke: s, type: tp, shadow } = tokensFor(code);
  const ty = (style: TextStyle): TextStyle => (fontsReady ? style : { ...style, fontFamily: undefined });
  const cardShadow: ViewStyle = shadow.card ? { boxShadow: shadow.card } : {};
  const drop: ViewStyle = shadow.drop ? { boxShadow: `${shadow.drop.x}px ${shadow.drop.y || 3}px 0px 0px ${shadow.drop.color}` } : {};
  const pill = r.full >= 99 ? 999 : r.sm;
  const line = { borderWidth: s.outline, borderColor: c.inkOutline };

  return (
    <View style={[styles.home, { backgroundColor: c.bgPage }]}>
      {/* 위 막대 */}
      <View style={[styles.topBar, { backgroundColor: c.stageSky }]}>
        <Text style={[ty(tp.headline), { color: c.textPrimary }]}>할 일 이자</Text>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={3.5} stroke={c.textPrimary} strokeWidth={2} />
          <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke={c.textPrimary} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </View>

      {/* 무대: 하늘, 언덕, 순위·신용 칸, 마스코트, 통장 */}
      <View style={[styles.stage, { backgroundColor: c.stageSky }]}>
        <View style={[styles.hill, { backgroundColor: c.stageHill }]} />
        <View style={[styles.side, styles.left, line, cardShadow, { backgroundColor: c.accentCoin, borderRadius: r.lg }]}>
          <Text style={[ty(tp.caption), { color: c.textSecondary }]}>전체</Text>
          <Text style={[ty(tp.title), { color: c.textPrimary }]}>1등</Text>
        </View>
        <View style={styles.mascot}>
          <Mascot size={128} />
        </View>
        <View style={[styles.side, styles.right, line, cardShadow, { backgroundColor: c.bgPage, borderRadius: r.lg }]}>
          <Text style={[ty(tp.caption), { color: c.textSecondary }]}>신용</Text>
          <Text style={[ty(tp.title), { color: '#2F6FD6' }]}>BB</Text>
        </View>
        <View style={[styles.bowl, line, cardShadow, { backgroundColor: c.bgPage, borderRadius: pill }]}>
          <View style={[styles.coin, { backgroundColor: c.accentCoin, borderColor: c.textPrimary, borderRadius: r.full >= 99 ? 9 : r.sm }]} />
          <Text style={[ty(tp.numberL), { color: c.textPrimary }]}>4,850</Text>
          <Text style={[ty(tp.unitM), { color: c.textPrimary }]}>냥</Text>
        </View>
      </View>

      {/* 흰 판: 순자산, 한마디, 진행 중/끝낸 일, 할 일 카드 */}
      <View style={[styles.sheet, { backgroundColor: c.bgPage, borderTopLeftRadius: r.xl, borderTopRightRadius: r.xl }]}>
        <View style={styles.worth}>
          <Text style={[ty(tp.caption), { color: c.textSecondary }]}>순자산</Text>
          <Text style={[ty(tp.headline), { color: c.textPrimary, flex: 1 }]}>7,850냥</Text>
          <View style={[styles.badge, { backgroundColor: '#2F6FD6', borderRadius: pill }]}>
            <Text style={[ty(tp.caption), { color: '#FFFFFF' }]}>신용 적격자</Text>
          </View>
        </View>
        <Text style={[ty(tp.body), { color: c.textPrimary }]}>이번 주 8건을 한 번도 안 넘겼어요.</Text>

        <View style={styles.segRow}>
          <View style={[styles.seg, { backgroundColor: c.bgSunken, borderRadius: pill }]}>
            <View style={[styles.segOn, line, { backgroundColor: c.bgPage, borderRadius: pill }]}>
              <Text style={[ty(tp.label), { color: c.textPrimary }]}>진행 중 2</Text>
            </View>
            <Text style={[ty(tp.label), styles.segOff, { color: c.textSecondary }]}>끝낸 일</Text>
          </View>
          <View style={[styles.plus, line, drop, { backgroundColor: c.brandPrimary, borderRadius: pill }]}>
            <Text style={[ty(tp.title), { color: c.textOnPrimary }]}>+</Text>
          </View>
        </View>

        {[
          { title: '보고서 쓰기', sub: '내일까지 · 원금 3,000냥' },
          { title: '운동 30분', sub: '오늘까지 · 원금 1,000냥' },
        ].map((todo) => (
          <View key={todo.title} style={[styles.ticket, line, cardShadow, { backgroundColor: c.bgSurface, borderRadius: r.lg }]}>
            <View style={styles.ticketText}>
              <Text style={[ty(tp.headline), { color: c.textPrimary }]}>{todo.title}</Text>
              <Text style={[ty(tp.caption), { color: c.textSecondary }]}>{todo.sub}</Text>
            </View>
            <View style={[styles.done, line, drop, { backgroundColor: c.brandPrimary, borderRadius: pill }]}>
              <Text style={[ty(tp.label), { color: c.textOnPrimary }]}>끝냄</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 아래 탭 */}
      <View style={[styles.tabBar, { backgroundColor: c.tabBar, borderRadius: Math.min(r.xl, 28), borderWidth: s.outline, borderColor: c.inkOutline }]}>
        {(['index', 'standing', 'groups', 'shop'] as const).map((key, i) => {
          const on = i === 0;
          const tint = on ? c.tabOnText : c.tabOff;
          return (
            <View key={key} style={[styles.tab, on && { backgroundColor: c.tabOn }, { borderRadius: Math.min(r.lg, 22) }]}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                {TABS[key].icon(tint)}
              </Svg>
              <Text style={[ty(tp.caption), { color: tint, fontSize: 12, lineHeight: 16 }]}>{TABS[key].label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** 테마 글꼴을 불러왔는지. 안 불러왔으면 불러오고 다 되면 다시 그린다 */
function useThemeFonts(code: ThemeCode): boolean {
  // 불러왔는지를 상태로 둔다. 렌더마다 Font.isLoaded를 다시 부르면 React Compiler가 처음 값을 기억해 버린다
  const [loaded, setLoaded] = useState(() => [THEMES[code].fonts.display, THEMES[code].fonts.body].every((n) => Font.isLoaded(n)));
  useEffect(() => {
    if (loaded) return;
    let active = true;
    loadThemeFonts(code)
      .then(() => active && setLoaded(true))
      .catch((e) => console.warn('테마 글꼴을 불러오지 못했어요', e));
    return () => {
      active = false;
    };
  }, [code, loaded]);
  return loaded;
}

const styles = themed(() => ({
  card: { width: '48.5%', alignItems: 'center', gap: 8, padding: CARD_PAD },
  phoneFrame: { overflow: 'hidden' },
  // 실제 크기 홈을 가운데 기준으로 줄이므로, 줄어든 만큼 왼쪽 위로 당긴다 (left·top·scale은 카드 너비로 정한다)
  phoneInner: { position: 'absolute', width: HOME_W, height: HOME_H },
  home: { flex: 1, overflow: 'hidden' },
  topBar: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  stage: { height: 244, overflow: 'hidden', alignItems: 'center' },
  hill: { position: 'absolute', alignSelf: 'center', top: 148, width: 900, height: 900, borderRadius: 450 },
  mascot: { marginTop: 12 },
  side: { position: 'absolute', top: 36, width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  left: { left: 20 },
  right: { right: 20 },
  bowl: { position: 'absolute', bottom: 36, flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingVertical: 8, paddingHorizontal: 22 },
  coin: { width: 18, height: 18, borderWidth: 1.5, alignSelf: 'center' },
  sheet: { marginTop: -24, paddingHorizontal: 16, paddingTop: 18, gap: 12, flex: 1 },
  worth: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3 },
  segRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seg: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 4 },
  segOn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  segOff: { flex: 1, textAlign: 'center' },
  plus: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  ticketText: { flex: 1, gap: 2 },
  done: { paddingHorizontal: 14, paddingVertical: 8 },
  tabBar: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', padding: 6, gap: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8 },
  info: { alignSelf: 'stretch', alignItems: 'center', gap: 4 },
  fallbackTitle: { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  footer: { alignItems: 'center' },
}));
