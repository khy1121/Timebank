import { bankOf, type ConditionKind } from './bank';
import { addDays, diffDays, type DateString } from './dates';
import { accountOf, type Account, type AccountInput } from './savings';
import { isOnTime } from './wallet';

/**
 * 은행을 여는 냥 말고의 조건 (FR-110, 상점기획서 11.2절). 기기에 있는 기록으로 판정한다.
 * 조건은 여는 순간에만 본다. 연 은행은 잃지 않는다.
 */

export type Progress = { current: number; target: number; done: boolean; text: string };

/** 번 냥: 이자, 연속 보너스, 그룹 보너스, 적금 우대, 금고 배당. 돌려받은 원금과 지원금은 뺀다 */
const EARN_KINDS = new Set(['interest', 'bonus', 'group', 'boost', 'payout']);

export function earned(account: Pick<Account, 'ledger'>, from?: DateString): number {
  return account.ledger.filter((e) => EARN_KINDS.has(e.kind) && e.amount > 0 && (!from || e.date >= from)).reduce((s, e) => s + e.amount, 0);
}

/** 그날 기준으로 다시 계산한 통장. 그날 뒤의 기록은 빼고 계산한다 */
export function accountAt(input: AccountInput, date: DateString): Account {
  return accountOf({
    ...input,
    todos: input.todos.filter((t) => t.createdOn <= date),
    repayments: input.repayments.filter((r) => r.settledOn <= date),
    purchases: input.purchases.filter((p) => p.purchasedOn <= date),
    extensions: input.extensions.filter((e) => e.on <= date),
    bankruptcies: input.bankruptcies.filter((b) => b.on <= date),
    payouts: input.payouts.filter((p) => p.on <= date),
    today: date,
  });
}

/** 오늘부터 거슬러 올라가며 빚도 파산도 없던 날 수(최대 max일). 가입 전은 세지 않는다 */
export function debtFreeDays(input: AccountInput, account: Account, max: number): number {
  if (account.state !== 'normal') return 0;
  const start = input.signupDate;
  let n = 1;
  while (n < max) {
    const d = addDays(input.today, -n);
    if (start && d < start) break;
    if (accountAt(input, d).state !== 'normal') break;
    n += 1;
  }
  return n;
}

/** 마지막으로 연체가 있던 날부터 지난 날 수(최대 max일). 지금 연체 중이면 0 */
export function daysWithoutOverdue(input: AccountInput, max: number): number {
  const settled = new Set(input.repayments.map((r) => r.todoId));
  if (input.todos.some((t) => !settled.has(t.id) && t.dueDate < input.today)) return 0;
  const lastLate = input.repayments.filter((r) => r.overdueDays > 0).map((r) => r.settledOn).sort().pop();
  const from = [lastLate, input.signupDate].filter((d): d is DateString => !!d).sort().pop();
  if (!from) return 0;
  return Math.max(0, Math.min(max, diffDays(from, input.today)));
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}냥`;

export function conditionProgress(kind: ConditionKind, target: number, input: AccountInput, account: Account): Progress {
  const make = (current: number, text: string, extra = true): Progress => ({ current: Math.min(current, target), target, done: current >= target && extra, text });
  switch (kind) {
    case 'none':
      return { current: 0, target: 0, done: true, text: '조건 없음' };
    case 'onTime': {
      const n = input.repayments.filter(isOnTime).length;
      return make(n, `기한 안에 끝내기 ${Math.min(n, target)}/${target}건`);
    }
    case 'noOverdue7': {
      const n = daysWithoutOverdue(input, target);
      return make(n, `연체 없이 ${n}/${target}일`);
    }
    case 'proofs': {
      const n = input.verified.size;
      return make(n, `인증 통과 ${Math.min(n, target)}/${target}번`);
    }
    case 'earn30': {
      const n = earned(account, addDays(input.today, -29));
      return make(n, `최근 30일 동안 ${won(Math.min(n, target))} / ${won(target)} 벌기`);
    }
    case 'debtFree30': {
      const n = debtFreeDays(input, account, target);
      return make(n, `빚 없이 ${n}/${target}일`);
    }
    case 'earnNoDebt': {
      const n = earned(account);
      const free = account.state === 'normal';
      return make(n, free ? `지금까지 ${won(Math.min(n, target))} / ${won(target)} 벌기` : '빚을 먼저 갚아야 해요', free);
    }
  }
}

export function bankProgress(stage: number, input: AccountInput, account: Account): Progress {
  const b = bankOf(stage);
  return conditionProgress(b.condition, b.target, input, account);
}
