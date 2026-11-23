import type { DateString } from './dates';
import type { Repayment } from './records';

/**
 * 냥 잔고와 연속 기록. 따로 저장하지 않고 상환 기록과 구매 기록에서 매번 계산한다. (FR-060~062)
 * - 기한 안에 상환하면 원금의 10%를 번다. 하루치 이자만큼이다.
 * - 기한 안 상환이 5번 이어질 때마다 1,000냥을 더 번다.
 * - 연체된 할 일을 상환하거나 탕감하면 그 이자만큼 잔고에서 빠지고 연속 기록이 끊긴다.
 *   이자로 빠질 때 잔고는 0 아래로 내려가지 않는다. 산 물건도 그대로 둔다.
 */

export const REWARD_RATE_DIVISOR = 10;
export const STREAK_STEP = 5;
export const STREAK_BONUS = 1000;

export type Purchase = {
  id: string;
  itemCode: string;
  price: number;
  /** 산 날(기기 현지 날짜) */
  purchasedOn: DateString;
};

/** 기한 안에 상환했는가. 탕감이나 연체 상환은 아니다. */
export function isOnTime(r: Pick<Repayment, 'kind' | 'overdueDays'>): boolean {
  return r.kind === 'repaid' && r.overdueDays === 0;
}

/** 기한 안 상환 한 번에 버는 냥 */
export function rewardFor(principal: number): number {
  return Math.floor(principal / REWARD_RATE_DIVISOR);
}

export type LedgerKind = 'reward' | 'bonus' | 'interest' | 'purchase';

export type LedgerEntry = {
  kind: LedgerKind;
  date: DateString;
  /** 잔고에 더하는 값. 빠지는 것은 음수 */
  amount: number;
  /** 0 바닥에 걸려 실제로 빠진 값과 다를 때의 실제 변화량 */
  applied: number;
  refId: string;
};

export type Wallet = {
  balance: number;
  /** 지금 이어지고 있는 기한 안 상환 횟수 */
  streak: number;
  /** 다음 보너스까지 남은 기한 안 상환 횟수 */
  toNextBonus: number;
  earned: number;
  spent: number;
  ledger: LedgerEntry[];
};

// 같은 날에는 번 것 → 이자 → 산 것 순서로 계산한다. 하루 안의 순서가 결과를 바꾸지 않게 하려는 것이다.
const ORDER = { repayment: 0, purchase: 1 } as const;

type Item =
  | { type: 'repayment'; date: DateString; r: Repayment }
  | { type: 'purchase'; date: DateString; p: Purchase };

export function walletOf(repayments: Repayment[], purchases: Purchase[]): Wallet {
  const items: Item[] = [
    ...repayments.map((r) => ({ type: 'repayment' as const, date: r.settledOn, r })),
    ...purchases.map((p) => ({ type: 'purchase' as const, date: p.purchasedOn, p })),
  ].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.type !== b.type) return ORDER[a.type] - ORDER[b.type];
    const ka = a.type === 'repayment' ? (isOnTime(a.r) ? 0 : 1) : 2;
    const kb = b.type === 'repayment' ? (isOnTime(b.r) ? 0 : 1) : 2;
    if (ka !== kb) return ka - kb;
    const ia = a.type === 'repayment' ? a.r.id : a.p.id;
    const ib = b.type === 'repayment' ? b.r.id : b.p.id;
    return ia.localeCompare(ib);
  });

  let balance = 0;
  let streak = 0;
  let earned = 0;
  let spent = 0;
  const ledger: LedgerEntry[] = [];
  const push = (kind: LedgerKind, date: DateString, amount: number, applied: number, refId: string) => {
    balance += applied;
    ledger.push({ kind, date, amount, applied, refId });
  };

  for (const item of items) {
    if (item.type === 'purchase') {
      spent += item.p.price;
      push('purchase', item.date, -item.p.price, -item.p.price, item.p.id);
      continue;
    }
    const r = item.r;
    if (isOnTime(r)) {
      const reward = rewardFor(r.principal);
      earned += reward;
      push('reward', item.date, reward, reward, r.id);
      streak += 1;
      if (streak % STREAK_STEP === 0) {
        earned += STREAK_BONUS;
        push('bonus', item.date, STREAK_BONUS, STREAK_BONUS, r.id);
      }
    } else {
      streak = 0;
      if (r.interest > 0) push('interest', item.date, -r.interest, -Math.min(r.interest, Math.max(balance, 0)), r.id);
    }
  }

  return {
    balance: Math.max(balance, 0),
    streak,
    toNextBonus: STREAK_STEP - (streak % STREAK_STEP),
    earned,
    spent,
    ledger,
  };
}

/** 이 상환으로 잔고가 어떻게 바뀌는지. 상환 직후 알림 띠 문구에 쓴다. */
export function repayEffect(principal: number, overdueDays: number, interest: number, streakBefore: number): { gained: number; bonus: boolean; lost: number } {
  if (overdueDays === 0) {
    const bonus = (streakBefore + 1) % STREAK_STEP === 0;
    return { gained: rewardFor(principal) + (bonus ? STREAK_BONUS : 0), bonus, lost: 0 };
  }
  return { gained: 0, bonus: false, lost: interest };
}
