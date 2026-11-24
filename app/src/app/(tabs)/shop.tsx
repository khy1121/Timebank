import { router } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { BACKGROUNDS } from '@/components/HomeBackground';
import { Mascot } from '@/components/Mascot';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Stamp } from '@/components/Stamp';
import { TopBar } from '@/components/TopBar';
import { formatAmount } from '@/domain/interest';
import { shopMessage } from '@/domain/messages';
import { josa } from '@/domain/korean';
import { BANK_NAMES, bankStage, canBuy, ITEMS, itemOf, itemsOf, nextBank, SLOT_LABEL, SLOTS, type ShopItem } from '@/domain/shop';
import { toShape } from '@/domain/stampShape';
import { STREAK_STEP } from '@/domain/wallet';
import { feedback } from '@/lib/feedback';
import { tokenColor, useLook } from '@/store/look';
import { useProfile } from '@/store/profile';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

const BANK_ART = [
  require('@/assets/images/bank/bank-0.png'),
  require('@/assets/images/bank/bank-1.png'),
  require('@/assets/images/bank/bank-2.png'),
  require('@/assets/images/bank/bank-3.png'),
  require('@/assets/images/bank/bank-4.png'),
];

/** TI-SCR-10 상점. 잔고와 연속 기록, 내 은행, 옷장 입구, 꾸미기. (FR-060~064, FR-070) */
export default function ShopScreen() {
  const { wallet, account, owned, buy } = useTodos();
  const locked = account.state !== 'normal' || account.netWorth < 0;
  const { profile, update } = useProfile();
  const look = useLook();
  const [asking, setAsking] = useState<string | null>(null);
  const askingItem = asking ? itemOf(asking) : undefined;

  const equip = (item: ShopItem) => {
    if (!profile) return;
    update({ equipped: { ...profile.equipped, [item.slot]: item.code } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar lead="none" title="상점" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.panel}>
          <Text style={[type.label, styles.panelLabel]}>통장 (쓸 수 있는 냥)</Text>
          <Amount value={account.cash} size="XL" tone={account.cash < 0 ? 'debt' : 'ink'} />
          <View style={styles.streak} accessible accessibilityLabel={`연속 기록 ${wallet.streak}번, 보너스까지 ${wallet.toNextBonus}번`}>
            {Array.from({ length: STREAK_STEP }, (_, i) => (
              <View key={i} style={[styles.streakDot, i < wallet.streak % STREAK_STEP && styles.streakOn]} />
            ))}
            <Text style={[type.caption, styles.muted]}>보너스까지 {wallet.toNextBonus}번</Text>
          </View>
        </View>

        {locked ? (
          <Pressable onPress={() => router.push('/bankrupt')} accessibilityRole="button" style={styles.lockBanner}>
            <Text style={[type.label, styles.lockText]}>
              {account.state === 'bankrupt' ? '파산 중이라 회생할 때까지 상점이 잠겨 있어요' : '빚이 있어서 상점을 쓸 수 없어요. 빚 갚는 법 보기 ›'}
            </Text>
          </Pressable>
        ) : null}

        <SpeechBubble text={shopMessage(wallet.streak, wallet.toNextBonus)} />

        <BankCard owned={owned} balance={wallet.balance} onOpen={(code) => setAsking(code)} />

        <Pressable
          onPress={() => router.push('/closet')}
          accessibilityRole="button"
          accessibilityLabel="옷장에서 마스코트 옷 입혀 보기"
          style={({ pressed }) => [styles.closet, pressed && styles.closetPressed]}>
          <Mascot size={72} />
          <View style={styles.closetText}>
            <Text style={[type.headline, styles.ink]}>옷장</Text>
            <Text style={[type.caption, styles.panelLabel]}>모자, 안경, 옷을 끌어다 입혀 봐요. 안 산 것도 입어 볼 수 있어요.</Text>
          </View>
          <Text style={[type.headline, styles.chev]}>›</Text>
        </Pressable>

        {SLOTS.map((slot) => (
          <View key={slot} style={styles.group}>
            <Text style={[type.headline, styles.ink]} accessibilityRole="header">
              {SLOT_LABEL[slot]}
            </Text>
            <View style={styles.grid}>
              {itemsOf(slot).map((item) => {
                const has = owned.has(item.code);
                const wearing = look.items[slot].code === item.code;
                const check = canBuy(item.code, wallet.balance, owned);
                return (
                  <View key={item.code} style={[styles.card, wearing && styles.cardOn]}>
                    <Preview item={item} />
                    <Text style={[type.label, styles.ink]}>{item.name}</Text>
                    {wearing ? (
                      <Text style={[type.caption, styles.wearing]}>착용 중</Text>
                    ) : has ? (
                      <Action label="착용" onPress={() => equip(item)} />
                    ) : check.ok ? (
                      <Action label={`${formatAmount(item.price)}냥`} primary onPress={() => setAsking(item.code)} />
                    ) : !check.ok && check.reason === 'locked' ? (
                      <Text style={[type.caption, styles.muted]}>{check.lock}</Text>
                    ) : (
                      <Text style={[type.caption, styles.muted]}>{formatAmount(check.ok ? 0 : (check.short ?? item.price))}냥 더 필요해요</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
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

/** 확인 창 문구. 은행이면 새로 열리는 물건까지 알려준다. */
function buyMessage(item: ShopItem): string {
  if (item.slot !== 'bank') return `${formatAmount(item.price)}냥이 잔고에서 빠지고 바로 착용해요.`;
  const unlocks = ITEMS.filter((i) => i.needsBank === item.stage).map((i) => i.name);
  const grow = `${formatAmount(item.price)}냥이 잔고에서 빠지고 내 은행이 ${josa(item.name, '으로', '로')} 커져요.`;
  return unlocks.length ? `${grow} 새로 열리는 것: ${unlocks.join(', ')}` : grow;
}

/** 내 은행: 지금 단계 그림, 다음 단계까지 모은 냥, 열기 버튼 (상점기획서 3.1) */
function BankCard({ owned, balance, onOpen }: { owned: Set<string>; balance: number; onOpen: (code: string) => void }) {
  const stage = bankStage(owned);
  const next = nextBank(owned);
  const ratio = next ? Math.min(1, balance / next.price) : 1;
  return (
    <View style={styles.bank}>
      <View style={styles.bankTop}>
        <View style={styles.bankArt}>
          <Image source={BANK_ART[stage]} style={styles.bankImage} contentFit="contain" accessibilityLabel={`내 은행 ${BANK_NAMES[stage]} 그림`} />
        </View>
        <View style={styles.bankText}>
          <Text style={[type.caption, styles.panelLabel]}>내 은행 {stage}단계</Text>
          <Text style={[type.title, styles.ink]}>{BANK_NAMES[stage]}</Text>
          <Text style={[type.caption, styles.panelLabel]}>{next ? `다음은 ${next.name}` : '가장 큰 은행이에요'}</Text>
        </View>
      </View>
      {next ? (
        <>
          <View style={styles.trackRow}>
            <Text style={[type.label, styles.ink]}>{next.name}</Text>
            <Text style={[type.caption, styles.panelLabel]}>
              {formatAmount(Math.min(balance, next.price))} / {formatAmount(next.price)}냥
            </Text>
          </View>
          <View style={styles.track} accessible accessibilityLabel={`${next.name}까지 ${Math.round(ratio * 100)}% 모았어요`}>
            <View style={[styles.trackFill, { width: `${Math.round(ratio * 100)}%` }]} />
          </View>
          <Button
            label={balance >= next.price ? `${formatAmount(next.price)}냥에 열기` : `${formatAmount(next.price - balance)}냥 더 모으면 열려요`}
            variant={balance >= next.price ? 'primary' : 'secondary'}
            disabled={balance < next.price}
            onPress={() => onOpen(next.code)}
          />
        </>
      ) : null}
    </View>
  );
}

function Preview({ item }: { item: ShopItem }) {
  if (item.slot === 'stampInk') return <Stamp kind="saved" size={48} ink={tokenColor(item.value, color.inkRed)} />;
  if (item.slot === 'stampWord') return <Stamp kind="saved" size={48} word={item.value} />;
  if (item.slot === 'stampShape') return <Stamp kind="saved" size={48} shape={toShape(item.value)} />;
  if (item.slot === 'background') return <Image source={BACKGROUNDS[item.value]} style={styles.bgThumb} contentFit="cover" accessible={false} />;
  return (
    <View style={[styles.bubble, { backgroundColor: tokenColor(item.value, color.bubbleCream) }]}>
      <Text style={[type.caption, styles.ink]}>안녕하세요</Text>
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
      <Text style={[type.label, { color: primary ? color.textOnPrimary : color.inkOutline }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  content: layout.content,
  panel: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 20,
    gap: 8,
  },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  streakDot: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSunken,
  },
  streakOn: { backgroundColor: color.accentCoin },
  group: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
  },
  cardOn: { borderWidth: stroke.outline, borderColor: color.inkOutline, backgroundColor: color.brandSoft },
  bubble: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderBottomLeftRadius: 4,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
  },
  action: { minWidth: 88, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, paddingHorizontal: 14 },
  actionPrimary: { backgroundColor: color.brandPrimary, borderWidth: stroke.outline, borderColor: color.inkOutline },
  actionPlain: { backgroundColor: color.bgSurface, borderWidth: stroke.outline, borderColor: color.inkOutline },
  pressed: { opacity: 0.8 },
  wearing: { color: color.brandPrimary, minHeight: 36, lineHeight: 36 },
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
  trackRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: {
    height: 14,
    borderRadius: radius.full,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSunken,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', backgroundColor: color.accentCoin },
  closet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.mascotCream,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 12,
  },
  closetText: { flex: 1, gap: 2 },
  chev: { color: color.inkOutline },
  closetPressed: { opacity: 0.8 },
  bgThumb: { width: 72, height: 48, borderRadius: radius.md, borderWidth: stroke.outline, borderColor: color.inkOutline },
  lockBanner: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: color.debtBg },
  lockText: { color: color.debtFg },
});
