import type { Repayment } from '../records';
import {
  accountOf,
  BANKRUPT_AT,
  canBuy,
  extendFee,
  inFreeEdit,
  REHAB_GRANT,
  SIGNUP_GRANT,
  type AccountInput,
  type StakedTodo,
} from '../savings';

const T0 = '2026-11-01';

const todo = (over: Partial<StakedTodo> = {}): StakedTodo => ({
  id: 't1',
  title: '보고서',
  importance: 3,
  dueDate: '2026-11-05',
  status: 'open',
  createdOn: T0,
  groupId: null,
  ...over,
});

const repaid = (over: Partial<Repayment> = {}): Repayment => ({
  id: 'r1',
  todoId: 't1',
  kind: 'repaid',
  title: '보고서',
  principal: 3000,
  interest: 0,
  overdueDays: 0,
  settledOn: '2026-11-04',
  ...over,
});

const input = (over: Partial<AccountInput> = {}): AccountInput => ({
  signupDate: T0,
  todos: [],
  repayments: [],
  purchases: [],
  extensions: [],
  bankruptcies: [],
  payouts: [],
  verified: new Set(),
  today: '2026-11-04',
  ...over,
});

describe('시작 지원금과 원금 걸기 (TI-SAV 4.1~4.2)', () => {
  it('가입하면 통장에 10,000냥이 있다', () => {
    const a = accountOf(input());
    expect(a).toMatchObject({ cash: SIGNUP_GRANT, savings: 0, netWorth: SIGNUP_GRANT, state: 'normal' });
  });

  it('할 일을 등록하면 원금이 통장에서 적금으로 옮겨진다', () => {
    const a = accountOf(input({ todos: [todo()] }));
    expect(a).toMatchObject({ cash: 7000, savings: 3000, netWorth: 10000 });
  });

  it('통장이 모자라도 등록되고, 걸어 둔 원금은 빚으로 치지 않는다', () => {
    const todos = [1, 2, 3, 4].map((i) => todo({ id: `t${i}`, importance: 3 }));
    const a = accountOf(input({ todos }));
    expect(a.cash).toBe(-2000);
    expect(a.netWorth).toBe(10000);
    expect(a.state).toBe('normal');
  });
});

describe('완료 (TI-SAV 4.4)', () => {
  it('기한 안에 끝내면 원금과 이자 10%를 돌려받는다', () => {
    const a = accountOf(input({ todos: [todo({ status: 'repaid' })], repayments: [repaid()] }));
    expect(a.cash).toBe(10300);
  });

  it('3일 늦게 끝내면 원금에서 연체료 993냥을 뺀 2,007냥만 돌아온다', () => {
    const a = accountOf(
      input({ todos: [todo({ status: 'repaid' })], repayments: [repaid({ overdueDays: 3, interest: 993, settledOn: '2026-11-08' })], today: '2026-11-08' }),
    );
    expect(a.cash).toBe(9007);
  });

  it('연체료가 원금보다 크면 모자란 만큼 통장에서 빠진다', () => {
    const a = accountOf(
      input({ todos: [todo({ status: 'repaid' })], repayments: [repaid({ overdueDays: 8, interest: 3430, settledOn: '2026-11-13' })], today: '2026-11-13' }),
    );
    expect(a.cash).toBe(10000 - 3430);
  });

  it('끝내지 않은 연체 할 일은 적금 가치가 연체료만큼 줄어든다', () => {
    const a = accountOf(input({ todos: [todo()], today: '2026-11-08' }));
    expect(a.savings).toBe(2007);
    expect(a.netWorth).toBe(9007);
  });
});

