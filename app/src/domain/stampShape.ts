/**
 * 도장 모양의 SVG 경로. (FR-064, 상점기획서 3.4)
 * size×size 칸 안에, 가장자리에서 inset만큼 들어간 윤곽을 그린다.
 */

export type StampShape = 'circle' | 'square' | 'flower' | 'star' | 'hexagon' | 'heart' | 'cap';

const SHAPES: StampShape[] = ['circle', 'square', 'flower', 'star', 'hexagon', 'heart', 'cap'];

const r2 = (n: number) => Math.round(n * 100) / 100;

function polar(cx: number, cy: number, r: number, a: number): string {
  return `${r2(cx + r * Math.cos(a))} ${r2(cy + r * Math.sin(a))}`;
}

export function stampPath(shape: StampShape, size: number, inset: number): string {
  const c = size / 2;
  const R = c - inset;
  switch (shape) {
    case 'square': {
      const x0 = inset;
      const x1 = size - inset;
      const k = Math.max(2, R * 0.18); // 모서리 둥글기
      return `M ${r2(x0 + k)} ${r2(x0)} H ${r2(x1 - k)} Q ${r2(x1)} ${r2(x0)} ${r2(x1)} ${r2(x0 + k)} V ${r2(x1 - k)} Q ${r2(x1)} ${r2(x1)} ${r2(x1 - k)} ${r2(x1)} H ${r2(x0 + k)} Q ${r2(x0)} ${r2(x1)} ${r2(x0)} ${r2(x1 - k)} V ${r2(x0 + k)} Q ${r2(x0)} ${r2(x0)} ${r2(x0 + k)} ${r2(x0)} Z`;
    }
    case 'flower': {
      // 꽃잎 6장: 반지름이 각도에 따라 부드럽게 물결친다(절댓값으로 꽃잎 사이를 오목하게)
      const points: string[] = [];
      const n = 96;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const r = R * (0.8 + 0.2 * Math.abs(Math.cos(3 * (a + Math.PI / 2))));
        points.push(polar(c, c, r, a));
      }
      return `M ${points.join(' L ')} Z`;
    }
    case 'star': {
      // 꼭짓점 8개의 별. 가운데 글자가 들어가도록 안쪽 반지름을 넉넉히 둔다
      const tips = 8;
      const points: string[] = [];
      for (let i = 0; i < tips * 2; i++) {
        const a = (i / (tips * 2)) * Math.PI * 2 - Math.PI / 2;
        points.push(polar(c, c, i % 2 === 0 ? R : R * 0.68, a));
      }
      return `M ${points.join(' L ')} Z`;
    }
    case 'hexagon': {
      // 꼭짓점이 위아래로 가는 육각형. 모서리를 살짝 깎지 않고 곧게 둔다
      const points: string[] = [];
      for (let i = 0; i < 6; i++) points.push(polar(c, c, R, (i / 6) * Math.PI * 2 - Math.PI / 2));
      return `M ${points.join(' L ')} Z`;
    }
    case 'cap': {
      // 병뚜껑: 가장자리에 잔 톱니 18개
      const points: string[] = [];
      const n = 144;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        points.push(polar(c, c, R * (0.92 + 0.08 * Math.abs(Math.cos(9 * a))), a));
      }
      return `M ${points.join(' L ')} Z`;
    }
    case 'heart': {
      // 하트 곡선(x=16sin³t, y=13cos t−5cos2t−2cos3t−cos4t)을 칸에 맞춘다. 세로 범위 −17~12의 가운데를 칸 가운데에 둔다
      const points: string[] = [];
      const n = 120;
      const k = R / 16.5;
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        points.push(`${r2(c + x * k)} ${r2(c - (y + 2.5) * k)}`);
      }
      return `M ${points.join(' L ')} Z`;
    }
    default:
      return `M ${r2(c - R)} ${r2(c)} A ${r2(R)} ${r2(R)} 0 1 0 ${r2(c + R)} ${r2(c)} A ${r2(R)} ${r2(R)} 0 1 0 ${r2(c - R)} ${r2(c)} Z`;
  }
}

/** 모양 코드가 아니면 동그라미 */
export function toShape(value: string | undefined): StampShape {
  return SHAPES.includes(value as StampShape) ? (value as StampShape) : 'circle';
}
