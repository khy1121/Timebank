import { stampPath, toShape } from '../stampShape';

const coords = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('도장 모양 (TC-064)', () => {
  it('모든 모양이 닫힌 경로다', () => {
    for (const s of ['circle', 'square', 'flower', 'star', 'hexagon', 'heart', 'cap'] as const) {
      const p = stampPath(s, 48, 2);
      expect(p.startsWith('M ')).toBe(true);
      expect(p.endsWith('Z')).toBe(true);
    }
  });

  it('윤곽은 칸 밖으로 나가지 않는다', () => {
    for (const s of ['square', 'flower', 'star', 'hexagon', 'heart', 'cap'] as const) {
      const nums = coords(stampPath(s, 48, 2));
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(1.9);
      expect(Math.max(...nums)).toBeLessThanOrEqual(46.1);
    }
  });

  it('모르는 값은 동그라미로 본다', () => {
    expect(toShape('triangle')).toBe('circle');
    expect(toShape('heart')).toBe('heart');
    expect(toShape('star')).toBe('star');
    expect(toShape(undefined)).toBe('circle');
  });
});