describe('포기 (TI-SAV 4.5)', () => {
  it('기한 전에 포기하면 원금의 절반을 돌려받는다', () => {
    const a = accountOf(input({ todos: [todo({ status: 'forgiven' })], repayments: [repaid({ kind: 'forgiven' })] }));
    expect(a.cash).toBe(8500);
  });

  it('연체 뒤 포기하면 원금과 연체료를 모두 잃는다', () => {
    const a = accountOf(
      input({
        todos: [todo({ status: 'forgiven' })],
        repayments: [repaid({ kind: 'forgiven', overdueDays: 3, interest: 993, settledOn: '2026-11-08' })],
        today: '2026-11-08',
      }),
    );
    expect(a.cash).toBe(10000 - 3000 - 993);
  });
});

describe('기한 연장 (TI-SAV 4.3)', () => {
  it('미룬 하루마다 원금의 5%', () => {
    expect(extendFee(3000, 3)).toBe(450);
    expect(extendFee(1000, 1)).toBe(50);
    expect(extendFee(3000, 0)).toBe(0);
  });

  it('연장 수수료는 통장에서 빠진다', () => {
    const a = accountOf(input({ todos: [todo()], extensions: [{ id: 'e1', todoId: 't1', days: 3, fee: 450, on: '2026-11-03' }] }));
    expect(a.cash).toBe(7000 - 450);
  });

  it('등록 후 1시간 안은 무료로 고친다', () => {
    const at = '2026-11-01T09:00:00.000Z';
    expect(inFreeEdit(at, new Date('2026-11-01T09:59:00.000Z'))).toBe(true);
    expect(inFreeEdit(at, new Date('2026-11-01T10:00:00.000Z'))).toBe(false);
  });
});

describe('그룹 보증금 (TI-SAV 4.7)', () => {
  const g = (over: Partial<StakedTodo> = {}) => todo({ groupId: 'g1', status: 'repaid', ...over });

  it('기한 안에 끝내고 친구가 인정하면 원금 + 이자 + 그룹 보너스', () => {
    const a = accountOf(input({ todos: [g()], repayments: [repaid()], verified: new Set(['r1']) }));
    expect(a.cash).toBe(10000 + 300 + 150);
  });

  it('인정을 기다리는 동안 보증금은 적금으로 남는다', () => {
    const a = accountOf(input({ todos: [g()], repayments: [repaid()], today: '2026-11-05' }));
    expect(a).toMatchObject({ cash: 7000, savings: 3000 });
  });

  it('인정을 못 받으면 보증금을 돌려받지 못한다', () => {
    const a = accountOf(input({ todos: [g()], repayments: [repaid()], today: '2026-11-06' }));
    expect(a).toMatchObject({ cash: 7000, savings: 0, netWorth: 7000 });
  });

  it('늦게 끝낸 보증금은 금고로 간다', () => {
    const a = accountOf(
      input({
        todos: [g()],
        repayments: [repaid({ overdueDays: 1, interest: 300, settledOn: '2026-11-06' })],
        verified: new Set(['r1']),
        today: '2026-11-06',
      }),
    );
    expect(a.cash).toBe(7000);
  });

  it('금고 배당은 통장에 들어온다', () => {
    const a = accountOf(input({ payouts: [{ id: 'p1', amount: 1500, on: '2026-11-02' }] }));
    expect(a.cash).toBe(11500);
  });
});

