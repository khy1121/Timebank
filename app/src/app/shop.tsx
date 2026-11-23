import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Stamp } from '@/components/Stamp';
import { TopBar } from '@/components/TopBar';
import { formatAmount } from '@/domain/interest';
import { shopMessage } from '@/domain/messages';
import { canBuy, itemOf, itemsOf, SLOT_LABEL, SLOTS, type ShopItem } from '@/domain/shop';
import { STREAK_STEP } from '@/domain/wallet';
import { tokenColor, useLook } from '@/store/look';
import { useProfile } from '@/store/profile';
import { useTodos } from '@/store/todos';
import { color, hardShadow, radius, stroke, type } from '@/theme/tokens';

/** TI-SCR-10 상점. 잔고와 연속 기록, 칸마다 물건을 사고 착용한다. (FR-060~064) */
export default function ShopScreen() {
  const { wallet, owned, buy } = useTodos();
  const { profile, update } = useProfile();
  const look = useLook();
  const [asking, setAsking] = useState<string | null>(null);
  const askingItem = asking ? itemOf(asking) : undefined;

  const equip = (item: ShopItem) => {
    if (!profile) return;
    update({ equipped: { ...profile.equipped, [item.slot]: item.code } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="상점" onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.panel, hardShadow(4)]}>
          <Text style={[type.label, styles.muted]}>내 잔고</Text>
          <Amount value={wallet.balance} size="XL" />
          <View style={styles.streak} accessible accessibilityLabel={`연속 기록 ${wallet.streak}번, 보너스까지 ${wallet.toNextBonus}번`}>
            {Array.from({ length: STREAK_STEP }, (_, i) => (
              <View key={i} style={[styles.streakDot, i < wallet.streak % STREAK_STEP && styles.streakOn]} />
            ))}
            <Text style={[type.caption, styles.muted]}>보너스까지 {wallet.toNextBonus}번</Text>
          </View>
        </View>

        <SpeechBubble text={shopMessage(wallet.streak, wallet.toNextBonus)} />

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
                    ) : (
                      <Text style={[type.caption, styles.muted]}>{formatAmount(check.short ?? item.price)}냥 더 필요해요</Text>
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
        title={askingItem ? `${SLOT_LABEL[askingItem.slot]} "${askingItem.name}"을 살까요?` : ''}
        message={askingItem ? `${formatAmount(askingItem.price)}냥이 잔고에서 빠지고 바로 착용해요.` : ''}
        confirmLabel="사기"
        onConfirm={() => {
          if (askingItem && buy(askingItem.code)) equip(askingItem);
          setAsking(null);
        }}
        onCancel={() => setAsking(null)}
      />
    </SafeAreaView>
  );
}

function Preview({ item }: { item: ShopItem }) {
  if (item.slot === 'stampInk') return <Stamp kind="repaid" size={48} ink={tokenColor(item.value, color.inkRed)} />;
  if (item.slot === 'stampWord') return <Stamp kind="repaid" size={48} word={item.value} />;
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
  safe: { flex: 1, backgroundColor: color.bgPage },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 20 },
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
  ink: { color: color.textPrimary },
});
