import type { Todo } from '../interest';
import { MAX_SCHEDULED, planNotifications } from '../notify';

const NINE = { hour: 9, minute: 0 };
const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 'a',
  title: '보고서 초안',
  importance: 3,
  dueDate: '2026-11-25',
  status: 'open',
  ...over,
});

describe('알림 계획 (TC-030, TC-031)', () => {
  it('기한 당일과 그다음 날, 설정한 시각에 알림을 하나씩 만든다', () => {
    const plan = planNotifications([todo()], { date: '2026-11-23', minutes: 10 * 60 }, NINE);
    expect(plan.map((p) => [p.kind, p.date, p.hour, p.minute])).toEqual([
      ['due', '2026-11-25', 9, 0],
      ['interest', '2026-11-26', 9, 0],
    ]);
  });

  it('문구에 제목과 계산한 금액이 들어간다 (원금 3,000냥의 연체 첫날은 3,300냥)', () => {
    const [due, interest] = planNotifications([todo()], { date: '2026-11-23', minutes: 0 }, NINE);
    expect(due.title).toBe('오늘까지예요');
    expect(due.body).toBe('"보고서 초안" 오늘을 넘기면 이자가 붙어요.');
    expect(interest.title).toBe('이자가 붙기 시작했어요');
    expect(interest.body).toBe('"보고서 초안" 지금 3,300냥이에요.');
  });

  it('기한 당일이라도 알림 시각이 지났으면 당일 알림은 만들지 않는다', () => {
    const plan = planNotifications([todo({ dueDate: '2026-11-23' })], { date: '2026-11-23', minutes: 9 * 60 }, NINE);
    expect(plan.map((p) => p.kind)).toEqual(['interest']);
  });

  it('기한 당일 알림 시각 전이면 당일 알림을 만든다', () => {
    const plan = planNotifications([todo({ dueDate: '2026-11-23' })], { date: '2026-11-23', minutes: 9 * 60 - 1 }, NINE);
    expect(plan.map((p) => p.kind)).toEqual(['due', 'interest']);
  });

  it('이미 연체된 할 일에는 알림을 만들지 않는다', () => {
    const plan = planNotifications([todo({ dueDate: '2026-11-20' })], { date: '2026-11-23', minutes: 0 }, NINE);
    expect(plan).toEqual([]);
  });

  it('상환했거나 탕감한 할 일에는 알림을 만들지 않는다', () => {
    const plan = planNotifications(
      [todo({ status: 'repaid' }), todo({ id: 'b', status: 'forgiven' })],
      { date: '2026-11-23', minutes: 0 },
      NINE,
    );
    expect(plan).toEqual([]);
  });

  it('알림 시각을 바꾸면 그 시각으로 만든다', () => {
    const plan = planNotifications([todo()], { date: '2026-11-23', minutes: 0 }, { hour: 21, minute: 0 });
    expect(plan.every((p) => p.hour === 21 && p.minute === 0)).toBe(true);
  });

  it(`가까운 날짜부터 ${MAX_SCHEDULED}건까지만 만든다`, () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      todo({ id: `t${String(i).padStart(2, '0')}`, dueDate: i < 20 ? '2026-12-10' : '2026-11-30' }),
    );
    const plan = planNotifications(many, { date: '2026-11-23', minutes: 0 }, NINE);
    expect(plan).toHaveLength(MAX_SCHEDULED);
    expect(plan[0].date).toBe('2026-11-30');
    // 80건 중 가까운 60건: 11월 30일 기한 20건의 알림 40건 + 12월 10일 당일 알림 20건
    expect(plan.filter((p) => p.date === '2026-12-11')).toHaveLength(0);
  });
});