describe('빚, 파산, 회생 (TI-SAV 4.6)', () => {
  // 원금 5,000냥짜리 둘을 12일 늦게 끝내면 연체료가 원금을 크게 넘는다
  const bigLate = (id: string) => ({
    t: todo({ id, importance: 5, status: 'repaid' }),
    r: repaid({ id: `r-${id}`, todoId: id, principal: 5000, overdueDays: 12, interest: 10692, settledOn: '2026-11-17' }),
  });
  const a1 = bigLate('a');
  const b1 = bigLate('b');
  const crashed = input({ todos: [a1.t, b1.t], repayments: [a1.r, b1.r], today: '2026-11-17' });

  it('순자산이 마이너스면 빚 상태이고 상점을 못 쓴다', () => {
    const a = accountOf(input({ todos: [a1.t], repayments: [a1.r], today: '2026-11-17' }));
    expect(a.netWorth).toBe(10000 - 10692);
    expect(a.state).toBe('debt');
    expect(canBuy(a, 100)).toBe(false);
  });

  it('순자산이 −10,000냥 이하가 되면 파산해야 한다', () => {
    const a = accountOf(crashed);
    expect(a.netWorth).toBeLessThanOrEqual(BANKRUPT_AT);
    expect(a.shouldBankrupt).toBe(true);
  });

  it('파산하면 빚이 0이 되고 7일 뒤 회생 지원금을 받는다', () => {
    const during = accountOf({ ...crashed, bankruptcies: [{ id: 'b1', on: '2026-11-17' }], today: '2026-11-20' });
    expect(during).toMatchObject({ cash: 0, state: 'bankrupt', rehabOn: '2026-11-24', shouldBankrupt: false });
    const after = accountOf({ ...crashed, bankruptcies: [{ id: 'b1', on: '2026-11-17' }], today: '2026-11-24' });
    expect(after).toMatchObject({ cash: REHAB_GRANT, state: 'normal' });
  });

  it('파산하면 걸어 둔 적금은 사라진다', () => {
    const open = todo({ id: 'open', importance: 2, createdOn: '2026-11-10', dueDate: '2026-11-30' });
    const a = accountOf({ ...crashed, todos: [...crashed.todos, open], bankruptcies: [{ id: 'b1', on: '2026-11-17' }], today: '2026-11-20' });
    expect(a.savings).toBe(0);
    expect(a.cash).toBe(0);
  });

  it('파산 중에 적은 할 일은 회생하는 날 원금이 걸린다', () => {
    const later = todo({ id: 'later', importance: 1, createdOn: '2026-11-19', dueDate: '2026-11-30' });
    const base = { ...crashed, todos: [...crashed.todos, later], bankruptcies: [{ id: 'b1', on: '2026-11-17' }] };
    expect(accountOf({ ...base, today: '2026-11-20' })).toMatchObject({ cash: 0, savings: 0 });
    expect(accountOf({ ...base, today: '2026-11-24' })).toMatchObject({ cash: REHAB_GRANT - 1000, savings: 1000 });
  });

  it('30일 안에 두 번째로 파산하면 회생까지 14일', () => {
    const a = accountOf(input({ bankruptcies: [{ id: 'b1', on: '2026-11-01' }, { id: 'b2', on: '2026-11-20' }], today: '2026-11-25' }));
    expect(a.rehabOn).toBe('2026-12-04');
  });
});

describe('연속 기록 보너스', () => {
  it('기한 안 완료 5번마다 1,000냥', () => {
    const todos = [1, 2, 3, 4, 5].map((i) => todo({ id: `t${i}`, importance: 1, status: 'repaid' }));
    const reps = todos.map((t, i) => repaid({ id: `r${i}`, todoId: t.id, principal: 1000, settledOn: `2026-11-0${i + 2}` }));
    const a = accountOf(input({ todos, repayments: reps, today: '2026-11-07' }));
    expect(a.streak).toBe(5);
    expect(a.cash).toBe(10000 + 5 * 100 + 1000);
  });
});

describe('상점', () => {
  it('통장에 값이 있고 빚이 없을 때만 산다', () => {
    expect(canBuy({ cash: 500, netWorth: 500, state: 'normal' }, 500)).toBe(true);
    expect(canBuy({ cash: 400, netWorth: 3400, state: 'normal' }, 500)).toBe(false);
    expect(canBuy({ cash: 900, netWorth: 900, state: 'bankrupt' }, 500)).toBe(false);
  });

  it('산 값은 통장에서 빠진다', () => {
    const a = accountOf(input({ purchases: [{ id: 'p1', itemCode: 'ink-blue', price: 700, purchasedOn: '2026-11-02' }] }));
    expect(a.cash).toBe(9300);
  });
});
