/**
 * 설정 화면의 규칙: 계정 삭제 확인과 의견 보내기. (FR-004, FR-051)
 */

/** 계정을 삭제하려면 이 글자를 직접 입력해야 한다. */
export const DELETE_WORD = '삭제';

export function isDeleteConfirmed(input: string): boolean {
  return input.trim() === DELETE_WORD;
}

/** 의견·문의를 받는 메일. 공개용 주소라 코드에 둔다. 환경 변수로 바꿀 수 있다 */
export const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL || 'todobank.help@gmail.com';

export const DELETE_FAILED = '삭제하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';

type Feedback = { address: string; version: string; platform: string };

/** 메일 앱을 여는 주소. 받는 주소, 제목, 앱 버전과 기기 종류를 미리 채운다. */
export function feedbackMailto({ address, version, platform }: Feedback): string {
  const subject = '[todobank] 의견';
  const body = `\n\n---\n앱 버전: ${version}\n기기: ${platform}`;
  return `mailto:${address.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
