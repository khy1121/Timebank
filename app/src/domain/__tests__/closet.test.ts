import { describeOutfit, outfitOf, sameOutfit, takeOff, trialState, wear, wearLine, withOutfit } from '../closet';
import { ownedCodes } from '../shop';

const NONE = { head: 'head-none', face: 'face-none', body: 'body-none' };

describe('입히기와 벗기기 (TC-071)', () => {
  it('소품은 자기 칸에 들어가고 다른 칸은 그대로다', () => {
    const o = wear(wear(NONE, 'head-beanie'), 'face-glasses');
    expect(o).toEqual({ head: 'head-beanie', face: 'face-glasses', body: 'body-none' });
  });

  it('같은 칸의 다른 소품을 고르면 바꿔 입는다', () => {
    expect(wear({ ...NONE, head: 'head-beanie' }, 'head-gat').head).toBe('head-gat');
  });

  it('입고 있는 소품을 다시 고르면 벗는다', () => {
    expect(wear({ ...NONE, head: 'head-beanie' }, 'head-beanie').head).toBe('head-none');
    expect(takeOff({ ...NONE, body: 'body-raincoat' }, 'body').body).toBe('body-none');
  });

  it('옷이 아닌 물건은 입히지 않는다', () => {
    expect(wear(NONE, 'ink-blue')).toBe(NONE);
  });

  it('저장된 착용 정보에서 가진 소품만 꺼낸다', () => {
    const owned = ownedCodes(['head-beanie']);
    expect(outfitOf({ head: 'head-beanie', face: 'face-glasses', stampInk: 'ink-red' }, owned)).toEqual({ ...NONE, head: 'head-beanie' });
  });

  it('저장할 때 다른 꾸미기 칸은 그대로 둔다', () => {
    expect(withOutfit({ stampInk: 'ink-blue' }, { ...NONE, head: 'head-gat' })).toEqual({ stampInk: 'ink-blue', head: 'head-gat', face: 'face-none', body: 'body-none' });
  });
});

describe('입어 보고 사기 (TC-072)', () => {
  it('안 산 소품을 입어 보면 합계와 살 수 있는지 알려준다', () => {
    const owned = ownedCodes([]);
    const s = trialState({ ...NONE, head: 'head-beanie', face: 'face-glasses' }, NONE, owned, 6000);
    expect(s.unowned.map((i) => i.code)).toEqual(['face-glasses', 'head-beanie']);
    expect(s.total).toBe(5000);
    expect(s.canBuyAll).toBe(true);
    expect(s.short).toBe(0);
  });

  it('잔고가 모자라면 얼마가 모자란지 알려준다', () => {
    const s = trialState({ ...NONE, body: 'body-raincoat' }, NONE, ownedCodes([]), 1000);
    expect(s).toMatchObject({ canBuyAll: false, short: 3000 });
  });

  it('잠긴 소품도 입어 볼 수는 있지만 살 수는 없다', () => {
    const s = trialState({ ...NONE, head: 'head-crown' }, NONE, ownedCodes([]), 99999);
    expect(s.canBuyAll).toBe(false);
    expect(s.locked[0]).toMatchObject({ lock: '시장 지점을 열면' });
  });

  it('다 가진 소품으로 바꿨으면 "이대로 입기"만 하면 된다', () => {
    const owned = ownedCodes(['head-beanie']);
    expect(trialState({ ...NONE, head: 'head-beanie' }, NONE, owned, 0).canSaveOnly).toBe(true);
    expect(trialState(NONE, NONE, owned, 0).canSaveOnly).toBe(false);
  });

  it('같은 모습인지 비교한다', () => {
    expect(sameOutfit(NONE, { ...NONE })).toBe(true);
  });
});

describe('마스코트 반응', () => {
  it('소품마다 한마디가 있다', () => {
    expect(wearLine('head-gat')).toContain('양반');
    expect(wearLine('unknown')).toBeTruthy();
  });

  it('입은 모습을 화면 읽기 프로그램용으로 설명한다', () => {
    expect(describeOutfit({ ...NONE, head: 'head-beanie', face: 'face-glasses' })).toBe('마스코트가 동그란 안경, 털모자를 입고 있어요');
    expect(describeOutfit(NONE)).toBe('마스코트가 아무것도 입지 않았어요');
  });
});
