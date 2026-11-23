/**
 * 상점 물건. 그림 자산 없이 코드로 그릴 수 있는 꾸미기만 판다. (FR-063, FR-064)
 * 물건 코드는 서버에 저장되므로 한 번 쓴 코드의 뜻을 바꾸지 않는다. (코드정의서 2.13절)
 */

export type Slot = 'stampInk' | 'stampWord' | 'bubble';

export type ShopItem = {
  code: string;
  slot: Slot;
  name: string;
  /** 0이면 처음부터 가진 기본 물건 */
  price: number;
  /** 잉크·말풍선은 색 토큰 이름, 도장 글자는 글자 */
  value: string;
};

export const SLOT_LABEL: Record<Slot, string> = {
  stampInk: '도장 잉크',
  stampWord: '도장 글자',
  bubble: '말풍선 색',
};

export const SLOTS: Slot[] = ['stampInk', 'stampWord', 'bubble'];

export const ITEMS: ShopItem[] = [
  { code: 'ink-red', slot: 'stampInk', name: '인주 빨강', price: 0, value: 'inkRed' },
  { code: 'ink-blue', slot: 'stampInk', name: '남색', price: 1500, value: 'inkBlue' },
  { code: 'ink-green', slot: 'stampInk', name: '초록', price: 1500, value: 'inkGreen' },
  { code: 'ink-gold', slot: 'stampInk', name: '금박', price: 4000, value: 'inkGold' },
  { code: 'word-wannap', slot: 'stampWord', name: '완납', price: 0, value: '완납' },
  { code: 'word-haenaem', slot: 'stampWord', name: '해냄', price: 2000, value: '해냄' },
  { code: 'word-choego', slot: 'stampWord', name: '최고', price: 2000, value: '최고' },
  { code: 'word-kkeut', slot: 'stampWord', name: '끝!', price: 3000, value: '끝!' },
  { code: 'bubble-cream', slot: 'bubble', name: '크림', price: 0, value: 'bubbleCream' },
  { code: 'bubble-sky', slot: 'bubble', name: '하늘', price: 1500, value: 'bubbleSky' },
  { code: 'bubble-mint', slot: 'bubble', name: '민트', price: 1500, value: 'bubbleMint' },
  { code: 'bubble-pink', slot: 'bubble', name: '분홍', price: 2500, value: 'bubblePink' },
];

export type Equipped = Partial<Record<Slot, string>>;

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

/** 칸마다 실제로 쓰는 물건. 가지지 않았거나 모르는 코드면 기본 물건으로 되돌린다. */
export function resolveLook(equipped: Equipped, owned: Set<string>): Record<Slot, ShopItem> {
  const pick = (slot: Slot) => {
    const item = equipped[slot] ? itemOf(equipped[slot]!) : undefined;
    return item && item.slot === slot && owned.has(item.code) ? item : defaultItem(slot);
  };
  return { stampInk: pick('stampInk'), stampWord: pick('stampWord'), bubble: pick('bubble') };
}

export type BuyCheck = { ok: true } | { ok: false; reason: 'owned' | 'unknown' | 'short'; short?: number };

export function canBuy(code: string, balance: number, owned: Set<string>): BuyCheck {
  const item = itemOf(code);
  if (!item) return { ok: false, reason: 'unknown' };
  if (owned.has(code)) return { ok: false, reason: 'owned' };
  if (balance < item.price) return { ok: false, reason: 'short', short: item.price - balance };
  return { ok: true };
}
