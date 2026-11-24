import { addDays, diffDays, type DateString } from './dates';
import { viewOf, type Todo } from './interest';
import type { Repayment } from './records';
import { rewardFor, STREAK_BONUS, STREAK_STEP, type Purchase } from './wallet';

/**
 * 시간 적금 장부. (시간적금기획서 TI-SAV-001)
 * 시작 지원금으로 받은 냥을 할 일마다 원금으로 걸고, 기한 안에 끝내면 이자를 붙여 돌려받는다.
 * 미루면 걸어 둔 원금이 깎이고(연체료), 다 깎이면 통장이 마이너스가 된다.
 * 따로 저장하지 않고 기록(할 일, 상환, 구매, 연장, 파산, 금고 배당)에서 매번 계산한다.
 */

export const SIGNUP_GRANT = 10_000;
export const REHAB_GRANT = 5_000;
/** 순자산이 이 값 이하가 되면 파산한다 */
export const BANKRUPT_AT = -10_000;
export const REHAB_DAYS = 7;
/** 30일 안에 두 번째로 파산하면 회생까지 더 기다린다 */
export const REHAB_DAYS_REPEAT = 14;
export const REPEAT_WINDOW_DAYS = 30;
/** 기한을 미룬 하루마다 원금의 5% */
export const EXTEND_RATE = 0.05;
/** 등록 후 이 시간 안에는 무엇이든 무료로 고치거나 지운다 */
export const FREE_EDIT_MS = 60 * 60 * 1000;

/** 원금을 건 할 일. 지워진 할 일은 넣지 않는다(원금을 돌려받은 것과 같다) */
export type StakedTodo = Todo & {
  /** 등록한 날(기기 현지 날짜) */
  createdOn: DateString;
  /** 그룹 보증금으로 걸었으면 그 그룹 ID */
  groupId: string | null;
};

export type Extension = { id: string; todoId: string; days: number; fee: number; on: DateString };
export type Bankruptcy = { id: string; on: DateString };
export type PotPayout = { id: string; amount: number; on: DateString };

export type AccountInput = {
  /** 가입한 날. 모르면 가장 이른 기록의 날 */
  signupDate: DateString | null;
  todos: StakedTodo[];
  repayments: Repayment[];
  purchases: Purchase[];
  extensions: Extension[];
  bankruptcies: Bankruptcy[];
  payouts: PotPayout[];
  /** 친구 인정을 받은 상환 ID */
  verified: ReadonlySet<string>;
  today: DateString;
};

export type EntryKind =
  | 'grant' // 시작 지원금
  | 'rehab' // 회생 지원금
  | 'stake' // 원금 걸기
  | 'return' // 기한 안 완료: 원금 돌려받기
  | 'interest' // 기한 안 완료: 이자
  | 'bonus' // 연속 기록 보너스
  | 'group' // 그룹 보너스(친구 인정)
  | 'late' // 늦은 완료: 원금 − 연체료
  | 'forgive' // 포기
  | 'forfeit' // 그룹 보증금을 못 돌려받음(금고로)
  | 'extend' // 기한 연장 수수료
  | 'purchase'
  | 'payout' // 금고 배당
  | 'bankrupt'; // 파산: 빚을 0으로

export type Entry = { kind: EntryKind; date: DateString; amount: number; refId: string };

export type AccountState = 'normal' | 'debt' | 'bankrupt';

export type Account = {
  /** 통장: 쓸 수 있는 냥. 원금을 걸면 마이너스가 될 수 있다 */
  cash: number;
  /** 걸어 둔 적금의 지금 가치: 원금 − 지금까지의 연체료, 인정을 기다리는 보증금 포함 */
  savings: number;
  /** 통장 + 적금. 빚과 파산은 이것으로 정한다 */
  netWorth: number;
  state: AccountState;
  /** 파산 중이면 회생하는 날 */
  rehabOn: DateString | null;
  /** 순자산이 파산 기준에 닿았다. 앱이 파산 기록을 남겨야 한다 */
  shouldBankrupt: boolean;
  streak: number;
  toNextBonus: number;
  ledger: Entry[];
};

/** 하루 안에서는 들어오는 것 → 나가는 것 → 파산 순서로 계산한다 */
const ORDER: Record<EntryKind, number> = {
  grant: 0,
  rehab: 1,
  payout: 2,
  return: 3,
  interest: 3,
  bonus: 3,
  group: 3,
  late: 4,
  forgive: 4,
  forfeit: 4,
  stake: 5,
  extend: 6,
  purchase: 7,
  bankrupt: 9,
};

/** 기한을 days일 미룰 때 내는 수수료 */
export function extendFee(principal: number, days: number): number {
  return Math.floor(principal * EXTEND_RATE) * Math.max(0, days);
}

