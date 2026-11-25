import { router } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Mascot } from '@/components/Mascot';
import { Segmented } from '@/components/Segmented';
import { Stamp } from '@/components/Stamp';
import { ThemeCard } from '@/components/ThemeCard';
import { TopBar } from '@/components/TopBar';
import { formatAmount } from '@/domain/interest';
import { josa } from '@/domain/korean';
import { shopLockReason } from '@/domain/savings';
import { bankOf } from '@/domain/bank';
import type { Progress } from '@/domain/bankConditions';
import { BANK_NAMES, bankStage, canBuy, ITEMS, itemOf, itemsOf, nextBank, SLOT_LABEL, SLOTS, type BuyCheck, type DecorSlot, type ShopItem } from '@/domain/shop';
import { toShape } from '@/domain/stampShape';
import { toThemeCode } from '@/theme/themes';
import { STREAK_STEP } from '@/domain/wallet';
import { feedback } from '@/lib/feedback';
import { tokenColor, useLook } from '@/store/look';
import { useProfile } from '@/store/profile';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, themed, type } from '@/theme/tokens';

// 단계 순서. 본점 그림 파일은 처음부터 bank-4라 이름을 그대로 둔다
const BANK_ART = [
  require('@/assets/images/bank/bank-0.png'),
  require('@/assets/images/bank/bank-1.png'),
  require('@/assets/images/bank/bank-2.png'),
  require('@/assets/images/bank/bank-3.png'),
  require('@/assets/images/bank/bank-vault.png'),
  require('@/assets/images/bank/bank-4.png'),
  require('@/assets/images/bank/bank-central.png'),
];

type Tab = 'bank' | 'theme' | 'decor';
const TAB_ITEMS: { key: Tab; label: string }[] = [
  { key: 'bank', label: '내 은행' },
  { key: 'theme', label: '테마' },
  { key: 'decor', label: '꾸미기' },
];
/** 꾸미기 탭에 진열하는 칸 */
const DECOR_SLOTS = SLOTS.filter((s) => s !== 'theme');
const TILE_COLS = 4;
const TILE_GAP = 8;

/**
 * TI-SCR-10 상점. 위에 통장과 옷장 입구, 아래는 내 은행·테마·꾸미기 탭으로 나눠 한 번에 한 묶음만 보여 준다. (FR-060~064, FR-070)
 * 꾸미기는 한 줄에 네 칸씩 작게 진열해 스크롤을 줄인다.
 */
