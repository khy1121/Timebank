/**
 * 상점 물건. (FR-063, FR-064, 상점기획서 3절)
 * 물건 코드는 서버에 저장되므로 한 번 쓴 코드의 뜻을 바꾸지 않는다. (코드정의서 2.13절)
 * - 도장·말풍선: 코드로 그리는 꾸미기
 * - 머리·얼굴·몸: 마스코트에 겹쳐 입히는 소품. 칸마다 하나씩, 세 칸을 함께 입는다
 * - 내 은행: 순서대로만 산다. 가장 높은 단계가 지금 은행이고, 단계가 다른 물건을 연다
 */

import { josa } from './korean';

export type DecorSlot = 'stampInk' | 'stampWord' | 'stampShape' | 'bubble' | 'background';
export type WearSlot = 'head' | 'face' | 'body';
export type Slot = DecorSlot | WearSlot | 'bank';

export type ShopItem = {
  code: string;
  slot: Slot;
  name: string;
  /** 0이면 처음부터 가진 기본 물건 */
  price: number;
  /** 잉크·말풍선은 색 토큰 이름, 도장 글자는 글자, 소품·은행은 그림 이름 */
  value: string;
  /** 사려면 필요한 은행 단계 */
  needsBank?: number;
  /** 은행 단계 (bank 칸만) */
  stage?: number;
};

export const SLOT_LABEL: Record<Slot, string> = {
  stampInk: '도장 잉크',
  stampWord: '도장 글자',
  stampShape: '도장 모양',
  bubble: '말풍선 색',
  background: '홈 배경',
  head: '머리',
  face: '얼굴',
  body: '몸',
  bank: '내 은행',
};

/** 상점 화면에 칸째로 진열하는 꾸미기 */
export const SLOTS: DecorSlot[] = ['background', 'stampInk', 'stampWord', 'stampShape', 'bubble'];
/** 옷장에서 입히는 칸. 그리는 순서(아래 → 위)이기도 하다: 몸 위에 얼굴(안경), 그 위에 머리 */
export const WEAR_SLOTS: WearSlot[] = ['body', 'face', 'head'];
/** 옷장 서랍의 탭 순서 */
export const WEAR_TABS: WearSlot[] = ['head', 'face', 'body'];

export const BANK_NAMES = ['길가 좌판', '엽전 가판대', '동네 창구', '시장 지점', '시간은행 본점'] as const;

export const ITEMS: ShopItem[] = [
  // 적립 도장의 잉크. 빨강은 연체 도장과 헷갈려서 팔지 않는다 (시간적금기획서 12절)
  { code: 'ink-brand', slot: 'stampInk', name: '파랑', price: 0, value: 'brandPrimary' },
  { code: 'ink-blue', slot: 'stampInk', name: '남색', price: 1500, value: 'inkBlue' },
  { code: 'ink-green', slot: 'stampInk', name: '초록', price: 1500, value: 'inkGreen' },
  { code: 'ink-gold', slot: 'stampInk', name: '금박', price: 4000, value: 'inkGold' },
  { code: 'word-jeokrip', slot: 'stampWord', name: '적립', price: 0, value: '적립' },
  { code: 'word-wannap', slot: 'stampWord', name: '완납', price: 500, value: '완납' },
  { code: 'word-haenaem', slot: 'stampWord', name: '해냄', price: 2000, value: '해냄' },
  { code: 'word-choego', slot: 'stampWord', name: '최고', price: 2000, value: '최고' },
  { code: 'word-kkeut', slot: 'stampWord', name: '끝!', price: 3000, value: '끝!' },
  { code: 'bubble-cream', slot: 'bubble', name: '크림', price: 0, value: 'bubbleCream' },
  { code: 'bubble-sky', slot: 'bubble', name: '하늘', price: 1500, value: 'bubbleSky' },
  { code: 'bubble-mint', slot: 'bubble', name: '민트', price: 1500, value: 'bubbleMint' },
  { code: 'bubble-pink', slot: 'bubble', name: '분홍', price: 2500, value: 'bubblePink' },
  { code: 'shape-circle', slot: 'stampShape', name: '동그라미', price: 0, value: 'circle' },
  { code: 'shape-square', slot: 'stampShape', name: '네모', price: 2000, value: 'square' },
  { code: 'shape-flower', slot: 'stampShape', name: '꽃', price: 3500, value: 'flower' },
  { code: 'shape-star', slot: 'stampShape', name: '별', price: 6000, value: 'star', needsBank: 2 },
  { code: 'bg-coins', slot: 'background', name: '엽전 무늬', price: 0, value: 'bg-coins' },
  { code: 'bg-hanji', slot: 'background', name: '한지', price: 3000, value: 'bg-hanji' },
  { code: 'bg-clouds', slot: 'background', name: '구름 무늬', price: 5000, value: 'bg-clouds', needsBank: 1 },
  { code: 'bg-night', slot: 'background', name: '밤하늘 별', price: 10000, value: 'bg-night', needsBank: 3 },

  { code: 'head-none', slot: 'head', name: '안 씀', price: 0, value: '' },
  { code: 'head-beanie', slot: 'head', name: '털모자', price: 2500, value: 'beanie' },
  { code: 'head-gat', slot: 'head', name: '갓', price: 8000, value: 'gat', needsBank: 2 },
  { code: 'head-crown', slot: 'head', name: '금관', price: 20000, value: 'crown', needsBank: 3 },
  { code: 'face-none', slot: 'face', name: '안 씀', price: 0, value: '' },
  { code: 'face-glasses', slot: 'face', name: '동그란 안경', price: 2500, value: 'glasses' },
  { code: 'body-none', slot: 'body', name: '안 입음', price: 0, value: '' },
  { code: 'body-raincoat', slot: 'body', name: '노란 우비', price: 4000, value: 'raincoat' },
  { code: 'body-banker', slot: 'body', name: '은행원 조끼', price: 6000, value: 'banker', needsBank: 1 },

  { code: 'bank-0', slot: 'bank', name: BANK_NAMES[0], price: 0, value: 'bank-0', stage: 0 },
  { code: 'bank-1', slot: 'bank', name: BANK_NAMES[1], price: 5000, value: 'bank-1', stage: 1 },
  { code: 'bank-2', slot: 'bank', name: BANK_NAMES[2], price: 12000, value: 'bank-2', stage: 2 },
  { code: 'bank-3', slot: 'bank', name: BANK_NAMES[3], price: 25000, value: 'bank-3', stage: 3 },
  { code: 'bank-4', slot: 'bank', name: BANK_NAMES[4], price: 50000, value: 'bank-4', stage: 4 },
];

