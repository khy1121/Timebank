import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';
import { CODE_LENGTH, formatCountdown, isCompleteCode, normalizeCode, RESEND_SECONDS } from '@/domain/auth';
import { useAuth } from '@/store/auth';
import { color, radius, stroke, themed, type } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

/** TI-SCR-02 인증 코드. 메일로 받은 6자리 코드를 확인한다. (FR-001) */
export default function VerifyScreen() {
  const { pendingEmail, verifyCode, requestCode, cancelPending } = useAuth();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [left, setLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const back = () => {
    cancelPending();
    goBack();
  };

  const check = async (value: string) => {
    if (checking) return;
    setChecking(true);
    setError(null);
    const result = await verifyCode(value);
    setChecking(false);
    // 성공하면 로그인 상태가 바뀌면서 화면이 홈으로 넘어간다
    if (!result.ok) {
      setError(result.message);
      setCode('');
      input.current?.focus();
    }
  };

  const onChange = (raw: string) => {
    const next = normalizeCode(raw);
    setCode(next);
    setError(null);
    setNotice(null);
    if (isCompleteCode(next)) check(next);
  };

  const resend = async () => {
    if (left > 0 || !pendingEmail) return;
    setError(null);
    const result = await requestCode(pendingEmail);
    if (result.ok) {
      setLeft(RESEND_SECONDS);
      setNotice('코드를 다시 보냈어요.');
    } else {
      setError(result.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar onLead={back} />
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={[type.title, styles.title]} accessibilityRole="header">
            메일로 보낸 코드를{'\n'}입력해 주세요
          </Text>
          <Text style={[type.body, styles.muted]}>{pendingEmail ?? '이메일부터 다시 입력해 주세요'}</Text>
        </View>

        <Pressable onPress={() => input.current?.focus()} style={styles.boxes} accessible={false}>
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const digit = code[i];
            const active = i === code.length && !checking;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  { borderColor: error ? color.debtFg : digit ? color.inkOutline : active ? color.brandPrimary : color.borderDefault },
                ]}>
                <Text style={[type.numberL, styles.digit]}>{digit ?? ''}</Text>
              </View>
            );
          })}
          <TextInput
            ref={input}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH + 2}
            editable={!checking && !!pendingEmail}
            autoFocus
            caretHidden
            accessibilityLabel="인증 코드 6자리"
            style={styles.hiddenInput}
          />
        </Pressable>

        {checking ? <Text style={[type.label, styles.muted]}>확인하는 중…</Text> : null}
        {error ? (
          <Text style={[type.label, styles.error]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        {notice ? <Text style={[type.label, styles.ok]}>{notice}</Text> : null}

        <Pressable
          onPress={resend}
          disabled={left > 0}
          accessibilityRole="button"
          accessibilityLabel="코드 다시 받기"
          accessibilityState={{ disabled: left > 0 }}
          hitSlop={10}>
          <Text style={[type.label, { color: left > 0 ? color.textTertiary : color.brandPrimary }]}>
            {left > 0 ? `코드 다시 받기 (${formatCountdown(left)})` : '코드 다시 받기'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  safe: { flex: 1, backgroundColor: color.bgPage },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8, gap: 24 },
  heading: { gap: 8 },
  title: { color: color.textPrimary },
  muted: { color: color.textSecondary },
  boxes: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    borderWidth: stroke.outline,
    backgroundColor: color.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { color: color.textPrimary },
  // 보이지 않는 입력란이 여섯 칸 전체를 덮는다. 칸을 누르면 여기에 초점이 간다.
  hiddenInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.01, color: 'transparent' },
  error: { color: color.debtFg },
  ok: { color: color.okFg },
}));