export default function ShopScreen() {
  const { wallet, account, owned, buy, today, nextBankProgress } = useTodos();
  const locked = shopLockReason(account, today) !== null;
  const { profile, update } = useProfile();
  const look = useLook();
  const [asking, setAsking] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('bank');
  // 꾸미기 칸 너비: 줄 너비를 재서 네 칸이 딱 맞게 나눈다(퍼센트로 두면 좁은 화면에서 세 칸만 들어간다)
  const [tileW, setTileW] = useState<number | null>(null);
  const askingItem = asking ? itemOf(asking) : undefined;

  const equip = (item: ShopItem) => {
    if (!profile) return;
    update({ equipped: { ...profile.equipped, [item.slot]: item.code } });
  };

  /** 물건 하나의 상태: 착용 중인지, 가졌는지, 살 수 있는지 */
  const stateOf = (item: ShopItem): ItemState => ({
    wearing: look.items[item.slot as DecorSlot]?.code === item.code,
    has: owned.has(item.code),
    check: canBuy(item.code, wallet.balance, owned),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar lead="none" title="상점" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <View
            style={styles.wallet}
            accessible
            accessibilityLabel={`통장 ${formatAmount(account.cash)}냥. 연속 기록 ${wallet.streak}번, 보너스까지 ${wallet.toNextBonus}번`}>
            <Text style={[type.caption, styles.panelLabel]}>통장</Text>
            <Amount value={account.cash} size="L" tone={account.cash < 0 ? 'debt' : 'ink'} />
            <View style={styles.streak}>
              {Array.from({ length: STREAK_STEP }, (_, i) => (
                <View key={i} style={[styles.streakDot, i < wallet.streak % STREAK_STEP && styles.streakOn]} />
              ))}
              <Text style={[type.caption, styles.muted]}>보너스까지 {wallet.toNextBonus}번</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/closet')}
            accessibilityRole="button"
            accessibilityLabel="옷장에서 마스코트 옷 입혀 보기"
            style={({ pressed }) => [styles.closet, pressed && styles.pressed]}>
            <Mascot size={56} />
            <Text style={[type.label, styles.ink]}>옷장 ›</Text>
          </Pressable>
        </View>

        {locked ? (
          <Pressable onPress={() => router.push('/bankrupt')} accessibilityRole="button" style={styles.lockBanner}>
            <Text style={[type.label, styles.lockText]}>
              {account.state === 'bankrupt' ? '파산 중이라 회생할 때까지 상점이 잠겨 있어요' : '빚이 있어서 상점을 쓸 수 없어요. 빚 갚는 법 보기 ›'}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.tabs}>
          <Segmented items={TAB_ITEMS} value={tab} onChange={setTab} />
        </View>

        {tab === 'bank' ? <BankCard owned={owned} balance={wallet.balance} progress={nextBankProgress} onOpen={(code) => setAsking(code)} /> : null}

        {tab === 'theme' ? (
          <View style={styles.grid}>
            {itemsOf('theme').map((item) => {
              const st = stateOf(item);
              return (
                <ThemeCard
                  key={item.code}
                  code={toThemeCode(item.value)}
                  name={item.name}
                  wearing={st.wearing}
                  footer={<ItemStatus item={item} {...st} onEquip={() => equip(item)} onBuy={() => setAsking(item.code)} />}
                />
              );
            })}
          </View>
        ) : null}

        {tab === 'decor'
          ? DECOR_SLOTS.map((slot) => (
              <View key={slot} style={styles.group}>
                <Text style={[type.headline, styles.ink]} accessibilityRole="header">
                  {SLOT_LABEL[slot]}
                </Text>
                <View style={styles.tiles} onLayout={(e) => setTileW(Math.floor((e.nativeEvent.layout.width - TILE_GAP * (TILE_COLS - 1)) / TILE_COLS))}>
                  {itemsOf(slot).map((item) => {
                    const st = stateOf(item);
                    const onPress = st.wearing ? undefined : st.has ? () => equip(item) : st.check.ok ? () => setAsking(item.code) : undefined;
                    return (
                      <Pressable
                        key={item.code}
                        onPress={onPress}
                        disabled={!onPress}
                        accessibilityRole="button"
                        accessibilityLabel={`${SLOT_LABEL[slot]} ${item.name}, ${statusText(item, st)}`}
                        style={({ pressed }) => [styles.tile, tileW ? { width: tileW } : null, st.wearing && styles.tileOn, pressed && styles.pressed]}>
                        <Preview item={item} />
                        <Text style={[type.caption, styles.ink]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text
                          style={[type.caption, styles.tileStatus, st.wearing ? styles.wearingText : !st.has && st.check.ok ? styles.priceText : styles.muted]}
                          numberOfLines={1}>
                          {statusText(item, st, true)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          : null}
      </ScrollView>

      <ConfirmSheet
        visible={!!askingItem}
        title={askingItem ? `${SLOT_LABEL[askingItem.slot]} ${josa(`"${askingItem.name}"`, '을', '를')} 살까요?` : ''}
        message={askingItem ? buyMessage(askingItem) : ''}
        confirmLabel={askingItem?.slot === 'bank' ? '열기' : '사기'}
        onConfirm={() => {
          if (askingItem && buy(askingItem.code)) {
            if (askingItem.slot !== 'bank') equip(askingItem);
            feedback.buy();
          } else {
            feedback.deny();
          }
          setAsking(null);
        }}
        onCancel={() => setAsking(null)}
      />
    </SafeAreaView>
  );
}

type ItemState = { wearing: boolean; has: boolean; check: BuyCheck };

/** 상태 문구. short면 작은 칸에 들어가게 줄인다 */
function statusText(item: ShopItem, { wearing, has, check }: ItemState, short = false): string {
  if (wearing) return '착용 중';
  if (has) return '착용하기';
  if (check.ok) return `${formatAmount(item.price)}냥`;
  if (check.reason === 'locked') return short ? `🔒 ${BANK_NAMES[item.needsBank ?? 0]}` : `🔒 ${check.lock}`;
  return short ? `${formatAmount(item.price)}냥` : `${formatAmount(check.short ?? item.price)}냥 더 필요해요`;
}

/** 테마 카드 아래 상태: 착용 중 글자, 착용·사기 버튼, 잠김·모자람 글자 */
function ItemStatus({ item, onEquip, onBuy, ...st }: ItemState & { item: ShopItem; onEquip: () => void; onBuy: () => void }) {
  if (st.wearing) return <Text style={[type.caption, styles.wearingText]}>착용 중</Text>;
  if (st.has) return <Action label="착용" onPress={onEquip} />;
  if (st.check.ok) return <Action label={`${formatAmount(item.price)}냥`} primary onPress={onBuy} />;
  return <Text style={[type.caption, styles.muted]}>{statusText(item, st)}</Text>;
}

/** 확인 창 문구. 은행이면 새로 생기는 혜택과 열리는 물건까지 알려준다. */
function buyMessage(item: ShopItem): string {
  if (item.slot === 'theme') return `${formatAmount(item.price)}냥이 잔고에서 빠지고 앱 전체의 색과 글꼴이 바로 바뀌어요. 산 테마는 언제든 다시 고를 수 있어요.`;
  if (item.slot !== 'bank') return `${formatAmount(item.price)}냥이 잔고에서 빠지고 바로 착용해요.`;
  const b = bankOf(item.stage ?? 0);
  const unlocks = ITEMS.filter((i) => i.needsBank === item.stage).map((i) => i.name);
  const grow = `${formatAmount(item.price)}냥이 잔고에서 빠지고 내 은행이 ${josa(item.name, '으로', '로')} 커져요.`;
  return [grow, `생기는 것: ${[...b.perks, ...unlocks].join(', ')}`].join(' ');
}

/** 내 은행: 지금 단계 그림, 다음 은행의 조건과 냥, 열면 생기는 것, 열기 버튼 (상점기획서 11.2절, FR-110, 111) */
function BankCard({ owned, balance, progress, onOpen }: { owned: Set<string>; balance: number; progress: Progress | null; onOpen: (code: string) => void }) {
  const stage = bankStage(owned);
  const next = nextBank(owned);
  const nextDef = next ? bankOf(next.stage ?? 0) : null;
  const ratio = next ? Math.min(1, balance / next.price) : 1;
  const enoughCoins = !!next && balance >= next.price;
  const conditionDone = !progress || progress.done;
  const ready = enoughCoins && conditionDone;
  return (
    <View style={styles.bank}>
      <View style={styles.bankTop}>
        <View style={styles.bankArt}>
          <Image source={BANK_ART[stage]} style={styles.bankImage} contentFit="contain" accessibilityLabel={`내 은행 ${BANK_NAMES[stage]} 그림`} />
        </View>
        <View style={styles.bankText}>
          <Text style={[type.caption, styles.panelLabel]}>내 은행 {stage}단계 / 6단계</Text>
          <Text style={[type.title, styles.ink]}>{BANK_NAMES[stage]}</Text>
          {next ? null : <Text style={[type.caption, styles.panelLabel]}>가장 큰 은행이에요</Text>}
        </View>
      </View>
      {next && nextDef ? (
        <>
          <View style={styles.need}>
            <Text style={[type.label, styles.ink]}>다음 은행 {josa(next.name, '을', '를')} 열려면</Text>
            <NeedRow done={conditionDone} text={progress?.text ?? '조건 없음'} ratio={progress && progress.target ? progress.current / progress.target : 1} />
            <NeedRow done={enoughCoins} text={`${formatAmount(Math.min(balance, next.price))} / ${formatAmount(next.price)}냥`} ratio={ratio} />
          </View>
          <View style={styles.perks} accessible accessibilityLabel={`열면 생기는 것: ${nextDef.perks.join(', ')}${nextDef.soon.length ? `. 곧 추가: ${nextDef.soon.join(', ')}` : ''}`}>
            <Text style={[type.label, styles.ink]}>열면 생기는 것</Text>
            {nextDef.perks.map((p) => (
              <Text key={p} style={[type.caption, styles.ink]}>
                · {p}
              </Text>
            ))}
            {nextDef.soon.map((p) => (
              <Text key={p} style={[type.caption, styles.panelLabel]}>
                · {p} (곧 추가)
              </Text>
            ))}
          </View>
          <Button
            label={ready ? `${formatAmount(next.price)}냥에 열기` : !conditionDone ? '조건을 채우면 열려요' : `${formatAmount(next.price - balance)}냥 더 모으면 열려요`}
            variant={ready ? 'primary' : 'secondary'}
            disabled={!ready}
            onPress={() => onOpen(next.code)}
          />
        </>
      ) : null}
    </View>
  );
}

function NeedRow({ done, text, ratio }: { done: boolean; text: string; ratio: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <View style={styles.needRow} accessible accessibilityLabel={`${text}${done ? ', 채웠어요' : ''}`}>
      <View style={styles.needHead}>
        <Text style={[type.caption, { color: done ? color.okFg : color.textSecondary }]}>{done ? '✓' : '○'}</Text>
        <Text style={[type.caption, styles.ink, styles.flex]}>{text}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, done && styles.trackDone, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function Preview({ item }: { item: ShopItem }) {
  if (item.slot === 'stampInk') return <Stamp kind="saved" size={44} ink={tokenColor(item.value, color.inkRed)} />;
  if (item.slot === 'stampWord') return <Stamp kind="saved" size={44} word={item.value} />;
  if (item.slot === 'stampShape') return <Stamp kind="saved" size={44} shape={toShape(item.value)} />;
  return (
    <View style={[styles.bubble, { backgroundColor: tokenColor(item.value, color.bubbleCream) }]}>
      <Text style={[type.caption, styles.ink]}>안녕</Text>
    </View>
  );
}

function Action({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={primary ? `${label}에 사기` : label}
      hitSlop={6}
      style={({ pressed }) => [styles.action, primary ? styles.actionPrimary : styles.actionPlain, pressed && styles.pressed]}>
      <Text style={[type.label, { color: primary ? color.textOnPrimary : color.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  content: layout.content,
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.bgSurface,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  wallet: { flex: 1, gap: 2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  streakDot: {
    width: 14,
    height: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSunken,
  },
  streakOn: { backgroundColor: color.accentCoin },
  group: { gap: 10 },
  tabs: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, justifyContent: 'space-between' },
  // 꾸미기 한 줄에 네 칸. 칸 수가 모자란 줄도 왼쪽부터 같은 너비로 채운다
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: {
    width: '22%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: color.bgSurface,
    borderRadius: radius.md,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
  },
  tileOn: { borderWidth: Math.max(stroke.outline, 2), borderColor: color.brandPrimary, backgroundColor: color.brandSoft },
  tileStatus: { fontSize: 11, lineHeight: 14 },
  priceText: { color: color.brandPrimary },
  bubble: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderBottomLeftRadius: 4,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
  },
  action: { minWidth: 88, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, paddingHorizontal: 14 },
  actionPrimary: { backgroundColor: color.brandPrimary, borderWidth: stroke.outline, borderColor: color.inkOutline },
  actionPlain: { backgroundColor: stroke.outline === 0 ? color.bgSunken : color.bgSurface, borderWidth: stroke.outline, borderColor: color.inkOutline },
  pressed: { opacity: 0.8 },
  wearingText: { color: color.brandPrimary },
  muted: { color: color.textSecondary, textAlign: 'center' },
  panelLabel: { color: color.textSecondary },
  ink: { color: color.textPrimary },
  bank: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 20,
    gap: 12,
  },
  bankTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bankArt: { width: 104, height: 104, borderRadius: radius.lg, backgroundColor: color.bgSunken, alignItems: 'center', justifyContent: 'center' },
  bankImage: { width: 96, height: 96 },
  bankText: { flex: 1, gap: 2 },
  track: {
    height: 14,
    borderRadius: radius.full,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSunken,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', backgroundColor: color.accentCoin },
  trackDone: { backgroundColor: color.okFg },
  need: { gap: 10 },
  needRow: { gap: 4 },
  needHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
  perks: { gap: 2, padding: 12, borderRadius: radius.md, backgroundColor: color.bgSunken },
  closet: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: color.mascotCream,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
  },
  lockBanner: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: color.debtBg },
  lockText: { color: color.debtFg },
}));
