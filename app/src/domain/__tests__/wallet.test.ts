import type { Repayment } from '../records';
import { repayEffect, rewardFor, walletOf, type Purchase } from '../wallet';

let seq = 0;
const repaid = (settledOn: string, principal = 3000, overdueDays = 0, interest = 0): Repayment => ({
  id: `r${String(++seq).padStart(3, '0')}`,
  todoId: `t${seq}`,
  kind: 'repaid',
  title: '할 일',
  principal,
  interest,
  overdueDays,
  settledOn,
});
const forgiven = (settledOn: string, interest: number): Repayment => ({ ...repaid(settledOn, 3000, 2, interest), kind: 'forgiven' });
const bought = (purchasedOn: string, price: number): Purchase => ({ id: `p${++seq}`, itemCode: 'ink-blue', price, purchasedOn });

describe('기한 안 상환 보상 (TC-060)', () => {
  it('원금의 10%를 번다. 원금 3,000냥이면 300냥', () => {
    expect(rewardFor(3000)).toBe(300);
    expect(rewardFor(1000)).toBe(100);
  });

  it('기한 안에 상환한 만큼 잔고가 쌓인다', () => {
    const w = walletOf([repaid('2026-11-20'), repaid('2026-11-21', 5000)], []);
    expect(w.balance).toBe(800);
    expect(w.earned).toBe(800);
  });

  it('상환을 되돌려 기록이 사라지면 보상도 사라진다', () => {
    expect(walletOf([], []).balance).toBe(0);
  });
});

describe('연속 기록 (TC-061)', () => {
  it('기한 안 상환이 5번 이어지면 1,000냥을 더 받는다', () => {
    const five = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map((d) => repaid(d));
    const w = walletOf(five, []);
    expect(w.streak).toBe(5);
    expect(w.balance).toBe(5 * 300 + 1000);
    expect(w.toNextBonus).toBe(5);
  });

  it('연체 상환이나 탕감이 끼면 연속 기록이 끊긴다', () => {
    const w = walletOf([repaid('2026-11-01'), repaid('2026-11-02'), repaid('2026-11-03', 3000, 1, 300), repaid('2026-11-04')], []);
    expect(w.streak).toBe(1);
    expect(w.toNextBonus).toBe(4);
  });

  it('같은 날의 기록은 기한 안 상환을 먼저 센다', () => {
    const w = walletOf([repaid('2026-11-01', 3000, 2, 630), repaid('2026-11-01')], []);
    expect(w.streak).toBe(0);
  });
});

describe('이자로 빠지는 냥 (TC-062)', () => {
  it('연체 상환은 낸 이자만큼 잔고에서 빠진다', () => {
    const w = walletOf([repaid('2026-11-01', 5000), repaid('2026-11-02', 5000), repaid('2026-11-03', 1000, 1, 100)], []);
    expect(w.balance).toBe(1000 - 100);
  });

  it('이자가 잔고보다 커도 0 아래로 내려가지 않는다', () => {
    const w = walletOf([repaid('2026-11-01'), forgiven('2026-11-02', 2000)], []);
    expect(w.balance).toBe(0);
    expect(w.ledger.at(-1)).toMatchObject({ kind: 'interest', amount: -2000, applied: -300 });
  });

  it('바닥에 걸린 뒤에 번 냥은 그대로 쌓인다', () => {
    const w = walletOf([forgiven('2026-11-01', 5000), repaid('2026-11-02')], []);
    expect(w.balance).toBe(300);
  });
});

describe('구매 (TC-063)', () => {
  it('산 값만큼 잔고에서 빠진다', () => {
    const w = walletOf([repaid('2026-11-01', 5000), repaid('2026-11-02', 5000), repaid('2026-11-03', 5000)], [bought('2026-11-03', 1500)]);
    expect(w.balance).toBe(0);
    expect(w.spent).toBe(1500);
  });

  it('같은 날에는 번 것을 먼저 더하고 산 것을 뺀다', () => {
    const w = walletOf([repaid('2026-11-05', 5000)], [bought('2026-11-05', 500)]);
    expect(w.ledger.map((e) => e.kind)).toEqual(['reward', 'purchase']);
    expect(w.balance).toBe(0);
  });
});

describe('상환 직후 알림 띠 (TC-064)', () => {
  it('기한 안 상환은 보상을 알려준다', () => {
    expect(repayEffect(3000, 0, 0, 0)).toEqual({ gained: 300, bonus: false, lost: 0 });
  });

  it('다섯 번째 기한 안 상환이면 보너스까지 더해 알려준다', () => {
    expect(repayEffect(3000, 0, 0, 4)).toEqual({ gained: 1300, bonus: true, lost: 0 });
  });

  it('연체 상환은 빠지는 이자를 알려준다', () => {
    expect(repayEffect(3000, 2, 630, 3)).toEqual({ gained: 0, bonus: false, lost: 630 });
  });
});

describe('친구 인증 보너스 (TC-080)', () => {
  it('인증이 통과한 기한 안 상환은 보상의 50%를 더 받는다', () => {
    const a = repaid('2026-11-20');
    const b = repaid('2026-11-21');
    const w = walletOf([a, b], [], new Set([a.id]));
    expect(w.balance).toBe(300 + 150 + 300);
    expect(w.ledger.filter((e) => e.kind === 'proof')).toHaveLength(1);
  });

  it('연체 상환은 인증이 통과해도 보너스가 없고, 연속 기록은 그대로다', () => {
    const late = repaid('2026-11-20', 3000, 2, 630);
    const on = repaid('2026-11-21');
    const w = walletOf([late, on], [], new Set([late.id, on.id]));
    expect(w.ledger.filter((e) => e.kind === 'proof').map((e) => e.amount)).toEqual([150]);
    expect(w.streak).toBe(1);
  });
});
