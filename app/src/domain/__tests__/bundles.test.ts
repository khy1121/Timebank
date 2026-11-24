import { bundleInputs, bundlePrincipal, bundlesFromJson, validateBundle } from '../bundles';

describe('할 일 묶음 (FR-111)', () => {
  it('서버 값을 읽고 모양이 틀린 것은 버린다', () => {
    const got = bundlesFromJson([
      { id: 'a', name: '아침 루틴', items: [{ title: '물 마시기', importance: 1 }, { title: '이상한', importance: 9 }] },
      { id: 'b', name: '빈 묶음', items: [] },
      'x',
    ]);
    expect(got).toEqual([{ id: 'a', name: '아침 루틴', items: [{ title: '물 마시기', importance: 1 }] }]);
    expect(bundlesFromJson(null)).toEqual([]);
  });
  it('검사', () => {
    expect(validateBundle('', [{ title: 'a', importance: 1 }])).toContain('nameRequired');
    expect(validateBundle('루틴', [])).toContain('noItems');
    expect(validateBundle('루틴', [{ title: ' ', importance: 1 }])).toContain('itemTitleRequired');
    expect(validateBundle('루틴', [{ title: '물', importance: 1 }])).toEqual([]);
  });
  it('넣을 할 일과 원금 합계', () => {
    const b = { id: 'a', name: '루틴', items: [{ title: ' 물 ', importance: 1 as const }, { title: '운동', importance: 3 as const }] };
    expect(bundleInputs(b, '2026-11-26')).toEqual([
      { title: '물', importance: 1, dueDate: '2026-11-26' },
      { title: '운동', importance: 3, dueDate: '2026-11-26' },
    ]);
    expect(bundlePrincipal(b)).toBe(4000);
  });
});
