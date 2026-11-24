import type { Repayment } from '../records';
import { weekdayLine, weekdayReport } from '../weekday';

// 2026-11-23 월, 24 화, 25 수
const todo = (id: string, dueDate: string) => ({ id, dueDate });
const rep = (todoId: string, overdueDays = 0, kind: Repayment['kind'] = 'repaid'): Repayment => ({
  id: `r-${todoId}`, todoId, kind, title: '', principal: 1000, interest: 0, overdueDays, settledOn: '2026-11-30',
});

describe('요일 분석 (FR-111)', () => {
  const todos = [todo('a', '2026-11-23'), todo('b', '2026-11-23'), todo('c', '2026-11-24'), todo('d', '2026-11-24'), todo('e', '2026-11-25')];
  it('기한 요일별로 기한 안 비율을 센다', () => {
    const r = weekdayReport(todos, [rep('a'), rep('b'), rep('c', 2), rep('d', 0, 'forgiven'), rep('e')]);
    expect(r.days[0]).toMatchObject({ name: '월', total: 2, onTime: 2, rate: 1 });
    expect(r.days[1]).toMatchObject({ name: '화', total: 2, onTime: 0, rate: 0 });
    expect(r.best?.name).toBe('월');
    expect(r.worst?.name).toBe('화');
    expect(weekdayLine(r)).toBe('월요일엔 잘 지키고, 화요일에 자주 미뤄요.');
  });
  it('2건이 안 되는 요일은 고르지 않고, 5건이 안 되면 기다린다', () => {
    const r = weekdayReport(todos, [rep('a'), rep('e')]);
    expect(r.best).toBeNull();
    expect(weekdayLine(r)).toContain('5개');
  });
});