export type Equipped = Partial<Record<DecorSlot | WearSlot, string>>;

const byCode = new Map(ITEMS.map((item) => [item.code, item]));

export function itemOf(code: string): ShopItem | undefined {
  return byCode.get(code);
}

export function defaultItem(slot: Slot): ShopItem {
  return ITEMS.find((item) => item.slot === slot && item.price === 0)!;
}

export function itemsOf(slot: Slot): ShopItem[] {
  return ITEMS.filter((item) => item.slot === slot);
}

/** 기본 물건과 산 물건의 코드 */
export function ownedCodes(purchasedCodes: string[]): Set<string> {
  return new Set([...ITEMS.filter((i) => i.price === 0).map((i) => i.code), ...purchasedCodes]);
}

/** 지금 은행 단계 = 가진 은행 중 가장 높은 단계 */
export function bankStage(owned: Set<string>): number {
  return Math.max(0, ...itemsOf('bank').filter((b) => owned.has(b.code)).map((b) => b.stage ?? 0));
}

/** 다음에 살 수 있는 은행. 본점까지 다 열었으면 null */
export function nextBank(owned: Set<string>): ShopItem | null {
  const stage = bankStage(owned);
  return itemsOf('bank').find((b) => b.stage === stage + 1) ?? null;
}

/** 잠긴 물건이면 "동네 창구를 열면" 같은 조건 문구, 아니면 null */
export function lockLabel(item: ShopItem, owned: Set<string>): string | null {
  if (item.needsBank !== undefined && bankStage(owned) < item.needsBank) return `${josa(BANK_NAMES[item.needsBank], '을', '를')} 열면`;
  if (item.slot === 'bank' && item.stage !== undefined && item.stage > bankStage(owned) + 1) return `${BANK_NAMES[item.stage - 1]} 다음에 열려요`;
  return null;
}

export type Look = Record<DecorSlot | WearSlot, ShopItem>;

const LOOK_SLOTS: (DecorSlot | WearSlot)[] = ['stampInk', 'stampWord', 'stampShape', 'bubble', 'background', 'head', 'face', 'body'];

/** 칸마다 실제로 쓰는 물건. 가지지 않았거나 모르는 코드면 기본 물건으로 되돌린다. */
export function resolveLook(equipped: Equipped, owned: Set<string>): Look {
  const pick = (slot: DecorSlot | WearSlot) => {
    const code = equipped[slot];
    const item = code ? itemOf(code) : undefined;
    return item && item.slot === slot && owned.has(item.code) ? item : defaultItem(slot);
  };
  return Object.fromEntries(LOOK_SLOTS.map((s) => [s, pick(s)])) as Look;
}

export type BuyCheck = { ok: true } | { ok: false; reason: 'owned' | 'unknown' | 'short' | 'locked'; short?: number; lock?: string };

export function canBuy(code: string, balance: number, owned: Set<string>): BuyCheck {
  const item = itemOf(code);
  if (!item) return { ok: false, reason: 'unknown' };
  if (owned.has(code)) return { ok: false, reason: 'owned' };
  const lock = lockLabel(item, owned);
  if (lock) return { ok: false, reason: 'locked', lock };
  if (balance < item.price) return { ok: false, reason: 'short', short: item.price - balance };
  return { ok: true };
}
