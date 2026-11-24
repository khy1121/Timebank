import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ThemeBadge } from '@/components/ThemeBadge';
import { TopBar } from '@/components/TopBar';
import { CODE_LENGTH, codeFromText, isCompleteCode, NICKNAME_MAX, nicknameError, normalizeCode } from '@/domain/groups';
import { feedback } from '@/lib/feedback';
import { useGroups, type GroupPreview } from '@/store/groups';
import * as layout from '@/theme/layout';
import { color, inputType, radius, stroke, type } from '@/theme/tokens';

/** 찾지 못했으면 null, 서버 오류면 그 문구 */
type Lookup = { code: string; result: GroupPreview | null | { error: string } };

/** TI-SCR-15 그룹 들어가기 (FR-076). 초대 링크로 오면 코드가 채워져 있다. 피그마 53:1560 */
export default function JoinGroupScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { preview, join } = useGroups();
  const [code, setCode] = useState(() => (params.code ? normalizeCode(params.code) : ''));
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [nickname, setNickname] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 6자리가 다 차면 그룹을 찾아 보여준다. 결과는 코드와 함께 저장해 예전 코드의 결과가 섞이지 않게 한다.
  const complete = isCompleteCode(code);
  useEffect(() => {
    if (!complete) return;
    let active = true;
    preview(code).then((r) => {
      if (active) setLookup({ code, result: r.ok ? r.value : { error: r.message } });
    });
    return () => {
      active = false;
    };
  }, [code, complete, preview]);

  const found = lookup && lookup.code === code ? lookup.result : undefined;
  const failed = found && 'error' in found ? found.error : null;
  const group = found && !('error' in found) ? found : null;
  const nickErr = touched ? nicknameError(nickname) : null;
  const full = !!group && !group.isMember && group.members >= group.maxMembers;

  const submit = async () => {
    setTouched(true);
    if (!group || busy) return;
    if (group.isMember) {
      router.replace({ pathname: '/group/[id]', params: { id: group.id } });
      return;
    }
    if (nicknameError(nickname)) return;
    setBusy(true);
    setError(null);
    const r = await join(code, nickname);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      feedback.deny();
      return;
    }
    feedback.buy();
    router.replace({ pathname: '/group/[id]', params: { id: r.value } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="들어가기" onLead={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[type.title, styles.ink]}>초대 코드 {CODE_LENGTH}자리를 넣어 주세요</Text>
          <TextInput
            value={code}
            // 초대 메시지를 통째로 붙여 넣어도 코드만 골라낸다
            onChangeText={(v) => setCode(v.length > CODE_LENGTH + 2 ? (codeFromText(v) ?? normalizeCode(v)) : normalizeCode(v))}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="K7Q2M9"
            placeholderTextColor={color.textTertiary}
            accessibilityLabel="초대 코드"
            style={[inputType.title, styles.codeInput, { borderColor: complete ? color.inkOutline : color.borderDefault }]}
          />

          {complete && found === undefined ? <Text style={[type.caption, styles.muted]}>그룹을 찾는 중이에요</Text> : null}
          {found === null ? <Text style={[type.label, styles.error]}>이 코드의 그룹이 없어요. 코드를 다시 확인해 주세요.</Text> : null}
          {failed ? <Text style={[type.label, styles.error]}>{failed}</Text> : null}

          {group ? (
            <View style={styles.preview}>
              <Text style={[type.headline, styles.ink]}>{group.name}</Text>
              <ThemeBadge theme={group.theme} label={group.themeLabel} />
              <Text style={[type.caption, styles.secondary]}>
                {group.members}명이 함께해요{group.ownerNickname ? `. 방장 ${group.ownerNickname}` : ''}
              </Text>
              {group.isMember ? <Text style={[type.caption, styles.ok]}>이미 들어가 있는 그룹이에요</Text> : null}
              {full ? <Text style={[type.caption, styles.error]}>그룹이 꽉 찼어요</Text> : null}
            </View>
          ) : null}

          {group && !group.isMember ? (
            <TextField
              label="그룹에서 쓸 별명"
              value={nickname}
              onChangeText={setNickname}
              maxLength={NICKNAME_MAX}
              placeholder="예: 헌영"
              hint="카카오 이름 대신 이 별명이 그룹원에게 보여요."
              error={nickErr}
            />
          ) : null}
          {error ? (
            <Text style={[type.label, styles.error]} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button label={group?.isMember ? '그룹으로 가기' : busy ? '들어가는 중' : '들어가기'} disabled={!group || full || busy} onPress={submit} />
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
  muted: { color: color.textTertiary },
  ok: { color: color.okFg },
  error: { color: color.debtFg },
  codeInput: {
    backgroundColor: color.bgSurface,
    borderWidth: stroke.outline,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: color.inkOutline,
    letterSpacing: 8,
    textAlign: 'center',
  },
  preview: {
    gap: 6,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.mascotCream,
  },
  footer: layout.footer,
});
