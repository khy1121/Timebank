import {
  canBuy,
  defaultItem,
  itemOf,
  lockLabel,
  WEAR_SLOTS,
  type Equipped,
  type ShopItem,
  type WearSlot,
} from './shop';
import { josa } from './korean';

/**
 * 옷장: 마스코트에 소품을 겹쳐 입히고, 사기 전에 입어 본다. (FR-070~072)
 * 입어 보는 동안의 모습(trial)은 저장하지 않는다. "이대로 입기"나 "사기"를 눌러야 저장된다.
 */

export type Outfit = Record<WearSlot, string>;

/** 저장된 착용 정보에서 옷 세 칸을 꺼낸다. 비었거나 가지지 않은 물건이면 "안 씀" */
export function outfitOf(equipped: Equipped, owned: Set<string>): Outfit {
  const pick = (slot: WearSlot) => {
    const code = equipped[slot];
    const item = code ? itemOf(code) : undefined;
    return item && item.slot === slot && owned.has(code!) ? code! : defaultItem(slot).code;
  };
  return { head: pick('head'), face: pick('face'), body: pick('body') };
}

/**
 * 서버가 돌려준 남의 옷({ head, face, body }, 산 물건만)을 앱 모양으로. 모르는 코드나 빈칸은 "안 씀".
 * 순위표·그룹에서 다른 사람의 꾸민 캐릭터를 그릴 때 쓴다.
 */
export function outfitFromServer(value: unknown): Outfit {
  const o = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const pick = (slot: WearSlot) => {
    const code = typeof o[slot] === 'string' ? (o[slot] as string) : null;
    const item = code ? itemOf(code) : undefined;
    return item && item.slot === slot ? item.code : defaultItem(slot).code;
  };
  return { head: pick('head'), face: pick('face'), body: pick('body') };
}

/** 소품을 입힌다. 같은 소품을 다시 고르면 벗긴다. */
export function wear(outfit: Outfit, code: string): Outfit {
  const item = itemOf(code);
  if (!item || !WEAR_SLOTS.includes(item.slot as WearSlot)) return outfit;
  const slot = item.slot as WearSlot;
  return { ...outfit, [slot]: outfit[slot] === code ? defaultItem(slot).code : code };
}

export function takeOff(outfit: Outfit, slot: WearSlot): Outfit {
  return { ...outfit, [slot]: defaultItem(slot).code };
}

export function sameOutfit(a: Outfit, b: Outfit): boolean {
  return a.head === b.head && a.face === b.face && a.body === b.body;
}

export type TrialState = {
  /** 입어 보는 것 중 아직 안 산 물건 */
  unowned: ShopItem[];
  /** 그중 은행 단계가 모자라 지금은 살 수 없는 물건 */
  locked: { item: ShopItem; lock: string }[];
  total: number;
  /** 잔고가 모자라면 그만큼 */
  short: number;
  /** 다 가진 물건이고 저장된 것과 다르면 "이대로 입기"만 하면 된다 */
  canSaveOnly: boolean;
  canBuyAll: boolean;
};

export function trialState(trial: Outfit, saved: Outfit, owned: Set<string>, balance: number): TrialState {
  const codes = WEAR_SLOTS.map((s) => trial[s]);
  const unowned = codes.map(itemOf).filter((i): i is ShopItem => !!i && !owned.has(i.code));
  const locked = unowned.flatMap((item) => {
    const lock = lockLabel(item, owned);
    return lock ? [{ item, lock }] : [];
  });
  const total = unowned.reduce((s, i) => s + i.price, 0);
  return {
    unowned,
    locked,
    total,
    short: Math.max(0, total - balance),
    canSaveOnly: unowned.length === 0 && !sameOutfit(trial, saved),
    canBuyAll: unowned.length > 0 && locked.length === 0 && total <= balance && unowned.every((i) => canBuy(i.code, balance, owned).ok),
  };
}

/** 저장할 착용 정보: 기존 꾸미기 칸은 두고 옷 세 칸만 바꾼다 */
export function withOutfit(equipped: Equipped, outfit: Outfit): Equipped {
  return { ...equipped, head: outfit.head, face: outfit.face, body: outfit.body };
}

/** 입혔을 때 마스코트 한마디 */
const LINES: Record<string, string> = {
  'head-beanie': '따뜻해요. 미루는 마음도 녹여 볼게요.',
  'head-gat': '양반 납시오. 체면이 있으니 미루지 않겠소.',
  'head-crown': '이 몸이 바로 시간은행의 왕이에요.',
  'face-glasses': '기한이 아주 잘 보여요. 놓칠 수가 없네요.',
  'body-raincoat': '빚 폭우가 와도 끄떡없어요.',
  'body-banker': '이자 계산은 제게 맡기세요. 한 푼도 안 틀려요.',
};

export function wearLine(code: string): string {
  return LINES[code] ?? '가볍고 좋네요.';
}

/** 화면 읽기 프로그램용: 지금 입은 모습 설명 */
export function describeOutfit(outfit: Outfit): string {
  const worn = WEAR_SLOTS.map((s) => itemOf(outfit[s])).filter((i) => i && i.price > 0).map((i) => i!.name);
  return worn.length ? `마스코트가 ${josa(worn.join(', '), '을', '를')} 입고 있어요` : '마스코트가 아무것도 입지 않았어요';
}
