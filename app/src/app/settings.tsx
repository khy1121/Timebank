import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/store/auth';
import { useTodos } from '@/store/todos';
import { color, radius, stroke, type } from '@/theme/tokens';

/**
 * TI-SCR-07 설정. 지금은 계정 영역과 서버 저장 상태만 있다.
 * 알림, 도움말, 계정 삭제는 해당 기능을 만들 때 추가한다.
 */
export default function SettingsScreen() {
  const { email, signOut } = useAuth();
  const { pendingCount, syncState, clearLocal } = useTodos();
  const [askSignOut, setAskSignOut] = useState(false);
  const syncText =
    pendingCount > 0
      ? syncState === 'syncing'
        ? `서버에 저장하는 중 (${pendingCount}건)`
        : `아직 서버에 저장되지 않은 변경 ${pendingCount}건`
      : '모두 서버에 저장됐어요';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="설정" onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <Text style={[type.label, styles.groupLabel]} accessibilityRole="header">
            계정
          </Text>
          <View style={styles.rows}>
            <View style={styles.row}>
              <Text style={[type.body, styles.muted]}>{email ?? '로그인 정보 없음'}</Text>
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={[type.body, pendingCount > 0 && syncState !== 'syncing' ? styles.warn : styles.muted]}>{syncText}</Text>
            </View>
            <Pressable
              onPress={() => setAskSignOut(true)}
              accessibilityRole="button"
              accessibilityLabel="로그아웃"
              style={[styles.row, styles.rowBorder]}>
              <Text style={[type.body, styles.ink]}>로그아웃</Text>
            </Pressable>
          </View>
        </View>
        <Text style={[type.caption, styles.version]}>버전 {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>

      <ConfirmSheet
        visible={askSignOut}
        title="로그아웃할까요?"
        message={
          pendingCount > 0
            ? `아직 서버에 저장되지 않은 변경 ${pendingCount}건이 있어요. 지금 로그아웃하면 그 변경은 사라져요.`
            : '할 일은 서버에 저장되어 있어서, 다시 로그인하면 그대로 볼 수 있어요.'
        }
        confirmLabel="로그아웃"
        danger={pendingCount > 0}
        onConfirm={async () => {
          setAskSignOut(false);
          await clearLocal();
          await signOut();
        }}
        onCancel={() => setAskSignOut(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bgPage },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 24 },
  group: { gap: 8 },
  groupLabel: { color: color.textSecondary, paddingLeft: 8 },
  rows: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
    overflow: 'hidden',
  },
  row: { paddingVertical: 15, paddingHorizontal: 16 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  muted: { color: color.textSecondary },
  warn: { color: color.debtFg },
  ink: { color: color.textPrimary },
  version: { color: color.textTertiary, textAlign: 'center' },
});
