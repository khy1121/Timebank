import type { DateString } from './dates';

/**
 * 은행 7단계. (FR-110, FR-111, FR-113, 상점기획서 11절)
 * 물건 코드는 서버에 저장되므로 뜻을 바꾸지 않는다: bank-4는 처음부터 "시간은행 본점"이라 5단계로 옮기고,
 * 새로 생긴 읍내 금고(4단계)와 중앙은행(6단계)에 새 코드를 준다.
 * 혜택 수치는 제안값이다. 출시 뒤 은행을 여는 속도를 보고 고친다.
 */

export type BankStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ConditionKind = 'none' | 'onTime' | 'noOverdue7' | 'proofs' | 'earn30' | 'debtFree30' | 'earnNoDebt';

export type Nameplate = 'none' | 'hanji' | 'copper' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type BankDef = {
  stage: BankStage;
  code: string;
  name: string;
  price: number;
  condition: ConditionKind;
  /** 조건의 목표 수 (건, 일, 번, 냥) */
  target: number;
  nameplate: Nameplate;
  /** 이 단계에서 새로 생기는 혜택 (화면에 보여 줄 문구) */
  perks: string[];
  /** 아직 만들지 않은 혜택. "곧 추가"로 보여 준다 */
  soon: string[];
};

export const BANKS: BankDef[] = [
  { stage: 0, code: 'bank-0', name: '길가 좌판', price: 0, condition: 'none', target: 0, nameplate: 'none', perks: ['그룹 3개, 그룹원 10명', '알림 하루 한 번', '5번 연속 보너스 1,000냥'], soon: [] },
  { stage: 1, code: 'bank-1', name: '엽전 가판대', price: 5000, condition: 'onTime', target: 5, nameplate: 'hanji', perks: ['알림 하루 두 번', '기한 전날 알림', '한지 이름표'], soon: [] },
  { stage: 2, code: 'bank-2', name: '동네 창구', price: 12000, condition: 'noOverdue7', target: 7, nameplate: 'copper', perks: ['그룹 4개', '신용 그래프 3개월', '구리 이름표'], soon: ['마스코트 새 말투'] },
  { stage: 3, code: 'bank-3', name: '시장 지점', price: 25000, condition: 'proofs', target: 10, nameplate: 'silver', perks: ['그룹원 15명', '반복 할 일', '할 일 묶음', '은 이름표'], soon: [] },
  { stage: 4, code: 'bank-vault', name: '읍내 금고', price: 40000, condition: 'earn30', target: 20000, nameplate: 'gold', perks: ['그룹 5개', '5번 연속 보너스 1,500냥', '적금 우대 +5%', '금 이름표'], soon: ['요일 분석'] },
  { stage: 5, code: 'bank-4', name: '시간은행 본점', price: 60000, condition: 'debtFree30', target: 30, nameplate: 'platinum', perks: ['적금 우대 +10%', '내가 만든 그룹 금고 +10%', '신용 그래프 1년', '백금 이름표'], soon: [] },
  { stage: 6, code: 'bank-central', name: '중앙은행', price: 100000, condition: 'earnNoDebt', target: 100000, nameplate: 'diamond', perks: ['그룹 7개, 그룹원 20명', '다이아 이름표'], soon: ['월간 명세서'] },
];

export const BANK_NAMES = BANKS.map((b) => b.name);

export function bankOf(stage: number): BankDef {
  return BANKS[Math.max(0, Math.min(6, stage))];
}

export function bankByCode(code: string): BankDef | undefined {
  return BANKS.find((b) => b.code === code);
}

export type Perks = {
  maxGroups: number;
  /** 내가 만든 그룹의 인원 한도 */
  maxMembers: number;
  notifyTimes: 1 | 2;
  dueEveAlert: boolean;
  streakBonus: number;
  /** 기한 안에 끝낸 적금에 원금의 몇 %를 더 주는지 */
  savingsBoost: number;
  /** 내가 만든 그룹의 주간 금고에 더하는 비율 */
  potBoost: number;
  /** 내 신용 월간 그래프에 보이는 주 수 */
  creditWeeks: number;
};

/** 단계까지 쌓인 혜택 */
export function perksOf(stage: number): Perks {
  const s = Math.max(0, Math.min(6, stage));
  return {
    maxGroups: s >= 6 ? 7 : s >= 4 ? 5 : s >= 2 ? 4 : 3,
    maxMembers: s >= 6 ? 20 : s >= 3 ? 15 : 10,
    notifyTimes: s >= 1 ? 2 : 1,
    dueEveAlert: s >= 1,
    streakBonus: s >= 4 ? 1500 : 1000,
    savingsBoost: s >= 5 ? 0.1 : s >= 4 ? 0.05 : 0,
    potBoost: s >= 5 ? 0.1 : 0,
    creditWeeks: s >= 5 ? 52 : s >= 2 ? 13 : 5,
  };
}

/** 산 기록에서 그날까지 연 가장 높은 단계. 혜택은 은행을 연 날부터 붙는다 */
export function stageOn(purchases: { itemCode: string; purchasedOn: DateString }[], date: DateString): BankStage {
  let s = 0;
  for (const p of purchases) {
    const b = bankByCode(p.itemCode);
    if (b && p.purchasedOn <= date && b.stage > s) s = b.stage;
  }
  return s as BankStage;
}

// ---------------------------------------------------------------------------
// 이름표 (FR-113). 위로 갈수록 재료 서열(종이 < 구리 < 은 < 금 < 백금 < 다이아)을 따르고 꾸밈이 하나씩 더해진다
// ---------------------------------------------------------------------------

export const NAMEPLATES: Nameplate[] = ['none', 'hanji', 'copper', 'silver', 'gold', 'platinum', 'diamond'];

export const NAMEPLATE_LABEL: Record<Nameplate, string> = {
  none: '없음',
  hanji: '한지',
  copper: '구리',
  silver: '은',
  gold: '금',
  platinum: '백금',
  diamond: '다이아',
};

export function nameplateStage(n: Nameplate): BankStage {
  return NAMEPLATES.indexOf(n) as BankStage;
}

/** 서버 값을 이름표로. 모르는 값이면 없음 */
export function toNameplate(value: string | null | undefined): Nameplate {
  return (NAMEPLATES as string[]).includes(value ?? '') ? (value as Nameplate) : 'none';
}

/** 이름표 꾸밈: 위로 갈수록 하나씩 더해진다 (상점기획서 11.4절) */
export function nameplateDecor(n: Nameplate): { stamp: boolean; bold: boolean } {
  const s = nameplateStage(n);
  return { stamp: s >= 5, bold: s >= 6 };
}

/** 고른 이름표가 연 은행보다 높으면(또는 모르는 값이면) 없음으로 */
export function resolveNameplate(value: string | null | undefined, stage: number): Nameplate {
  const n = (NAMEPLATES as string[]).includes(value ?? '') ? (value as Nameplate) : 'none';
  return nameplateStage(n) <= stage ? n : 'none';
}

export function nameplatesUpTo(stage: number): Nameplate[] {
  return NAMEPLATES.slice(0, Math.max(0, Math.min(6, stage)) + 1);
}
