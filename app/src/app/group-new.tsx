import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { GROUP_NAME_MAX, groupNameError, inviteMessage, MAX_MEMBERS, NICKNAME_MAX, nicknameError } from '@/domain/groups';
import { josa } from '@/domain/korean';
import { feedback } from '@/lib/feedback';
import { useGroups } from '@/store/groups';
import * as layout from '@/theme/layout';
import { color, radius, stroke, type } from '@/theme/tokens';

/** TI-SCR-15 그룹 만들기 (FR-075). 만들면 초대 코드를 보여준다. 피그마 53:1594 */
export default function NewGroupScreen() {
  const { create } = useGroups();
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ id: string; code: string } | null>(null);

  const nameErr = touched ? groupNameError(name) : null;
  const nickErr = touched ? nicknameError(nickname) : null;

  const submit = async () => {
    setTouched(true);
    if (groupNameError(name) || nicknameError(nickname) || busy) return;
    setBusy(true);
    setError(null);
    const r = await create(name, nickname);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      feedback.deny();
      return;
    }
    feedback.buy();
    setMade(r.value);
  };

  const share = async () => {
    if (!made) return;
    const link = Linking.createURL('group-join', { queryParams: { code: made.code } });
    try {
      await Share.share({ message: inviteMessage(name.trim(), made.code, link) });
    } catch {
      // 공유 창을 닫았거나 웹에서 지원하지 않으면 코드를 직접 알려 주면 된다
    }
  };

  if (made) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar title="그룹 만들기" lead="close" onLead={() => router.replace({ pathname: '/group/[id]', params: { id: made.id } })} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[type.title, styles.ink]}>{josa(`"${name.trim()}"`, '이', '가')} 생겼어요</Text>
          <View style={styles.invite}>
            <Text style={[type.label, styles.secondary]}>초대 코드</Text>
            <Text style={[type.display, styles.code]} selectable accessibilityLabel={`초대 코드 ${made.code.split('').join(' ')}`}>
              {made.code}
            </Text>
            <Text style={[type.caption, styles.secondary, styles.center]}>친구에게 이 코드를 알려 주세요. {MAX_MEMBERS}명까지 들어올 수 있어요.</Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="초대 링크 보내기" onPress={share} />
          <Button label="그룹으로 가기" variant="secondary" onPress={() => router.replace({ pathname: '/group/[id]', params: { id: made.id } })} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="그룹 만들기" onLead={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label="그룹 이름" value={name} onChangeText={setName} maxLength={GROUP_NAME_MAX} placeholder="예: 스터디 4인방" error={nameErr} />
          <TextField
            label="그룹에서 쓸 내 별명"
            value={nickname}
            onChangeText={setNickname}
            maxLength={NICKNAME_MAX}
            placeholder="예: 헌영"
            hint="카카오 이름 대신 이 별명이 그룹원에게 보여요."
            error={nickErr}
          />
          {error ? (
            <Text style={[type.label, styles.error]} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button label={busy ? '만드는 중' : '만들기'} disabled={busy} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  flex: { flex: 1 },
  content: layout.content,
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  center: { textAlign: 'center' },
  error: { color: color.debtFg },
  invite: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSurface,
  },
  code: { color: color.inkOutline, letterSpacing: 6 },
  footer: layout.footer,
});
