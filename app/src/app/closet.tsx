import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Mascot } from '@/components/Mascot';
import { TopBar } from '@/components/TopBar';
import { outfitOf, sameOutfit, trialState, wear, wearLine, withOutfit, type Outfit } from '@/domain/closet';
import { formatAmount } from '@/domain/interest';
import { josa } from '@/domain/korean';
import { itemsOf, lockLabel, SLOT_LABEL, WEAR_TABS, type ShopItem, type WearSlot } from '@/domain/shop';
import { track } from '@/lib/events';
import { feedback } from '@/lib/feedback';
import { useProfile } from '@/store/profile';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

const THUMBS: Record<string, number> = {
  '': require('@/assets/images/outfits/none.png'),
  beanie: require('@/assets/images/outfits/beanie.png'),
  gat: require('@/assets/images/outfits/gat.png'),
  crown: require('@/assets/images/outfits/crown.png'),
  glasses: require('@/assets/images/outfits/glasses.png'),
  raincoat: require('@/assets/images/outfits/raincoat.png'),
  banker: require('@/assets/images/outfits/banker.png'),
};
const MASCOT = 220;
const GHOST = 88;

type Rect = { x: number; y: number; w: number; h: number };
const inside = (r: Rect | null, x: number, y: number) => !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/**
 * TI-SCR-13 옷장. 소품을 끌어 마스코트에 놓으면 입혀지고(누르기도 된다), 사기 전에 입어 본다. (FR-070~073)
 * 입어 보는 모습은 저장하지 않는다. "이대로 입기"나 "사기"를 눌러야 저장된다.
 */
