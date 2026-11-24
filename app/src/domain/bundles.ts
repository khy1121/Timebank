import { TITLE_MAX, type TodoInput } from './records';
import type { Importance } from './interest';
import type { DateString } from './dates';

/**
 * 할 일 묶음 (FR-111, 시장 지점 혜택). 자주 같이 하는 할 일을 묶어 두고 한 번에 넣는다.
 * 설정(profiles.todo_bundles)에 저장해 기기를 바꿔도 남는다.
 */

export const BUNDLE_MAX = 10;
export const BUNDLE_ITEM_MAX = 8;
export const BUNDLE_NAME_MAX = 12;
export const BUNDLE_BANK_STAGE = 3;

export type BundleItem = { title: string; importance: Importance };
export type Bundle = { id: string; name: string; items: BundleItem[] };

const isImportance = (n: unknown): n is Importance => n === 1 || n === 2 || n === 3 || n === 4 || n === 5;

/** 서버 값을 읽는다. 모양이 틀린 것은 버린다 */
export function bundlesFromJson(value: unknown): Bundle[] {
  if (!Array.isArray(value)) return [];
  const out: Bundle[] = [];
  for (const v of value) {
    if (!v || typeof v !== 'object') continue;
    const b = v as Record<string, unknown>;
    if (typeof b.id !== 'string' || typeof b.name !== 'string' || !Array.isArray(b.items)) continue;
    const items = b.items
      .filter((i): i is { title: string; importance: Importance } => !!i && typeof i.title === 'string' && isImportance(i.importance))
      .map((i) => ({ title: i.title.slice(0, TITLE_MAX), importance: i.importance }))
      .slice(0, BUNDLE_ITEM_MAX);
    if (items.length === 0) continue;
    out.push({ id: b.id, name: b.name.slice(0, BUNDLE_NAME_MAX), items });
  }
  return out.slice(0, BUNDLE_MAX);
}

export type BundleError = 'nameRequired' | 'nameTooLong' | 'noItems' | 'tooManyItems' | 'itemTitleRequired' | 'itemTitleTooLong';

export function validateBundle(name: string, items: BundleItem[]): BundleError[] {
  const errors: BundleError[] = [];
  const n = name.trim();
  if (n.length === 0) errors.push('nameRequired');
  if (n.length > BUNDLE_NAME_MAX) errors.push('nameTooLong');
  if (items.length === 0) errors.push('noItems');
  if (items.length > BUNDLE_ITEM_MAX) errors.push('tooManyItems');
  if (items.some((i) => i.title.trim().length === 0)) errors.push('itemTitleRequired');
  if (items.some((i) => i.title.trim().length > TITLE_MAX)) errors.push('itemTitleTooLong');
  return errors;
}

export const BUNDLE_ERROR_TEXT: Record<BundleError, string> = {
  nameRequired: '묶음 이름을 적어 주세요',
  nameTooLong: `묶음 이름은 ${BUNDLE_NAME_MAX}자까지예요`,
  noItems: '할 일을 하나 이상 넣어 주세요',
  tooManyItems: `한 묶음에 ${BUNDLE_ITEM_MAX}개까지 넣을 수 있어요`,
  itemTitleRequired: '빈 할 일이 있어요',
  itemTitleTooLong: `할 일 이름은 ${TITLE_MAX}자까지예요`,
};

/** 묶음을 넣을 때 만들 할 일들 */
export function bundleInputs(bundle: Bundle, dueDate: DateString): TodoInput[] {
  return bundle.items.map((i) => ({ title: i.title.trim(), importance: i.importance, dueDate }));
}

/** 한 번에 거는 원금 합계 */
export function bundlePrincipal(bundle: Bundle): number {
  return bundle.items.reduce((s, i) => s + i.importance * 1000, 0);
}
