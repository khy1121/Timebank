import { hasFinalConsonant, josa } from '../korean';

describe('조사 고르기', () => {
  it('받침이 있으면 을, 없으면 를', () => {
    expect(josa('동네 창구', '을', '를')).toBe('동네 창구를');
    expect(josa('시장 지점', '을', '를')).toBe('시장 지점을');
    expect(josa('털모자', '을', '를')).toBe('털모자를');
    expect(josa('동그란 안경', '을', '를')).toBe('동그란 안경을');
  });

  it('끝의 문장부호는 무시한다', () => {
    expect(josa('끝!', '을', '를')).toBe('끝!을');
    expect(hasFinalConsonant('끝!')).toBe(true);
  });

  it('끝의 따옴표·괄호도 무시한다', () => {
    expect(josa('"최고"', '을', '를')).toBe('"최고"를');
    expect(josa('"남색"', '을', '를')).toBe('"남색"을');
  });

  it('한글이 아니면 받침이 없는 것으로 본다', () => {
    expect(hasFinalConsonant('SNS')).toBe(false);
  });
});
