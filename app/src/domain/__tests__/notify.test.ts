import type { Todo } from '../interest';
import { MAX_SCHEDULED, OVERDUE_ALERT_DAYS, overdueMessage, planNotifications } from '../notify';

const NINE = { hour: 9, minute: 0 };
const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 'a',
  title: '보고서 초안',
  importance: 3,
  dueDate: '2026-11-25',
  status: 'open',
  ...over,
});

describe('알림 계획 (TC-030, TC-031, 시간적금기획서 13절)', () => {
  it('기한 당일 하나와 연체 1~7·10·14·21일째, 설정한 시각에 만든다', () => {
    const plan = planNotifications([todo()], { date: '2026-11-23', minutes: 10 * 60 }, NINE);
    expect(plan[0]).toMatchObject({ kind: 'due', date: '2026-11-25', hour: 9, minute: 0 });
    const overdue = plan.filter((p) => p.kind === 'overdue');
    expect(overdue).toHaveLength(OVERDUE_ALERT_DAYS.length);
    expect(overdue.map((p) => p.date)).toEqual([
      '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-05', '2026-12-09', '2026-12-16',
    ]);
  });

  it('기한 당일 문구는 돌려받을 냥(원금 + 이자 10%)을 알려 준다', () => {
    const [due] = planNotifications([todo()], { date: '2026-11-23', minutes: 0 }, NINE);
    expect(due.title).toBe('오늘까지예요');
    expect(due.body).toBe('"보고서 초안" 오늘 끝내면 3,300냥을 돌려받아요. 넘기면 원금이 깎여요.');
  });

  it('연체 문구는 원금에서 깎인 냥과 돌려받을 냥을 알려 준다', () => {
    expect(overdueMessage('보고서 초안', 3000, 1)).toEqual({ title: '연체 1일째', body: '"보고서 초안" 원금 3,000냥 중 300냥이 깎였어요. 오늘 끝내면 2,700냥 돌려받아요.' });
    expect(overdueMessage('보고서 초안', 3000, 3).body).toBe('"보고서 초안" 원금 3,000냥 중 993냥이 깎였어요. 오늘 끝내면 2,007냥 돌려받아요.');
  });

  it('7일째는 내일이면 원금을 다 잃는다고 경고한다', () => {
    expect(overdueMessage('보고서 초안', 3000, 7)).toEqual({ title: '내일이면 원금을 다 잃어요', body: '"보고서 초안" 지금 끝내면 154냥은 건져요.' });
  });

  it('원금을 다 잃은 뒤에는 통장에서 빠지는 냥을 알려 준다', () => {
    expect(overdueMessage('보고서 초안', 3000, 10).body).toBe('"보고서 초안" 원금을 다 잃고 1,781냥이 통장에서 빠지고 있어요.');
  });

  it('이미 연체된 할 일도 남은 연체 알림을 만든다', () => {
    const plan = planNotifications([todo({ dueDate: '2026-11-20' })], { date: '2026-11-23', minutes: 0 }, NINE);
    expect(plan.map((p) => p.title)).toEqual(['연체 3일째', '연체 4일째', '연체 5일째', '연체 6일째', '내일이면 원금을 다 잃어요', '연체 10일째', '연체 14일째', '연체 21일째']);
  });

  it('같은 날 연체된 할 일이 여럿이면 하나로 묶는다', () => {
    const plan = planNotifications([todo({ id: 'a' }), todo({ id: 'b', importance: 1 })], { date: '2026-11-23', minutes: 0 }, NINE);
    const day1 = plan.filter((p) => p.date === '2026-11-26');
    expect(day1).toHaveLength(1);
    expect(day1[0]).toMatchObject({ kind: 'overdueDigest', title: '연체 2건' });
    // 다음 날 붙을 연체료: 3,000냥은 330냥, 1,000냥은 110냥
    expect(day1[0].body).toBe('오늘도 440냥씩 깎이는 중이에요. 하나라도 끝내 볼까요?');
  });

  it('기한 당일이라도 알림 시각이 지났으면 당일 알림은 만들지 않는다', () => {
    const plan = planNotifications([todo({ dueDate: '2026-11-23' })], { date: '2026-11-23', minutes: 9 * 60 }, NINE);
    expect(plan.some((p) => p.kind === 'due')).toBe(false);
  });

  it('상환했거나 포기한 할 일에는 알림을 만들지 않는다', () => {
    const plan = planNotifications([todo({ status: 'repaid' }), todo({ id: 'b', status: 'forgiven' })], { date: '2026-11-23', minutes: 0 }, NINE);
    expect(plan).toEqual([]);
  });

  it('알림 시각을 바꾸면 그 시각으로 만든다', () => {
    const plan = planNotifications([todo()], { date: '2026-11-23', minutes: 0 }, { hour: 21, minute: 0 });
    expect(plan.every((p) => p.hour === 21 && p.minute === 0)).toBe(true);
  });

  it(`가까운 날짜부터 ${MAX_SCHEDULED}건까지만 만든다`, () => {
    const many = Array.from({ length: 40 }, (_, i) => todo({ id: `t${String(i).padStart(2, '0')}`, dueDate: `2026-12-${String(1 + (i % 28)).padStart(2, '0')}` }));
    const plan = planNotifications(many, { date: '2026-11-23', minutes: 0 }, NINE);
    expect(plan).toHaveLength(MAX_SCHEDULED);
    const dates = plan.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
  });
});
