/** 로그인 입력 규칙과 오류 문구. 화면과 서버 호출에서 분리해 두어 따로 검사할 수 있게 한다. (FR-001) */

export const CODE_LENGTH = 6;
export const RESEND_SECONDS = 60;

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** 형식만 본다. 실제로 받을 수 있는 주소인지는 인증 코드로 확인한다. */
export function isValidEmail(input: string): boolean {
  const email = normalizeEmail(input);
  if (email.length === 0 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** 숫자만 남기고 6자리로 자른다. 붙여넣기에 공백이나 하이픈이 섞여도 받는다. */
export function normalizeCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export function isCompleteCode(code: string): boolean {
  return code.length === CODE_LENGTH && /^\d+$/.test(code);
}

type AuthFailure = { code?: string; status?: number; message?: string } | null | undefined;

/** 인증 코드 발송 실패 문구 */
export function sendErrorMessage(error: AuthFailure): string {
  const code = error?.code ?? '';
  if (code.includes('rate_limit') || error?.status === 429) {
    return '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.';
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return '이메일 주소를 확인해 주세요.';
  }
  return '코드를 보내지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
}

/** 인증 코드 확인 실패 문구 */
export function verifyErrorMessage(error: AuthFailure): string {
  const code = error?.code ?? '';
  if (code === 'otp_expired') return '코드가 맞지 않거나 만료됐어요. 다시 받아 주세요.';
  if (code.includes('rate_limit') || error?.status === 429) {
    return '시도가 너무 잦아요. 잠시 후 다시 해 주세요.';
  }
  if (error?.status === 400 || error?.status === 401 || error?.status === 403) {
    return '코드가 맞지 않아요.';
  }
  return '확인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
}

/** 카카오 로그인 실패 문구 */
export function kakaoErrorMessage(error: AuthFailure): string {
  const message = error?.message ?? '';
  if (/provider is not enabled|Unsupported provider/i.test(message)) {
    return '카카오 로그인이 아직 서버에 설정되지 않았어요.';
  }
  return '카카오 로그인을 시작하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
}

export type AuthCallback = { accessToken?: string; refreshToken?: string; code?: string; error?: string };

/**
 * 로그인 뒤 돌아온 주소에서 로그인 정보를 꺼낸다.
 * 주소의 # 뒤(또는 ? 뒤)에 access_token, refresh_token 또는 오류 설명이 실려 온다.
 */
export function parseAuthCallback(url: string): AuthCallback {
  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const queryStart = url.indexOf('?');
  const query = queryStart >= 0 ? url.slice(queryStart + 1).split('#')[0] : '';
  const params = new Map<string, string>();
  for (const part of [query, hash]) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const key = decodeURIComponent(eq >= 0 ? pair.slice(0, eq) : pair);
      const value = eq >= 0 ? decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' ')) : '';
      params.set(key, value);
    }
  }
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    code: params.get('code'),
    error: params.get('error_description') ?? params.get('error'),
  };
}

/** "0:42" */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
