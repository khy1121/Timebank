import { GUIDE_PAGES, repayMessage, shopMessage } from '../messages';

describe('상환 직후 문구 (TC-064)', () => {
  it('번 냥을 알려준다', () => {
    expect(repayMessage({ gained: 300, bonus: false, lost: 0 })).toBe('완납! 300냥 벌었어요');
  });

  it('보너스가 붙으면 보너스라고 알려준다', () => {
    expect(repayMessage({ gained: 1300, bonus: true, lost: 0 })).toBe('완납! 연속 기록 보너스까지 1,300냥 벌었어요');
  });

  it('연체 상환이면 빠진 이자를 알려준다', () => {
    expect(repayMessage({ gained: 0, bonus: false, lost: 630 })).toBe('완납했어요. 이자 630냥이 잔고에서 빠졌어요');
  });

  it('잔고가 0이라 빠진 것이 없으면 완납만 알려준다', () => {
    expect(repayMessage({ gained: 0, bonus: false, lost: 0 })).toBe('완납 처리했어요');
  });
});

describe('상점 한마디 (TC-061)', () => {
  it('연속 기록이 있으면 다음 보너스까지 남은 횟수를 알려준다', () => {
    expect(shopMessage(3, 2)).toBe('3번 연속 기한 안에 끝냈어요. 2번 더 하면 1,000냥 보너스예요.');
  });

  it('연속 기록이 없으면 버는 방법을 알려준다', () => {
    expect(shopMessage(0, 5)).toContain('원금의 10%');
  });
});

describe('첫 실행 안내 한마디 (FR-055)', () => {
  it('세 장 모두 마스코트 한마디가 있고, 2장 금액은 계산값과 같다', () => {
    expect(GUIDE_PAGES.every((p) => p.mascot.length > 0)).toBe(true);
    expect(GUIDE_PAGES[1].mascot).toContain('3,993냥');
  });
});
