import type { Repayment } from '../records';
import type { Entry } from '../savings';
import { lastMonth, statementOf, statementText } from '../statement';

const rep = (id: string, settledOn: string, overdueDays = 0, kind: Repayment['kind'] = 'repaid'): Repayment => ({
  id, todoId: id, kind, title: '', principal: 1000, interest: 0, overdueDays, settledOn,
});

describe('월간 명세서 (FR-111)', () => {
  it('지난달', () => {
    expect(lastMonth('2026-11-25')).toBe('2026-10');
    expect(lastMonth('2027-01-03')).toBe('2026-12');
  });
  it('그달 기록만 모은다', () => {
    const todos = ['a', 'b', 'c', 'd'].map((id) => ({ id, dueDate: '2026-10-05' }));
    const repayments = [rep('a', '2026-10-05'), rep('b', '2026-10-20', 2), rep('c', '2026-10-21', 1, 'forgiven'), rep('d', '2026-11-01')];
    const ledger: Entry[] = [
      { kind: 'interest', date: '2026-10-05', amount: 100, refId: 'a' },
      { kind: 'return', date: '2026-10-05', amount: 1000, refId: 'a' },
      { kind: 'interest', date: '2026-11-01', amount: 100, refId: 'd' },
    ];
    const weeks = [{ weekEnd: '2026-10-04', score: 600 }, { weekEnd: '2026-10-25', score: 640 }, { weekEnd: '2026-11-01', score: 650 }];
    const s = statementOf('2026-10', todos, repayments, ledger, weeks);
    expect(s).toMatchObject({ label: '2026년 10월', done: 2, onTime: 1, late: 1, forgiven: 1, earned: 100, creditFrom: 600, creditTo: 640 });
    expect(statementText(s)).toContain('신용 점수 600 → 640 (+40)');
  });
});
