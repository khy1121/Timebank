import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { SpeechBubble } from '@/components/SpeechBubble';
import { TopBar } from '@/components/TopBar';
import { diffDays, formatKoreanDate } from '@/domain/dates';
import { formatAmount } from '@/domain/interest';
import { BANKRUPT_AT, REHAB_GRANT } from '@/domain/savings';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

const won = (n: number) => `${n < 0 ? '−' : ''}${formatAmount(Math.abs(n))}냥`;

/**
 * 파산과 회생 (시간적금기획서 4.6, 피그마 71:687)
 * - 파산 중: 회생까지 남은 날과 달라지는 것
 * - 빚 상태: 지금 순자산과 파산 기준, 직접 파산 신청
 */
export default function BankruptScreen() {
  const { account, today, declareBankruptcy } = useTodos();
  const [ask, setAsk] = useState(false);
  const bankrupt = account.state === 'bankrupt' && account.rehabOn;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar lead="close" title={bankrupt ? '파산' : '빚'} onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {bankrupt ? (
          <>
            <View style={styles.heading}>
              <Text style={[type.display, styles.danger]} accessibilityRole="header">
                파산했어요
              </Text>
              <Text style={[type.body, styles.muted]}>빚은 모두 사라졌고, 회생하는 날 다시 시작할 수 있어요.</Text>
            </View>
            <View style={styles.rehab} accessible accessibilityLabel={`회생까지 ${diffDays(today, account.rehabOn!)}일`}>
              <Text style={[type.label, styles.muted]}>회생까지</Text>
              <Text style={[type.numberXL, styles.ink]}>{Math.max(0, diffDays(today, account.rehabOn!))}일</Text>
              <Text style={[type.caption, styles.muted]}>
                {formatKoreanDate(account.rehabOn!)}에 회생 지원금 {formatAmount(REHAB_GRANT)}냥을 받아요
              </Text>
            </View>
            <View style={styles.list}>
              {[
                ['빚', '0냥으로 사라졌어요'],
                ['걸어 둔 적금', '모두 사라졌어요'],
                ['상점', '회생할 때까지 잠겨요'],
                ['이번 주 순위', '빠져요'],
                ['옷장', '산 물건은 그대로예요'],
                ['할 일', '지금도 적고 끝낼 수 있어요. 원금은 회생하는 날 걸려요'],
              ].map(([k, v], i) => (
                <View key={k} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <Text style={[type.label, styles.key]}>{k}</Text>
                  <Text style={[type.body, styles.value]}>{v}</Text>
                </View>
              ))}
            </View>
            <SpeechBubble text="괜찮아요. 다들 한 번쯤은 무너져요. 이번엔 작은 일부터 걸어 봐요." />
          </>
        ) : (
          <>
            <View style={styles.heading}>
              <Text style={[type.title, styles.ink]} accessibilityRole="header">
                {account.state === 'debt' ? '순자산이 마이너스예요' : '빚이 없어요'}
              </Text>
              <Text style={[type.body, styles.muted]}>
                지금 순자산은 {won(account.netWorth)}이에요. {won(BANKRUPT_AT)}에 닿으면 저절로 파산해요.
                {account.state === 'debt' ? ' 빚이 있는 동안 상점을 쓸 수 없어요.' : ''}
              </Text>
            </View>
            <View style={styles.list}>
              {[
                ['빚 갚는 법', '할 일을 기한 안에 끝내면 원금과 이자가 돌아와 빚이 줄어요'],
                ['파산 신청', `빚을 0으로 만들고 7일 뒤 ${formatAmount(REHAB_GRANT)}냥으로 다시 시작해요. 걸어 둔 적금은 사라져요`],
              ].map(([k, v], i) => (
                <View key={k} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <Text style={[type.label, styles.key]}>{k}</Text>
                  <Text style={[type.body, styles.value]}>{v}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      {!bankrupt && account.state === 'debt' ? (
        <View style={styles.footer}>
          <Button label="파산 신청하기" variant="danger" onPress={() => setAsk(true)} />
        </View>
      ) : null}
      <ConfirmSheet
        visible={ask}
        title="파산할까요?"
        message={`빚과 걸어 둔 적금이 모두 사라지고, 7일 동안 상점이 잠기고 순위에서 빠져요. 7일 뒤 회생 지원금 ${formatAmount(REHAB_GRANT)}냥을 받아요.`}
        confirmLabel="파산하기"
        danger
        onConfirm={() => {
          setAsk(false);
          declareBankruptcy();
        }}
        onCancel={() => setAsk(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  content: layout.content,
  heading: { gap: 8 },
  danger: { color: color.debtFg },
  ink: { color: color.textPrimary },
  muted: { color: color.textSecondary },
  rehab: {
    alignItems: 'center',
    gap: 6,
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSurface,
  },
  list: layout.list,
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  key: { width: 96, color: color.textPrimary },
  value: { flex: 1, color: color.textSecondary },
  footer: layout.footer,
});
