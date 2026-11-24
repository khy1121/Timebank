import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { SettingRow } from '@/components/SettingRow';
import { Toggle } from '@/components/Toggle';
import { TopBar } from '@/components/TopBar';
import { formatTimeLabel, NOTIFY_TIMES } from '@/domain/profile';
import { DELETE_WORD, feedbackMailto, isDeleteConfirmed } from '@/domain/settings';
import { clearEvents, flush, track } from '@/lib/events';
import { feedback, getSettings, setSettings, subscribe } from '@/lib/feedback';
import { useAuth } from '@/store/auth';
import { useNotifications } from '@/store/notifications';
import { useProfile } from '@/store/profile';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

const CONTACT = process.env.EXPO_PUBLIC_CONTACT_EMAIL ?? '';
const VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Dialog = 'signOut' | 'time' | 'deleteWarn' | 'deleteType' | null;

/** TI-SCR-07 설정. 알림, 순위, 소리와 진동, 도움말, 계정. (FR-003, FR-004, FR-032, FR-033, FR-050~052, FR-067, FR-073) */
export default function SettingsScreen() {
  const { email, signOut, deleteAccount } = useAuth();
  const { pendingCount, syncState, clearLocal: clearTodos } = useTodos();
  const { profile, update, clearLocal: clearProfile } = useProfile();
  const { permission, request } = useNotifications();
  const [dialog, setDialog] = useState<Dialog>(null);
  const fb = useSyncExternalStore(subscribe, getSettings, getSettings);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const unsupported = permission === 'unsupported';
  const notifyOn = !!profile?.notifyEnabled && !unsupported;
  const friendsOn = !!profile?.pushFriends && !unsupported;
  const syncText =
    pendingCount > 0
      ? syncState === 'syncing'
        ? `서버에 저장하는 중 (${pendingCount}건)`
        : `아직 서버에 저장되지 않은 변경 ${pendingCount}건`
      : '모두 서버에 저장됐어요';

  const toggleNotify = async (next: boolean) => {
    track('notify_toggle', { enabled: next });
    await update({ notifyEnabled: next });
    // 켰는데 아직 권한을 물은 적이 없으면 지금 묻는다
    if (next && permission === 'undetermined') await request();
  };

  const toggleFriends = async (next: boolean) => {
    track('push_friends_toggle', { enabled: next });
    await update({ pushFriends: next });
    if (next && permission === 'undetermined') await request();
  };

  const closeDelete = () => {
    setDialog(null);
    setTyped('');
    setDeleteError(null);
  };

  const runDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAccount();
    if (!result.ok) {
      setDeleting(false);
      setDeleteError(result.message);
      return;
    }
    // 계정이 지워졌다. 이 기기에 남은 사본도 지운다. 화면은 로그인으로 넘어간다.
    await Promise.all([clearTodos(), clearProfile(), clearEvents()]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="설정" onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Group label="알림">
          <SettingRow
            first
            label="알림 받기"
            hint={unsupported ? '알림은 휴대폰 앱에서만 받을 수 있어요' : '기한 당일과, 연체된 동안 원금이 얼마나 깎였는지 알려요'}
            right={<Toggle value={notifyOn} onChange={toggleNotify} label="알림 받기" disabled={unsupported || !profile} />}
          />
          <SettingRow
            label="알림 시각"
            value={profile ? formatTimeLabel(profile.notifyTime) : undefined}
            tone={notifyOn ? 'default' : 'muted'}
            onPress={notifyOn ? () => setDialog('time') : undefined}
          />
          <SettingRow
            label="친구 알림"
            hint={unsupported ? '알림은 휴대폰 앱에서만 받을 수 있어요' : '그룹 친구가 인증을 올리거나, 내 인증이 통과하거나 의심받으면 알려요'}
            right={<Toggle value={friendsOn} onChange={toggleFriends} label="친구 알림" disabled={unsupported || !profile} />}
          />
          {(notifyOn || friendsOn) && permission === 'denied' ? (
            <SettingRow
              label="기기 알림 권한이 꺼져 있어요"
              hint="기기 설정에서 켜야 알림이 와요"
              tone="warn"
              onPress={() => Linking.openSettings()}
            />
          ) : null}
        </Group>

        <Group label="순위">
          <SettingRow
            first
            label="상태 말투"
            hint={profile?.voice === 'mild' ? '순한맛: 놀리되 비난하지 않아요' : '매운맛: 밀리면 독하게 말해요'}
            right={
              <View style={styles.voice} accessibilityRole="radiogroup">
                <Chip label="매운맛" selected={profile?.voice !== 'mild'} onPress={() => {
                    update({ voice: 'spicy' });
                    track('voice_change', { voice: 'spicy' });
                  }} disabled={!profile} />
                <Chip label="순한맛" selected={profile?.voice === 'mild'} onPress={() => {
                    update({ voice: 'mild' });
                    track('voice_change', { voice: 'mild' });
                  }} disabled={!profile} />
              </View>
            }
          />
        </Group>

        <Group label="소리와 진동">
          <SettingRow
            first
            label="효과음"
            hint="옷 입히기, 사기 같은 순간에 짧은 소리가 나요. 무음 모드에서는 안 나요"
            right={
              <Toggle
                value={fb.sound}
                onChange={(sound) => {
                  setSettings({ ...fb, sound });
                  if (sound) feedback.tap();
                }}
                label="효과음"
              />
            }
          />
          <SettingRow
            label="진동"
            hint={Platform.OS === 'web' ? '진동은 휴대폰 앱에서만 돼요' : '누를 때 가볍게 떨려요'}
            right={
              <Toggle
                value={fb.haptics && Platform.OS !== 'web'}
                onChange={(haptics) => {
                  setSettings({ ...fb, haptics });
                  if (haptics) feedback.tap();
                }}
                label="진동"
                disabled={Platform.OS === 'web'}
              />
            }
          />
        </Group>

        <Group label="도움말">
          <SettingRow first label="이자 규칙 다시 보기" onPress={() => router.push({ pathname: '/onboarding', params: { review: '1' } })} />
          {CONTACT ? (
            <SettingRow
              label="의견 보내기"
              onPress={() => Linking.openURL(feedbackMailto({ address: CONTACT, version: VERSION, platform: Platform.OS }))}
            />
          ) : null}
          <SettingRow label="개인정보 처리방침" onPress={() => router.push('/privacy')} />
        </Group>

        <Group label="계정">
          <SettingRow first label={email ?? '로그인 정보 없음'} tone="muted" />
          <SettingRow label={syncText} tone={pendingCount > 0 && syncState !== 'syncing' ? 'danger' : 'muted'} />
          <SettingRow label="로그아웃" onPress={() => setDialog('signOut')} />
          <SettingRow label="계정 삭제" hint="모든 할 일과 내역이 지워져요" tone="danger" onPress={() => setDialog('deleteWarn')} />
        </Group>

        <Text style={[type.caption, styles.version]}>버전 {VERSION}</Text>
      </ScrollView>

      <ConfirmSheet
        visible={dialog === 'signOut'}
        title="로그아웃할까요?"
        message={
          pendingCount > 0
            ? `아직 서버에 저장되지 않은 변경 ${pendingCount}건이 있어요. 지금 로그아웃하면 그 변경은 사라져요.`
            : '할 일은 서버에 저장되어 있어서, 다시 로그인하면 그대로 볼 수 있어요.'
        }
        confirmLabel="로그아웃"
        danger={pendingCount > 0}
        onConfirm={async () => {
          setDialog(null);
          // 로그아웃 전에 남은 사용 기록을 올리고 지운다
          await flush().catch(() => {});
          await Promise.all([clearTodos(), clearProfile(), clearEvents()]);
          await signOut();
        }}
        onCancel={() => setDialog(null)}
      />

      <ConfirmSheet
        visible={dialog === 'deleteWarn'}
        title="계정을 삭제할까요?"
        message="모든 할 일과 내역이 삭제되고 되돌릴 수 없어요."
        confirmLabel="계속"
        danger
        onConfirm={() => setDialog('deleteType')}
        onCancel={closeDelete}
      />

      {/* 알림 시각 고르기 */}
      <Modal visible={dialog === 'time'} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDialog(null)} accessibilityLabel="닫기">
          <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
            <Text style={[type.title, styles.sheetTitle]} accessibilityRole="header">
              몇 시에 알려 드릴까요?
            </Text>
            <View style={styles.times} accessibilityRole="radiogroup">
              {NOTIFY_TIMES.map((time) => (
                <Chip
                  key={time}
                  label={formatTimeLabel(time)}
                  selected={profile?.notifyTime === time}
                  onPress={() => {
                    update({ notifyTime: time });
                    setDialog(null);
                  }}
                />
              ))}
            </View>
            <Button label="그만두기" variant="secondary" onPress={() => setDialog(null)} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 계정 삭제 2단계: 글자를 직접 입력해야 진행된다 */}
      <Modal visible={dialog === 'deleteType'} transparent animationType="fade" onRequestClose={deleting ? undefined : closeDelete}>
        <View style={styles.backdrop}>
          <View style={styles.sheet} accessibilityViewIsModal>
            {deleting ? (
              <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel="계정을 삭제하는 중">
                <ActivityIndicator color={color.debtFg} />
                <Text style={[type.body, styles.sheetMessage]}>계정을 삭제하는 중이에요</Text>
              </View>
            ) : (
              <>
                <Text style={[type.title, styles.sheetTitle]} accessibilityRole="header">
                  정말 삭제하려면
                </Text>
                <Text style={[type.body, styles.sheetMessage]}>아래에 &quot;{DELETE_WORD}&quot;라고 입력해 주세요.</Text>
                <TextInput
                  value={typed}
                  onChangeText={setTyped}
                  placeholder={DELETE_WORD}
                  placeholderTextColor={color.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={`${DELETE_WORD}라고 입력`}
                  style={[type.body, styles.input]}
                />
                {deleteError ? (
                  <Text style={[type.label, styles.error]} accessibilityRole="alert">
                    {deleteError}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <Button label="계정 삭제" variant="danger" disabled={!isDeleteConfirmed(typed)} onPress={runDelete} />
                  <Button label="그만두기" variant="secondary" onPress={closeDelete} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={[type.label, styles.groupLabel]} accessibilityRole="header">
        {label}
      </Text>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  content: layout.content,
  group: { gap: 8 },
  groupLabel: { color: color.textSecondary, paddingLeft: 8 },
  rows: layout.list,
  version: { color: color.textTertiary, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(22, 34, 74, 0.45)', justifyContent: 'flex-end', padding: 16 },
  sheet: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 24,
    gap: 12,
  },
  sheetTitle: { color: color.textPrimary },
  sheetMessage: { color: color.textSecondary },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  input: {
    backgroundColor: color.bgSurface,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: color.textPrimary,
  },
  error: { color: color.debtFg },
  actions: { gap: 12, marginTop: 8 },
  progress: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  voice: { flexDirection: 'row', gap: 6 },
});
