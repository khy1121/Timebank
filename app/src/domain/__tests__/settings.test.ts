import { feedbackMailto, isDeleteConfirmed } from '../settings';

describe('계정 삭제 확인 (TC-005)', () => {
  it('"삭제"라고 정확히 입력해야 통과한다', () => {
    expect(isDeleteConfirmed('삭제')).toBe(true);
    expect(isDeleteConfirmed(' 삭제 ')).toBe(true);
  });

  it('다른 글자는 통과하지 않는다', () => {
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('삭')).toBe(false);
    expect(isDeleteConfirmed('삭제해')).toBe(false);
    expect(isDeleteConfirmed('delete')).toBe(false);
  });
});

describe('의견 보내기 (TC-051)', () => {
  it('받는 주소, 제목, 앱 버전, 기기 종류가 미리 채워진다', () => {
    const url = feedbackMailto({ address: 'help@example.com', version: '1.0.0', platform: 'android' });
    expect(url.startsWith('mailto:help@example.com?subject=')).toBe(true);
    const query = new URLSearchParams(url.split('?')[1]);
    expect(query.get('subject')).toBe('[할 일 이자] 의견');
    expect(query.get('body')).toContain('앱 버전: 1.0.0');
    expect(query.get('body')).toContain('기기: android');
  });
});
