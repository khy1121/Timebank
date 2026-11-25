import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { SpeechBubble } from '@/components/SpeechBubble';
import { isValidEmail } from '@/domain/auth';
import { LOGIN_GREETING } from '@/domain/messages';
import { useAuth } from '@/store/auth';
import { color, radius, stroke, themed, type } from '@/theme/tokens';

/**
 * 이메일 6자리 코드 로그인을 보여줄지.
 * Supabase는 자체 메일 서버(SMTP)를 연결해야 메일 문구를 바꿀 수 있어서, 그 전에는 코드가 아니라 링크가 간다.
 * 메일 서버를 연결하고 메일 본문에 {{ .Token }}을 넣은 뒤 true로 바꾼다.
 */
const EMAIL_LOGIN_ENABLED = false;

/** TI-SCR-01 로그인. (FR-001, FR-055) */
export default function LoginScreen() {
  const { signInWithKakao, requestCode } = useAuth();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState<'kakao' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const valid = isValidEmail(email);

  const kakao = async () => {
    if (busy) return;
    setBusy('kakao');
    setError(null);
    const result = await signInWithKakao();
    setBusy(null);
    // 성공하면 로그인 상태가 바뀌면서 화면이 홈으로 넘어간다
    if (!result.ok) setError(result.message);
  };

  const sendCode = async () => {
    if (!valid || busy) return;
    setBusy('email');
    setError(null);
    const result = await requestCode(email);
    setBusy(null);
    if (result.ok) router.push('/verify');
    else setError(result.message);
  };

  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/images/bg-pattern.png')}
        style={styles.pattern}
        contentFit="cover"
        accessible={false}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SpeechBubble text={LOGIN_GREETING} />
          <Text style={[type.display, styles.title]} accessibilityRole="header">
            할일통장
          </Text>

          <View style={styles.form}>
            <Button
              label={busy === 'kakao' ? '카카오로 이동하는 중…' : '카카오로 시작하기'}
              variant="kakao"
              onPress={kakao}
              disabled={busy !== null}
            />

            {EMAIL_LOGIN_ENABLED ? (
              <>
                <Text style={[type.caption, styles.or]}>또는 이메일로</Text>
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError(null);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={sendCode}
                  placeholder="이메일"
                  placeholderTextColor={color.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  accessibilityLabel="이메일"
                  style={[
                    type.body,
                    styles.input,
                    { borderColor: focused ? color.brandPrimary : email ? color.inkOutline : color.borderDefault },
                  ]}
                />
                <Button
                  label={busy === 'email' ? '보내는 중…' : '인증 코드 받기'}
                  variant="secondary"
                  onPress={sendCode}
                  disabled={!valid || busy !== null}
                />
              </>
            ) : null}

            {error ? (
              <Text style={[type.label, styles.error]} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
          </View>

          <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" accessibilityLabel="개인정보 처리방침 보기" hitSlop={12}>
            <Text style={[type.caption, styles.terms]}>
              계속하면 <Text style={styles.termsLink}>개인정보 처리방침</Text>에 동의하게 돼요
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: color.bgPage },
  pattern: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.08 },
  safe: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 24 },
  title: { color: color.textPrimary },
  form: { gap: 12 },
  or: { color: color.textTertiary, textAlign: 'center' },
  input: {
    backgroundColor: color.bgSurface,
    borderWidth: stroke.outline,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: color.textPrimary,
  },
  error: { color: color.debtFg },
  terms: { color: color.textTertiary, textAlign: 'center' },
  termsLink: { color: color.textSecondary, textDecorationLine: 'underline' },
}));
