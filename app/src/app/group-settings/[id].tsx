import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { SettingRow } from '@/components/SettingRow';
import { ThemeBadge } from '@/components/ThemeBadge';
import { TopBar } from '@/components/TopBar';
import { GROUP_THEMES, inviteMessage, MAX_MEMBERS, type Member } from '@/domain/groups';
import { josa } from '@/domain/korean';
import { useGroups } from '@/store/groups';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

type Dialog = { kind: 'leave' } | { kind: 'rotate' } | { kind: 'kick'; member: Member } | null;

/** TI-SCR-19 그룹 설정: 초대 코드, 그룹원 내보내기, 나가기 (FR-076, FR-077) */
export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups: myGroups, members: fetchMembers, leave, rotateCode, kick, refresh, setTheme } = useGroups();
  const group = myGroups.find((g) => g.id === id);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 상태는 응답을 받은 뒤 콜백에서만 바꾼다. React Compiler가 알아서 기억하므로 useCallback을 쓰지 않는다.
  const load = (): Promise<void> => {
    if (!id) return Promise.resolve();
    return fetchMembers(id).then((r) => {
      if (r.ok) setMembers(r.value);
      else setMessage(r.message);
    });
  };

  useEffect(() => {
    if (!id) return;
    fetchMembers(id).then((r) => {
      if (r.ok) setMembers(r.value);
      else setMessage(r.message);
    });
  }, [id, fetchMembers]);

  const share = async () => {
    if (!group) return;
    const link = Linking.createURL('group-join', { queryParams: { code: group.inviteCode } });
    try {
      await Share.share({ message: inviteMessage(group.name, group.inviteCode, link) });
    } catch {
      // 공유 창을 닫았다
    }
  };

  if (!group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar title="그룹 설정" onLead={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="그룹 설정" onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.invite}>
          <Text style={[type.label, styles.secondary]}>초대 코드</Text>
          <Text style={[type.display, styles.code]} selectable accessibilityLabel={`초대 코드 ${group.inviteCode.split('').join(' ')}`}>
            {group.inviteCode}
          </Text>
          <Text style={[type.caption, styles.secondary]}>
            {group.members}명이 함께해요. {MAX_MEMBERS}명까지 들어올 수 있어요.
          </Text>
          <Button label="초대 링크 보내기" onPress={share} />
          {group.isOwner ? <Button label="초대 코드 바꾸기" variant="secondary" onPress={() => setDialog({ kind: 'rotate' })} /> : null}
        </View>

        {message ? (
          <Text style={[type.label, styles.error]} accessibilityRole="alert">
            {message}
          </Text>
        ) : null}

        <View style={styles.themeField}>
          <Text style={[type.label, styles.secondary]}>테마</Text>
          {group.isOwner ? (
            <View style={styles.themes} accessibilityRole="radiogroup">
              {GROUP_THEMES.map((t) => (
                <Chip
                  key={t.code}
                  label={t.label}
                  selected={group.theme === t.code}
                  onPress={async () => {
                    if (group.theme === t.code) return;
                    const r = await setTheme(group.id, t.code, null);
                    if (!r.ok) setMessage(r.message);
                  }}
                />
              ))}
            </View>
          ) : (
            <ThemeBadge theme={group.theme} label={group.themeLabel} />
          )}
        </View>

        <Text style={[type.label, styles.secondary]}>그룹원</Text>
        <View style={styles.list}>
          {(members ?? []).map((m, i) => (
            <SettingRow
              key={m.userId}
              first={i === 0}
              label={m.isMe ? `${m.nickname} (나)` : m.nickname}
              hint={m.isOwner ? '방장' : undefined}
              value={group.isOwner && !m.isMe ? '내보내기' : undefined}
              onPress={group.isOwner && !m.isMe ? () => setDialog({ kind: 'kick', member: m }) : undefined}
            />
          ))}
        </View>

        <View style={styles.list}>
          <SettingRow first label="그룹 나가기" tone="danger" onPress={() => setDialog({ kind: 'leave' })} />
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={dialog?.kind === 'leave'}
        title={`${josa(group.name, '을', '를')} 나갈까요?`}
        message={
          group.members <= 1
            ? '마지막 한 명이라 나가면 그룹이 사라지고, 올라온 인증도 모두 지워져요.'
            : `내가 올린 인증과 투표가 이 그룹에서 지워져요.${group.isOwner ? ' 방장은 가장 먼저 들어온 사람에게 넘어가요.' : ''}`
        }
        confirmLabel="나가기"
        danger
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          setDialog(null);
          const r = await leave(group.id);
          if (r.ok) router.dismissTo('/groups');
          else setMessage(r.message);
        }}
      />
      <ConfirmSheet
        visible={dialog?.kind === 'rotate'}
        title="초대 코드를 바꿀까요?"
        message="지금 코드로는 더 이상 들어올 수 없어요. 이미 들어온 사람은 그대로예요."
        confirmLabel="바꾸기"
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          setDialog(null);
          const r = await rotateCode(group.id);
          if (!r.ok) setMessage(r.message);
        }}
      />
      <ConfirmSheet
        visible={dialog?.kind === 'kick'}
        title={dialog?.kind === 'kick' ? `${josa(dialog.member.nickname, '을', '를')} 내보낼까요?` : ''}
        message="그 사람이 올린 인증과 투표가 이 그룹에서 지워져요. 초대 코드를 알면 다시 들어올 수 있으니, 필요하면 코드도 바꿔 주세요."
        confirmLabel="내보내기"
        danger
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.kind !== 'kick') return;
          const target = dialog.member;
          setDialog(null);
          const r = await kick(group.id, target.userId);
          if (!r.ok) setMessage(r.message);
          await Promise.all([load(), refresh()]);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  content: layout.content,
  secondary: { color: color.textSecondary },
  error: { color: color.debtFg },
  invite: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSurface,
  },
  code: { color: color.inkOutline, letterSpacing: 6 },
  list: layout.list,
  themeField: { gap: 8 },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
