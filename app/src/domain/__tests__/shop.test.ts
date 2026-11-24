import { bankStage, canBuy, defaultItem, itemOf, ITEMS, lockLabel, nextBank, ownedCodes, resolveLook, SLOTS } from '../shop';

describe('상점 물건 목록', () => {
  it('칸마다 기본 물건이 정확히 하나 있다', () => {
    for (const slot of SLOTS) {
      expect(ITEMS.filter((i) => i.slot === slot && i.price === 0)).toHaveLength(1);
    }
  });

  it('물건 코드는 겹치지 않는다', () => {
    expect(new Set(ITEMS.map((i) => i.code)).size).toBe(ITEMS.length);
  });

  it('도장 글자는 도장 안에 들어가도록 3자 이하다', () => {
    for (const item of ITEMS.filter((i) => i.slot === 'stampWord')) expect(item.value.length).toBeLessThanOrEqual(3);
  });
});

describe('사기 (TC-063)', () => {
  const owned = ownedCodes(['ink-blue']);

  it('잔고가 값 이상이면 살 수 있다', () => {
    expect(canBuy('ink-green', 1500, owned)).toEqual({ ok: true });
  });

  it('모자라면 얼마가 모자란지 알려준다', () => {
    expect(canBuy('ink-gold', 1000, owned)).toEqual({ ok: false, reason: 'short', short: 3000 });
  });

  it('이미 가진 물건과 기본 물건은 다시 살 수 없다', () => {
    expect(canBuy('ink-blue', 9999, owned)).toMatchObject({ ok: false, reason: 'owned' });
    expect(canBuy('ink-brand', 9999, owned)).toMatchObject({ ok: false, reason: 'owned' });
  });

  it('모르는 코드는 살 수 없다', () => {
    expect(canBuy('ink-rainbow', 9999, owned)).toMatchObject({ ok: false, reason: 'unknown' });
  });
});

describe('착용 (TC-064)', () => {
  it('가진 물건을 착용하면 그 물건으로 보인다', () => {
    const look = resolveLook({ stampInk: 'ink-blue' }, ownedCodes(['ink-blue']));
    expect(look.stampInk.code).toBe('ink-blue');
    expect(look.bubble.code).toBe(defaultItem('bubble').code);
  });

  it('가지지 않은 물건이나 다른 칸의 물건은 기본 물건으로 되돌린다', () => {
    const look = resolveLook({ stampInk: 'ink-gold', stampWord: 'ink-blue' }, ownedCodes(['ink-blue']));
    expect(look.stampInk.code).toBe('ink-brand');
    expect(look.stampWord.code).toBe('word-jeokrip');
  });
});

describe('내 은행 (TC-070)', () => {
  it('처음에는 길가 좌판(0단계)이고 다음은 엽전 가판대', () => {
    const owned = ownedCodes([]);
    expect(bankStage(owned)).toBe(0);
    expect(nextBank(owned)?.code).toBe('bank-1');
  });

  it('순서대로만 산다. 1단계 없이 2단계는 잠겨 있다', () => {
    const owned = ownedCodes([]);
    expect(canBuy('bank-2', 99999, owned)).toMatchObject({ ok: false, reason: 'locked', lock: '엽전 가판대 다음에 열려요' });
    expect(canBuy('bank-1', 5000, owned)).toEqual({ ok: true });
  });

  it('가진 은행 중 가장 높은 단계가 지금 단계', () => {
    expect(bankStage(ownedCodes(['bank-1', 'bank-2']))).toBe(2);
    // bank-4는 처음부터 본점이라 5단계. 읍내 금고(bank-vault)가 4단계로 새로 들어왔다
    expect(bankStage(ownedCodes(['bank-1', 'bank-2', 'bank-3', 'bank-4']))).toBe(5);
    expect(nextBank(ownedCodes(['bank-1', 'bank-2', 'bank-3']))?.code).toBe('bank-vault');
    expect(nextBank(ownedCodes(['bank-1', 'bank-2', 'bank-3', 'bank-vault', 'bank-4']))?.code).toBe('bank-central');
    expect(nextBank(ownedCodes(['bank-1', 'bank-2', 'bank-3', 'bank-vault', 'bank-4', 'bank-central']))).toBeNull();
  });
  it('조건을 못 채운 은행은 못 연다', () => {
    expect(canBuy('bank-1', 99999, ownedCodes([]), false)).toEqual({ ok: false, reason: 'condition' });
  });

  it('은행 단계가 모자라면 옷이 잠겨 있다', () => {
    expect(lockLabel(itemOf('head-gat')!, ownedCodes(['bank-1']))).toBe('동네 창구를 열면');
    expect(lockLabel(itemOf('head-gat')!, ownedCodes(['bank-1', 'bank-2']))).toBeNull();
    expect(canBuy('body-banker', 99999, ownedCodes([]))).toMatchObject({ ok: false, reason: 'locked' });
  });
});

describe('홈 배경과 도장 모양 (TC-064)', () => {
  it('기본은 엽전 무늬와 동그라미', () => {
    const look = resolveLook({}, ownedCodes([]));
    expect(look.background.code).toBe('bg-coins');
    expect(look.stampShape.code).toBe('shape-circle');
  });

  it('구름 무늬는 은행 1단계, 별 도장은 2단계, 밤하늘은 3단계부터', () => {
    expect(lockLabel(itemOf('bg-clouds')!, ownedCodes([]))).toBe('엽전 가판대를 열면');
    expect(lockLabel(itemOf('shape-star')!, ownedCodes(['bank-1']))).toBe('동네 창구를 열면');
    expect(lockLabel(itemOf('bg-night')!, ownedCodes(['bank-1', 'bank-2', 'bank-3']))).toBeNull();
  });
});