/** 등록 후 1시간 안이면 무료로 고치거나 지울 수 있다 */
export function inFreeEdit(createdAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(createdAt) < FREE_EDIT_MS;
}

/** 기한 전에 포기하면 원금의 절반을 돌려받는다 */
export function earlyForgiveRefund(principal: number): number {
  return Math.ceil(principal / 2);
}

/** 그룹 보너스: 기한 안 이자의 50% */
export function groupBonus(principal: number): number {
  return Math.floor(rewardFor(principal) / 2);
}

/** 늦게 끝냈을 때 돌아오는 냥(마이너스면 그만큼 통장에서 빠진다) */
export function lateReturn(principal: number, lateFee: number): number {
  return principal - lateFee;
}

/** 파산 기록들에서 회생하는 날을 구한다 */
export function rehabDates(bankruptcies: Bankruptcy[]): { on: DateString; rehabOn: DateString }[] {
  const sorted = [...bankruptcies].sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : a.id.localeCompare(b.id)));
  return sorted.map((b, i) => {
    const prev = sorted[i - 1];
    const repeat = prev && diffDays(prev.on, b.on) <= REPEAT_WINDOW_DAYS;
    return { on: b.on, rehabOn: addDays(b.on, repeat ? REHAB_DAYS_REPEAT : REHAB_DAYS) };
  });
}

/** 상환 뒤 이 날까지는 친구 인정을 기다린다 */
const PROOF_WAIT_DAYS = 1;

export function accountOf(input: AccountInput): Account {
  const { todos, repayments, purchases, extensions, payouts, verified, today } = input;
  const periods = rehabDates(input.bankruptcies);
  const bankruptOn = (date: DateString) => periods.find((p) => p.on <= date && date < p.rehabOn) ?? null;

  // 할 일마다 가장 최근의 상환 기록
  const settledBy = new Map<string, Repayment>();
  for (const r of repayments) {
    const prev = settledBy.get(r.todoId);
    if (!prev || prev.settledOn <= r.settledOn) settledBy.set(r.todoId, r);
  }

  const entries: Entry[] = [];
  const add = (kind: EntryKind, date: DateString, amount: number, refId: string) => entries.push({ kind, date, amount, refId });

  const earliest = [
    ...todos.map((t) => t.createdOn),
    ...repayments.map((r) => r.settledOn),
    ...purchases.map((p) => p.purchasedOn),
  ].sort()[0];
  add('grant', input.signupDate ?? earliest ?? today, SIGNUP_GRANT, 'signup');

  for (const p of periods) if (p.rehabOn <= today) add('rehab', p.rehabOn, REHAB_GRANT, `rehab-${p.on}`);

  let pendingSavings = 0;
  let openSavings = 0;
  const onTime: { date: DateString; id: string }[] = [];
  const broken: { date: DateString; id: string }[] = [];

  for (const todo of todos) {
    const r = settledBy.get(todo.id);
    // 파산 중에 적은 할 일은 회생하는 날 원금이 걸린다
    const during = bankruptOn(todo.createdOn);
    const stakeOn = during ? during.rehabOn : todo.createdOn;
    if (stakeOn > today) continue; // 아직 회생 전: 원금이 걸리지 않았다
    const principal = r ? r.principal : viewOf(todo, today).principal;
    add('stake', stakeOn, -principal, todo.id);

    // 원금을 건 뒤 파산했으면 그 적금은 사라졌다
    const lostTo = periods.find((p) => stakeOn <= p.on && (!r || p.on < r.settledOn));
    if (lostTo) {
      if (r) broken.push({ date: r.settledOn, id: r.id });
      continue;
    }

    if (!r) {
      const v = viewOf(todo, today);
      openSavings += principal - v.interest;
      continue;
    }

    const isGroup = todo.groupId !== null;
    if (r.kind === 'repaid' && r.overdueDays === 0) {
      onTime.push({ date: r.settledOn, id: r.id });
      if (isGroup && !verified.has(r.id)) {
        if (diffDays(r.settledOn, today) <= PROOF_WAIT_DAYS) pendingSavings += principal;
        else add('forfeit', r.settledOn, 0, r.id);
        continue;
      }
      add('return', r.settledOn, principal, r.id);
      add('interest', r.settledOn, rewardFor(principal), r.id);
      if (isGroup) add('group', r.settledOn, groupBonus(principal), r.id);
    } else if (r.kind === 'repaid') {
      broken.push({ date: r.settledOn, id: r.id });
      if (isGroup) add('forfeit', r.settledOn, 0, r.id);
      else add('late', r.settledOn, lateReturn(principal, r.interest), r.id);
    } else {
      broken.push({ date: r.settledOn, id: r.id });
      // 기한 전 포기는 원금의 절반을 돌려받고, 연체 뒤 포기는 원금과 연체료를 모두 잃는다
      add('forgive', r.settledOn, r.overdueDays === 0 ? earlyForgiveRefund(principal) : -r.interest, r.id);
    }
  }

  for (const e of extensions) add('extend', e.on, -e.fee, e.id);
  for (const p of purchases) add('purchase', p.purchasedOn, -p.price, p.id);
  for (const p of payouts) add('payout', p.on, p.amount, p.id);

  // 연속 기록: 기한 안 완료가 이어지는 횟수. 늦거나 포기하면 끊긴다
  const streakEvents = [
    ...onTime.map((e) => ({ ...e, ok: true })),
    ...broken.map((e) => ({ ...e, ok: false })),
  ].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.ok === b.ok ? a.id.localeCompare(b.id) : a.ok ? -1 : 1));
  let streak = 0;
  for (const e of streakEvents) {
    if (!e.ok) {
      streak = 0;
      continue;
    }
    streak += 1;
    if (streak % STREAK_STEP === 0) add('bonus', e.date, STREAK_BONUS, e.id);
  }

  // 파산: 그날까지의 통장을 0으로 만든다
  const sorted = () =>
    entries.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : ORDER[a.kind] !== ORDER[b.kind] ? ORDER[a.kind] - ORDER[b.kind] : a.refId.localeCompare(b.refId)));
  for (const p of periods) {
    sorted();
    // 앞선 파산 기록도 포함해 그날까지 쌓인 통장을 구한다
    const before = entries.filter((e) => e.date <= p.on).reduce((s, e) => s + e.amount, 0);
    add('bankrupt', p.on, -before, `bankrupt-${p.on}`);
  }
  sorted();

  const cash = entries.reduce((s, e) => s + e.amount, 0);
  const current = bankruptOn(today);
  const savings = openSavings + pendingSavings;
  const netWorth = cash + savings;
  const state: AccountState = current ? 'bankrupt' : netWorth < 0 ? 'debt' : 'normal';
  return {
    cash,
    savings,
    netWorth,
    state,
    rehabOn: current ? current.rehabOn : null,
    shouldBankrupt: !current && netWorth <= BANKRUPT_AT,
    streak,
    toNextBonus: STREAK_STEP - (streak % STREAK_STEP),
    ledger: entries,
  };
}

