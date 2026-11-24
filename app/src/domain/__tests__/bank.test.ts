import { bankOf, BANKS, nameplatesUpTo, perksOf, resolveNameplate, stageOn } from '../bank';
import { conditionProgress, daysWithoutOverdue, debtFreeDays, earned } from '../bankConditions';
import type { Repayment } from '../records';
import { accountOf, completionPreview, type AccountInput, type StakedTodo } from '../savings';

const T0 = '2026-11-01';
const todo = (id: string, over: Partial<StakedTodo> = {}): StakedTodo => ({
  id, title: id, importance: 3, dueDate: '2026-11-05', status: 'repaid', createdOn: T0, groupId: null, ...over,
});
const repaid = (id: string, over: Partial<Repayment> = {}): Repayment => ({
  id: `r-${id}`, todoId: id, kind: 'repaid', title: id, principal: 3000, interest: 0, overdueDays: 0, settledOn: '2026-11-04', ...over,
});
const input = (over: Partial<AccountInput> = {}): AccountInput => ({
  signupDate: T0, todos: [], repayments: [], purchases: [], extensions: [], bankruptcies: [], payouts: [], verified: new Set(), today: '2026-11-20', ...over,
});
const buy = (code: string, on: string, price = 0) => ({ id: code, itemCode: code, price, purchasedOn: on });

describe('은행 7단계 (FR-110)', () => {
  it('일곱 단계, 본점은 처음부터 쓰던 bank-4 코드', () => {
    expect(BANKS.map((b) => b.name)).toEqual(['길가 좌판', '엽전 가판대', '동네 창구', '시장 지점', '읍내 금고', '시간은행 본점', '중앙은행']);
    expect(bankOf(5).code).toBe('bank-4');
    expect(bankOf(4).code).toBe('bank-vault');
  });
  it('그날까지 연 가장 높은 단계', () => {
    const ps = [buy('bank-1', '2026-11-03'), buy('bank-2', '2026-11-10')];
    expect(stageOn(ps, '2026-11-02')).toBe(0);
    expect(stageOn(ps, '2026-11-03')).toBe(1);
    expect(stageOn(ps, '2026-11-20')).toBe(2);
  });
});

describe('은행 혜택 (FR-111)', () => {
  it('단계마다 쌓인다', () => {
    expect(perksOf(0)).toMatchObject({ maxGroups: 3, maxMembers: 10, notifyTimes: 1, streakBonus: 1000, savingsBoost: 0, creditWeeks: 5 });
    expect(perksOf(2)).toMatchObject({ maxGroups: 4, maxMembers: 10, notifyTimes: 2, creditWeeks: 13 });
    expect(perksOf(4)).toMatchObject({ maxGroups: 5, maxMembers: 15, streakBonus: 1500, savingsBoost: 0.05 });
    expect(perksOf(5)).toMatchObject({ savingsBoost: 0.1, potBoost: 0.1, creditWeeks: 52 });
    expect(perksOf(6)).toMatchObject({ maxGroups: 7, maxMembers: 20 });
  });
  it('적금 우대는 은행을 연 날 뒤에 끝낸 적금에만 붙는다', () => {
    const a = accountOf(input({
      todos: [todo('a'), todo('b')],
      repayments: [repaid('a', { settledOn: '2026-11-04' }), repaid('b', { settledOn: '2026-11-12' })],
      purchases: [buy('bank-vault', '2026-11-10')],
    }));
    const boosts = a.ledger.filter((e) => e.kind === 'boost');
    expect(boosts).toEqual([{ kind: 'boost', date: '2026-11-12', amount: 150, refId: 'r-b' }]);
    expect(a.bankStage).toBe(4);
  });
  it('읍내 금고부터 연속 보너스 1,500냥', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const base = { todos: ids.map((id) => todo(id)), repayments: ids.map((id, i) => repaid(id, { settledOn: `2026-11-0${i + 1}` })) };
    expect(accountOf(input(base)).ledger.find((e) => e.kind === 'bonus')?.amount).toBe(1000);
    expect(accountOf(input({ ...base, purchases: [buy('bank-vault', T0)] })).ledger.find((e) => e.kind === 'bonus')?.amount).toBe(1500);
  });
  it('미리 보기에도 은행 단계가 들어간다', () => {
    expect(completionPreview(3000, 0, 0, 0, false, 0).gained).toBe(300);
    expect(completionPreview(3000, 0, 0, 0, false, 5).gained).toBe(600);
    expect(completionPreview(3000, 0, 0, 4, false, 4).gained).toBe(300 + 150 + 1500);
  });
});

describe('냥 말고의 조건 (FR-110)', () => {
  it('기한 안에 5건', () => {
    const ids = ['a', 'b', 'c'];
    const i = input({ todos: ids.map((id) => todo(id)), repayments: ids.map((id) => repaid(id)) });
    expect(conditionProgress('onTime', 5, i, accountOf(i))).toMatchObject({ current: 3, done: false, text: '기한 안에 끝내기 3/5건' });
  });
  it('7일 연체 없이: 늦게 끝낸 날부터 세고, 지금 연체 중이면 0', () => {
    const late = input({ todos: [todo('a')], repayments: [repaid('a', { overdueDays: 2, settledOn: '2026-11-16' })] });
    expect(daysWithoutOverdue(late, 7)).toBe(4);
    const open = input({ todos: [todo('a', { status: 'open', dueDate: '2026-11-18' })] });
    expect(daysWithoutOverdue(open, 7)).toBe(0);
    expect(daysWithoutOverdue(input(), 7)).toBe(7);
  });
  it('인증 통과 10번', () => {
    const i = input({ verified: new Set(['x', 'y']) });
    expect(conditionProgress('proofs', 10, i, accountOf(i)).text).toBe('인증 통과 2/10번');
  });
  it('최근 30일 동안 번 냥: 원금과 지원금은 빼고 이자만', () => {
    const i = input({ todos: [todo('a')], repayments: [repaid('a')] });
    expect(earned(accountOf(i))).toBe(300);
  });
  it('빚 없이 30일: 빚진 날이 있으면 그 다음 날부터', () => {
    // 11-10에 12,000냥을 써서 빚(−2,000), 11-15에 금고 배당 5,000냥으로 다시 플러스 → 11-15~11-20 엿새
    const i = input({ signupDate: '2026-10-01', purchases: [buy('bg-night', '2026-11-10', 12000)], payouts: [{ id: 'p', amount: 5000, on: '2026-11-15' }] });
    expect(debtFreeDays(i, accountOf(i), 30)).toBe(6);
    expect(debtFreeDays(input({ signupDate: '2026-11-15' }), accountOf(input({ signupDate: '2026-11-15' })), 30)).toBe(6);
  });
  it('빚이 있으면 10만 냥 조건은 못 채운다', () => {
    const i = input();
    const a = { ...accountOf(i), state: 'debt' as const };
    expect(conditionProgress('earnNoDebt', 100000, i, a)).toMatchObject({ done: false, text: '빚을 먼저 갚아야 해요' });
  });
});

describe('이름표 (FR-113)', () => {
  it('연 은행까지의 이름표만 고를 수 있다', () => {
    expect(nameplatesUpTo(2)).toEqual(['none', 'hanji', 'copper']);
    expect(resolveNameplate('platinum', 5)).toBe('platinum');
    expect(resolveNameplate('platinum', 4)).toBe('none');
    expect(resolveNameplate('rainbow', 6)).toBe('none');
  });
});
