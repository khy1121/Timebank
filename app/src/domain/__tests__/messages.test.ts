import { GUIDE_PAGES, repayMessage, shopMessage } from '../messages';
import { completionPreview } from '../savings';

describe('끝낸 직후 문구 (TC-064, 시간적금기획서 4.4)', () => {
  it('기한 안: 돌아온 냥과 번 냥', () => {
    expect(repayMessage(completionPreview(3000, 0, 0, 0, false), 3000)).toBe('적립! 3,300냥이 돌아왔어요 (+300)');
  });

  it('연속 기록 보너스', () => {
    expect(repayMessage(completionPreview(3000, 0, 0, 4, false), 3000)).toBe('적립! 연속 기록 보너스까지 4,300냥이 돌아왔어요');
  });

  it('늦게: 연체료를 빼고 돌아온 냥', () => {
    expect(repayMessage(completionPreview(3000, 3, 993, 0, false), 3000)).toBe('연체료 993냥을 빼고 2,007냥이 돌아왔어요');
  });

  it('원금보다 연체료가 크면 통장에서 빠진 냥', () => {
    expect(repayMessage(completionPreview(3000, 10, 4781, 0, false), 3000)).toBe('원금을 다 잃고 1,781냥이 통장에서 빠졌어요');
  });

  it('그룹 보증금: 기한 안이면 인정 대기, 늦으면 금고로', () => {
    expect(repayMessage(completionPreview(3000, 0, 0, 0, true), 3000)).toBe('적립 대기! 친구가 인정하면 3,450냥이 돌아와요');
    expect(repayMessage(completionPreview(3000, 1, 300, 0, true), 3000)).toBe('늦어서 보증금 3,000냥은 그룹 금고로 갔어요');
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
