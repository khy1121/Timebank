import {
  formatCountdown,
  isCompleteCode,
  isValidEmail,
  kakaoErrorMessage,
  normalizeCode,
  normalizeEmail,
  parseAuthCallback,
  sendErrorMessage,
  verifyErrorMessage,
} from '../auth';

describe('이메일 (TC-001)', () => {
  test('앞뒤 공백을 떼고 소문자로 맞춘다', () => {
    expect(normalizeEmail('  ABC@Example.COM ')).toBe('abc@example.com');
  });

  test('형식 검사', () => {
    expect(isValidEmail('abc@example.com')).toBe(true);
    expect(isValidEmail(' abc@example.com ')).toBe(true);
    expect(isValidEmail('a.b+c@sub.example.co.kr')).toBe(true);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('abc')).toBe(false);
    expect(isValidEmail('abc@')).toBe(false);
    expect(isValidEmail('abc@example')).toBe(false);
    expect(isValidEmail('abc @example.com')).toBe(false);
    expect(isValidEmail('a@b.c')).toBe(false);
  });
});

describe('인증 코드', () => {
  test('숫자만 남기고 6자리로 자른다', () => {
    expect(normalizeCode('482 913')).toBe('482913');
    expect(normalizeCode('482-913')).toBe('482913');
    expect(normalizeCode('4829137')).toBe('482913');
    expect(normalizeCode('abc')).toBe('');
  });

  test('6자리가 다 찼는지', () => {
    expect(isCompleteCode('482913')).toBe(true);
    expect(isCompleteCode('48291')).toBe(false);
    expect(isCompleteCode('')).toBe(false);
  });
});

describe('오류 문구', () => {
  test('발송 실패', () => {
    expect(sendErrorMessage({ code: 'over_email_send_rate_limit', status: 429 })).toContain('너무 잦아요');
    expect(sendErrorMessage({ code: 'email_address_invalid' })).toContain('이메일 주소');
    expect(sendErrorMessage({ message: 'Network request failed' })).toContain('보내지 못했어요');
    expect(sendErrorMessage(null)).toContain('보내지 못했어요');
  });

  test('확인 실패', () => {
    expect(verifyErrorMessage({ code: 'otp_expired', status: 403 })).toContain('만료');
    expect(verifyErrorMessage({ status: 400 })).toBe('코드가 맞지 않아요.');
    expect(verifyErrorMessage({ code: 'over_request_rate_limit', status: 429 })).toContain('너무 잦아요');
    expect(verifyErrorMessage({ message: 'Network request failed' })).toContain('확인하지 못했어요');
  });
});

describe('카카오 로그인', () => {
  test('돌아온 주소의 # 뒤에서 로그인 정보를 꺼낸다', () => {
    const r = parseAuthCallback('todointerest://auth-callback#access_token=aaa.bbb&refresh_token=ccc&token_type=bearer');
    expect(r.accessToken).toBe('aaa.bbb');
    expect(r.refreshToken).toBe('ccc');
    expect(r.error).toBeUndefined();
  });

  test('? 뒤의 code도 읽는다', () => {
    expect(parseAuthCallback('todointerest://auth-callback?code=xyz').code).toBe('xyz');
  });

  test('오류 설명을 읽는다', () => {
    const r = parseAuthCallback('http://localhost:8081/?error=access_denied&error_description=User+denied+access');
    expect(r.error).toBe('User denied access');
    expect(r.accessToken).toBeUndefined();
  });

  test('아무것도 없으면 빈 결과', () => {
    expect(parseAuthCallback('todointerest://auth-callback')).toEqual({});
  });

  test('오류 문구', () => {
    expect(kakaoErrorMessage({ message: 'Unsupported provider: provider is not enabled' })).toContain('설정되지 않았어요');
    expect(kakaoErrorMessage({ message: 'Network request failed' })).toContain('시작하지 못했어요');
  });
});

describe('다시 받기까지 남은 시간', () => {
  test('분:초', () => {
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(0.2)).toBe('0:01');
    expect(formatCountdown(-3)).toBe('0:00');
  });
});