export default function ClosetScreen() {
  const { profile, update } = useProfile();
  const { owned, wallet, buyAll } = useTodos();
  const saved = useMemo(() => outfitOf(profile?.equipped ?? {}, owned), [profile, owned]);
  const [trial, setTrial] = useState<Outfit | null>(null);
  const current = trial ?? saved;
  const [tab, setTab] = useState<WearSlot>('head');
  const [bounce, setBounce] = useState(0);
  const [line, setLine] = useState('소품을 꾹 눌러 저한테 끌어 놓아 보세요. 그냥 눌러도 돼요.');
  const [dragging, setDragging] = useState<ShopItem | null>(null);
  const [hover, setHover] = useState(false);

  const state = trialState(current, saved, owned, wallet.balance);

  // 끌어 놓을 자리(마스코트)와 화면 기준점의 창 좌표
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const dropRef = useRef<ComponentRef<typeof View>>(null);
  const root = useRef({ x: 0, y: 0 });
  const drop = useRef<Rect | null>(null);
  const measure = () => {
    rootRef.current?.measureInWindow((x, y) => (root.current = { x, y }));
    dropRef.current?.measureInWindow((x, y, w, h) => (drop.current = { x, y, w, h }));
  };

  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostScale = useSharedValue(0);
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ghostX.value }, { translateY: ghostY.value }, { scale: ghostScale.value }],
    opacity: ghostScale.value === 0 ? 0 : 1,
  }));

  const tryOn = (item: ShopItem) => {
    const next = wear(current, item.code);
    const removed = next[item.slot as WearSlot] !== item.code;
    setTrial(sameOutfit(next, saved) ? null : next);
    setBounce((b) => b + 1);
    if (removed) {
      feedback.takeOff();
      setLine(`${josa(item.name, '을', '를')} 벗었어요.`);
      return;
    }
    feedback.wear();
    track('closet_try', { item_code: item.code, owned: owned.has(item.code) });
    const lock = lockLabel(item, owned);
    const extra = owned.has(item.code) ? '' : lock ? ` (${lock} 살 수 있어요)` : ` 마음에 들면 ${formatAmount(item.price)}냥이에요.`;
    setLine(wearLine(item.code) + extra);
  };

  const startDrag = (item: ShopItem, x: number, y: number) => {
    measure();
    setDragging(item);
    ghostX.set(x - root.current.x - GHOST / 2);
    ghostY.set(y - root.current.y - GHOST / 2);
    ghostScale.set(withSpring(1.1, { damping: 12 }));
    feedback.tap();
  };
  const moveDrag = (x: number, y: number) => {
    ghostX.set(x - root.current.x - GHOST / 2);
    ghostY.set(y - root.current.y - GHOST / 2);
    const over = inside(drop.current, x, y);
    if (over !== hover) setHover(over);
  };
  const endDrag = (item: ShopItem, x: number, y: number) => {
    const over = inside(drop.current, x, y);
    ghostScale.set(withTiming(0, { duration: 140 }));
    setDragging(null);
    setHover(false);
    if (over) tryOn(item);
  };

  const buy = () => {
    if (!state.canBuyAll) {
      feedback.deny();
      return;
    }
    if (!buyAll(state.unowned.map((i) => i.code))) {
      feedback.deny();
      setLine('지금은 살 수 없어요. 잔고를 확인해 주세요.');
      return;
    }
    update({ equipped: withOutfit(profile?.equipped ?? {}, current) });
    setTrial(null);
    setBounce((b) => b + 1);
    feedback.buy();
    setLine('고마워요! 아껴 입을게요.');
  };

  const saveOnly = () => {
    update({ equipped: withOutfit(profile?.equipped ?? {}, current) });
    setTrial(null);
    setBounce((b) => b + 1);
    feedback.tap();
    setLine('이대로 입을게요. 어때요?');
  };

  const reset = () => {
    setTrial(null);
    setBounce((b) => b + 1);
    feedback.takeOff();
    setLine('원래대로 돌아왔어요.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View ref={rootRef} style={styles.root} onLayout={measure} collapsable={false}>
        <TopBar title="옷장" onLead={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} scrollEnabled={!dragging} onScroll={measure} scrollEventThrottle={64}>
          <View style={styles.stage}>
            <View style={styles.speech} accessibilityLiveRegion="polite">
              <Text style={[type.body, styles.speechText]}>{line}</Text>
            </View>
            <View
              ref={dropRef}
              collapsable={false}
              onLayout={(_e: LayoutChangeEvent) => measure()}
              style={[styles.drop, hover && styles.dropHover]}
              accessibilityHint="소품을 끌어 여기에 놓으면 입혀져요">
              <Mascot size={MASCOT} outfit={current} bounceKey={bounce} animateLayers />
            </View>
            <Text style={[type.caption, styles.balance]}>내 잔고 {formatAmount(wallet.balance)}냥</Text>
          </View>

          <View style={styles.tabs} accessibilityRole="radiogroup">
            {WEAR_TABS.map((slot) => (
              <Chip key={slot} label={SLOT_LABEL[slot]} selected={tab === slot} onPress={() => setTab(slot)} />
            ))}
          </View>

          <View style={styles.grid}>
            {itemsOf(tab).map((item) => (
              <Tile
                key={item.code}
                item={item}
                wearing={current[tab] === item.code}
                owned={owned.has(item.code)}
                lock={lockLabel(item, owned)}
                onTap={() => tryOn(item)}
                onDragStart={(x, y) => startDrag(item, x, y)}
                onDragMove={moveDrag}
                onDragEnd={(x, y) => endDrag(item, x, y)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.bar}>
          {state.unowned.length > 0 ? (
            <>
              <Text style={[type.label, styles.ink]} numberOfLines={2}>
                입어 보는 중: {state.unowned.map((i) => i.name).join(', ')}
              </Text>
              <Text style={[type.caption, styles.muted]}>
                {state.locked.length
                  ? `${josa(state.locked[0].item.name, '은', '는')} ${state.locked[0].lock} 살 수 있어요`
                  : state.short > 0
                    ? `${formatAmount(state.short)}냥 더 필요해요`
                    : `산 뒤 남는 잔고 ${formatAmount(wallet.balance - state.total)}냥`}
              </Text>
              <View style={styles.actions}>
                <View style={styles.action}>
                  <Button label="되돌리기" variant="secondary" onPress={reset} />
                </View>
                <View style={styles.action}>
                  <Button label={`${formatAmount(state.total)}냥에 사기`} onPress={buy} disabled={!state.canBuyAll} />
                </View>
              </View>
            </>
          ) : state.canSaveOnly ? (
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button label="되돌리기" variant="secondary" onPress={reset} />
              </View>
              <View style={styles.action}>
                <Button label="이대로 입기" onPress={saveOnly} />
              </View>
            </View>
          ) : (
            <Text style={[type.caption, styles.muted, styles.center]}>안 산 소품도 입어 볼 수 있어요. 마음에 들면 그때 사요.</Text>
          )}
        </View>

        {/* 끌고 있는 소품 */}
        <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]}>
          {dragging ? <Image source={THUMBS[dragging.value]} style={styles.ghostImage} contentFit="contain" /> : null}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

type TileProps = {
  item: ShopItem;
  wearing: boolean;
  owned: boolean;
  lock: string | null;
  onTap: () => void;
  onDragStart: (x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
};

function Tile({ item, wearing, owned, lock, onTap, onDragStart, onDragMove, onDragEnd }: TileProps) {
  const isNone = item.price === 0;
  const pan = Gesture.Pan()
    .runOnJS(true)
    // 목록 스크롤과 겹치지 않게 짧게 누른 뒤부터 끈다
    .activateAfterLongPress(150)
    .enabled(!isNone)
    .onStart((e) => onDragStart(e.absoluteX, e.absoluteY))
    .onUpdate((e) => onDragMove(e.absoluteX, e.absoluteY))
    .onEnd((e) => onDragEnd(e.absoluteX, e.absoluteY));
  // 손가락이 움직이면 누르기가 아니라 끌기로 본다
  const tap = Gesture.Tap().runOnJS(true).maxDistance(10).onEnd(() => onTap());
  const status = wearing ? '입는 중' : owned ? (isNone ? '' : '가짐') : lock ? lock : `${formatAmount(item.price)}냥`;

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        style={[styles.tile, wearing && styles.tileOn]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${SLOT_LABEL[item.slot]} ${item.name}${status ? `, ${status}` : ''}`}
        accessibilityHint={isNone ? '누르면 이 칸을 벗어요' : '누르거나, 꾹 눌러 마스코트로 끌어 놓으면 입어 봐요'}>
        <View style={styles.thumb}>
          <Image source={THUMBS[item.value]} style={[styles.thumbImage, lock && !owned && styles.dim]} contentFit="contain" accessible={false} />
          {lock && !owned ? <Text style={[type.caption, styles.lockMark]}>잠김</Text> : null}
        </View>
        <Text style={[type.label, styles.ink]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[type.caption, wearing ? styles.on : styles.muted]} numberOfLines={1}>
          {status || ' '}
        </Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  root: { flex: 1 },
  content: layout.content,
  stage: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.bgSurface,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  speech: {
    alignSelf: 'stretch',
    backgroundColor: color.mascotCream,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  speechText: { color: color.inkOutline, textAlign: 'center' },
  drop: { borderRadius: radius.full, borderWidth: 2, borderColor: 'transparent', borderStyle: 'dashed', padding: 6 },
  dropHover: { borderColor: color.brandPrimary, backgroundColor: color.brandSoft },
  balance: { color: color.textSecondary },
  tabs: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    // 세 칸 + 간격 10 두 개가 좁은 휴대폰(375)에서도 한 줄에 들어가게
    width: '31%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
  },
  tileOn: { borderWidth: stroke.outline, borderColor: color.inkOutline, backgroundColor: color.brandSoft },
  thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: color.bgSunken, alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: 72, height: 72 },
  dim: { opacity: 0.35 },
  lockMark: {
    position: 'absolute',
    color: color.inkOutline,
    backgroundColor: color.bgSurface,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: stroke.hairline,
    borderTopColor: color.borderDefault,
    backgroundColor: color.bgPage,
  },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  ghost: { position: 'absolute', top: 0, left: 0, width: GHOST, height: GHOST },
  ghostImage: { width: GHOST, height: GHOST },
  ink: { color: color.textPrimary },
  muted: { color: color.textSecondary },
  on: { color: color.brandPrimary },
  center: { textAlign: 'center' },
});
