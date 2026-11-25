import * as Sentry from '@sentry/react-native';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import {
  kakaoErrorMessage,
  kakaoFriendsErrorMessage,
  normalizeEmail,
  parseAuthCallback,
  sendErrorMessage,
  verifyErrorMessage,
} from '@/domain/auth';
import { DELETE_FAILED } from '@/domain/settings';
import { forgetPushToken } from '@/lib/push';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * 로그인 상태. (FR-001~003)
 * 카카오 로그인이 기본이고, 이메일 6자리 코드 로그인은 메일 서버를 연결한 뒤에 켠다.
 */

// 웹에서 로그인 창이 따로 열렸을 때, 돌아온 창을 닫고 결과를 원래 창에 넘긴다
WebBrowser.maybeCompleteAuthSession();

type Result = { ok: true } | { ok: false; message: string };

type Auth = {
  /** 저장된 로그인 상태를 읽는 중 */
  loading: boolean;
  session: Session | null;
  email: string | null;
  /** 코드를 보낸 주소. 인증 코드 화면에서 쓴다. 주소를 화면 경로에 싣지 않으려고 여기에 둔다. */
  pendingEmail: string | null;
  signInWithKakao: () => Promise<Result>;
  /**
   * 카카오 친구 목록 권한(friends)을 추가로 동의받고 카카오 토큰을 돌려준다. (FR-108)
   * 카카오로 로그인한 계정에서만 된다. 다른 카카오 계정으로 바뀌면 원래 로그인으로 되돌린다.
   */
  kakaoFriendsToken: () => Promise<{ ok: true; token: string } | { ok: false; message: string }>;
  requestCode: (email: string) => Promise<Result>;
  verifyCode: (code: string) => Promise<Result>;
  cancelPending: () => void;
  signOut: () => Promise<void>;
  /** 서버의 계정과 모든 데이터를 지운다. 되돌릴 수 없다. (FR-004) */
  deleteAccount: () => Promise<Result>;
};

const AuthContext = createContext<Auth | null>(null);

const NOT_CONFIGURED: Result = { ok: false, message: '서버 연결 정보가 없어요. .env 파일을 확인해 주세요.' };

