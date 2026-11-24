import { nextDue, toRepeat } from '../repeat';
import { todoFromRow, todoToParams } from '../sync';

describe('반복 할 일 (FR-111)', () => {
  it('다음 기한: 원래 기한에서 하루·7일 뒤', () => {
    expect(nextDue('2026-11-25', 'daily', '2026-11-25')).toBe('2026-11-26');
    expect(nextDue('2026-11-27', 'daily', '2026-11-25')).toBe('2026-11-28');
    expect(nextDue('2026-11-25', 'weekly', '2026-11-24')).toBe('2026-12-02');
  });
  it('원래 기한이 지났으면 오늘부터 센다', () => {
    expect(nextDue('2026-11-20', 'daily', '2026-11-25')).toBe('2026-11-26');
    expect(nextDue('2026-11-20', 'weekly', '2026-11-25')).toBe('2026-12-02');
  });
  it('모르는 값은 반복 없음', () => {
    expect(toRepeat('monthly')).toBeNull();
    expect(toRepeat(null)).toBeNull();
    expect(toRepeat('weekly')).toBe('weekly');
  });
  it('서버 행과 오간다', () => {
    const t = todoFromRow({ id: 'a', title: 't', importance: 3, due_date: '2026-11-25', status: 'open', updated_at: 'x', deleted_at: null, repeat: 'daily', repeat_from: 'b' });
    expect(t.repeat).toBe('daily');
    expect(t.repeatFrom).toBe('b');
    expect(todoToParams(t)).toMatchObject({ p_repeat: 'daily', p_repeat_from: 'b' });
  });
});