/** 상점에서 살 수 있는가: 통장에 산 값이 있고, 빚이 없고, 파산 중이 아니다 */
export function canBuy(account: Pick<Account, 'cash' | 'netWorth' | 'state'>, price: number): boolean {
  return account.state === 'normal' && account.cash >= price && account.netWorth >= 0;
}

export type SettlementStamp = 'saved' | 'late' | 'forgive' | 'forfeit' | 'pending';

export type Settlement = {
  stamp: SettlementStamp;
  /** 이 기록으로 번 냥(+) 또는 잃은 냥(−). 원금을 건 것 자체는 빼고 본다 */
  amount: number;
  /** 친구 인정을 받아 그룹 보너스를 받았다 */
  verified: boolean;
};

/**
 * 상환 내역 한 줄의 도장과 손익. (시간적금기획서 12절)
 * - 적립: 기한 안에 끝냄. + 이자(+ 그룹 보너스)
 * - 연체: 늦게 끝냄. − 연체료
 * - 포기: 기한 전이면 − 원금의 절반, 연체 뒤면 − (원금 + 연체료)
 * - 몰수: 그룹 보증금을 인정받지 못함. − 원금
 * - pending: 그룹 보증금이 친구 인정을 기다리는 중(상환 뒤 하루)
 */
export function settlementOf(r: Repayment, groupId: string | null, verified: ReadonlySet<string>, today: DateString): Settlement {
  const isVerified = verified.has(r.id);
  if (r.kind === 'forgiven') {
    const lost = r.overdueDays === 0 ? r.principal - earlyForgiveRefund(r.principal) : r.principal + r.interest;
    return { stamp: 'forgive', amount: -lost, verified: false };
  }
  if (r.overdueDays > 0) {
    return groupId ? { stamp: 'forfeit', amount: -r.principal, verified: false } : { stamp: 'late', amount: -r.interest, verified: false };
  }
  if (groupId && !isVerified) {
    return diffDays(r.settledOn, today) <= PROOF_WAIT_DAYS
      ? { stamp: 'pending', amount: 0, verified: false }
      : { stamp: 'forfeit', amount: -r.principal, verified: false };
  }
  return { stamp: 'saved', amount: rewardFor(r.principal) + (groupId ? groupBonus(r.principal) : 0), verified: !!groupId && isVerified };
}