/** 내가 올린 인증 사진 파일을 모두 지운다. 실패해도 계정 삭제는 계속한다 */
async function removeMyProofPhotos(userId: string | undefined) {
  if (!userId) return;
  const { data, error } = await supabase.from('proofs').select('photo_path').eq('user_id', userId);
  if (error) {
    console.warn('인증 사진 목록을 받지 못했어요', error.message);
    return;
  }
  const paths = (data ?? []).map((r: { photo_path: string }) => r.photo_path);
  if (paths.length === 0) return;
  const { error: removeError } = await supabase.storage.from('proofs').remove(paths);
  if (removeError) console.warn('인증 사진을 지우지 못했어요', removeError.message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch((e) => console.warn('로그인 상태를 읽지 못했어요', e))
      .finally(() => {
        if (active) setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) setPendingEmail(null);
      // 웹에서는 로그인 정보가 주소의 # 뒤에 실려 돌아온다. 읽은 뒤에는 주소창과 방문 기록에 남지 않게 지운다.
      if (next && Platform.OS === 'web' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 오류 기록에 누구의 오류인지 남긴다. 무작위 사용자 ID만 넘기고 이메일·닉네임은 넘기지 않는다 (NFR-010)
  const userId = session?.user.id ?? null;
  useEffect(() => {
    Sentry.setUser(userId ? { id: userId } : null);
  }, [userId]);

  const auth = useMemo<Auth>(
    () => ({
      loading,
      session,
      // 카카오 계정은 이메일이 없을 수 있어서 닉네임을 대신 보여준다
      email:
        session?.user.email ||
        (session?.user.user_metadata?.name as string | undefined) ||
        (session?.user.user_metadata?.user_name as string | undefined) ||
        null,
      pendingEmail,
      signInWithKakao: async () => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        if (Platform.OS === 'web') {
          // 웹: 현재 창이 카카오로 이동했다가 이 주소로 돌아온다
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: { redirectTo: window.location.origin },
          });
          return error ? { ok: false, message: kakaoErrorMessage(error) } : { ok: true };
        }
        // 기기: 앱 안 브라우저를 열고, 끝나면 앱 주소(todobank://auth-callback)로 돌아온다
        const redirectTo = Linking.createURL('auth-callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'kakao',
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error || !data.url) return { ok: false, message: kakaoErrorMessage(error) };
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') return { ok: false, message: '카카오 로그인을 취소했어요.' };
        const parsed = parseAuthCallback(result.url);
        if (parsed.error) return { ok: false, message: '카카오 로그인에 실패했어요. (' + parsed.error + ')' };
        if (parsed.accessToken && parsed.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: parsed.accessToken,
            refresh_token: parsed.refreshToken,
          });
          return sessionError ? { ok: false, message: kakaoErrorMessage(sessionError) } : { ok: true };
        }
        if (parsed.code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(parsed.code);
          return codeError ? { ok: false, message: kakaoErrorMessage(codeError) } : { ok: true };
        }
        return { ok: false, message: '카카오에서 로그인 정보를 받지 못했어요.' };
      },
      kakaoFriendsToken: async () => {
        if (!isSupabaseConfigured) return { ok: false, message: '서버 연결 정보가 없어요. .env 파일을 확인해 주세요.' };
        if (Platform.OS === 'web') return { ok: false, message: '카카오톡 친구 찾기는 휴대폰 앱에서만 돼요.' };
        const { data: current } = await supabase.auth.getSession();
        const before = current.session;
        if (!before) return { ok: false, message: '로그인이 필요해요.' };
        if (!before.user.identities?.some((i) => i.provider === 'kakao')) {
          return { ok: false, message: '카카오로 로그인한 계정에서만 카카오톡 친구를 찾을 수 있어요.' };
        }
        const redirectTo = Linking.createURL('auth-callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'kakao',
          options: { redirectTo, skipBrowserRedirect: true, scopes: 'friends' },
        });
        if (error || !data.url) return { ok: false, message: kakaoErrorMessage(error) };
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') return { ok: false, message: '카카오톡 친구 찾기를 취소했어요.' };
        const parsed = parseAuthCallback(result.url);
        if (parsed.error) return { ok: false, message: kakaoFriendsErrorMessage(parsed.error) };

        let after: Session | null = null;
        let token = parsed.providerToken ?? null;
        if (parsed.accessToken && parsed.refreshToken) {
          const r = await supabase.auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
          after = r.data.session;
        } else if (parsed.code) {
          const r = await supabase.auth.exchangeCodeForSession(parsed.code);
          after = r.data.session;
          token = token ?? r.data.session?.provider_token ?? null;
        }
        // 다른 카카오 계정으로 로그인됐으면 원래 계정으로 되돌린다
        if (after && after.user.id !== before.user.id) {
          await supabase.auth.setSession({ access_token: before.access_token, refresh_token: before.refresh_token });
          return { ok: false, message: '다른 카카오 계정으로 로그인돼서 원래 계정으로 되돌렸어요. 이 앱에 가입한 카카오 계정으로 해 주세요.' };
        }
        if (!token) return { ok: false, message: kakaoFriendsErrorMessage(null) };
        return { ok: true, token };
      },
      requestCode: async (input) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        const email = normalizeEmail(input);
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
        if (error) return { ok: false, message: sendErrorMessage(error) };
        setPendingEmail(email);
        return { ok: true };
      },
      verifyCode: async (code) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        if (!pendingEmail) return { ok: false, message: '이메일부터 다시 입력해 주세요.' };
        const { error } = await supabase.auth.verifyOtp({ email: pendingEmail, token: code, type: 'email' });
        if (error) return { ok: false, message: verifyErrorMessage(error) };
        return { ok: true };
      },
      cancelPending: () => setPendingEmail(null),
      signOut: async () => {
        // 이 기기로 다른 사람의 친구 알림이 오지 않게, 로그인이 살아 있을 때 토큰부터 지운다
        await forgetPushToken();
        const { error } = await supabase.auth.signOut();
        if (error) console.warn('로그아웃 요청이 실패했어요', error);
        setSession(null);
      },
      deleteAccount: async () => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        // 계정과 함께 인증 행은 지워지지만 저장소의 사진 파일은 남는다. 혼자 쓰던 그룹이면 지울 사람이 없으므로 먼저 지운다 (FR-004, NFR-009)
        await removeMyProofPhotos(session?.user.id);
        const { error } = await supabase.rpc('delete_account');
        if (error) {
          console.warn('계정을 삭제하지 못했어요', error);
          return { ok: false, message: DELETE_FAILED };
        }
        // 서버의 로그인 상태는 계정과 함께 사라졌다. 이 기기에 남은 것만 지운다.
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        return { ok: true };
      },
    }),
    [loading, session, pendingEmail],
  );

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider 안에서만 쓸 수 있어요');
  return auth;
}
