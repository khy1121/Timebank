import type { Todo } from '../interest';
import type { Repayment } from '../records';
import {
  buildSignals,
  dailyScores,
  rankChange,
  scoreBreakdown,
  standingFromRow,
  statusMessage,
  statusOf,
  STATUS,
  STATUS_ORDER,
  topPercent,
  weeklyBars,
  type Signals,
  type StandingWeek,
} from '../standing';

const TODAY = '2026-11-23';
const week = (rank: number, participants: number, score = 0): StandingWeek => ({ weekEnd: TODAY, rank, participants, score, topScore: 5000 });
const base = (over: Partial<Signals> = {}): Signals => ({
  standing: week(10, 40),
  openCount: 2,
  overdueCount: 0,
  maxOverdueDays: 0,
  hasCapped: false,
  repaidThisWeek: 3,
  onTimeThisWeek: 3,
  repaidLast2Days: 1,
  hadOverdueThisWeek: false,
  totalRepaid: 20,
  streak: 3,
  daysSinceActivity: 0,
  daysSinceSignup: 30,
  ...over,
});

describe('상태 목록 (TC-066)', () => {
  it('상태는 14개이고 판정 순서에 모두 들어 있다', () => {
    expect(STATUS_ORDER).toHaveLength(14);
    expect(new Set(STATUS_ORDER)).toEqual(new Set(Object.keys(STATUS)));
  });
});

describe('상위 비율', () => {
  it('23명 중 3등은 상위 14%', () => {
    expect(topPercent(3, 23)).toBe(14);
  });
  it('1등은 가장 작은 값, 꼴찌는 100%', () => {
    expect(topPercent(1, 40)).toBe(3);
    expect(topPercent(40, 40)).toBe(100);
  });
});

describe('상태 판정 (TC-066)', () => {
  it('가입 7일 안이고 상환 3건 미만이면 신입. 다른 조건보다 먼저 본다', () => {
    expect(statusOf(base({ daysSinceSignup: 2, totalRepaid: 1, hasCapped: true }))).toBe('newbie');
  });

  it('상한에 닿은 할 일이 있으면 파산 직전', () => {
    expect(statusOf(base({ hasCapped: true }))).toBe('bankrupt');
  });

  it('남은 할 일이 있는데 3일 넘게 활동이 없으면 잠수 중', () => {
    expect(statusOf(base({ daysSinceActivity: 4 }))).toBe('dormant');
    expect(statusOf(base({ daysSinceActivity: 3 }))).not.toBe('dormant');
    expect(statusOf(base({ daysSinceActivity: 9, openCount: 0 }))).not.toBe('dormant');
  });

  it('연체 3건 이상이거나 7일 넘게 밀리면 빚더미', () => {
    expect(statusOf(base({ overdueCount: 3, maxOverdueDays: 2 }))).toBe('debtPile');
    expect(statusOf(base({ overdueCount: 1, maxOverdueDays: 8 }))).toBe('debtPile');
  });

  it('하위 10%면 나태하다, 하위 30%면 게으르다', () => {
    expect(statusOf(base({ standing: week(38, 40) }))).toBe('slothful');
    expect(statusOf(base({ standing: week(30, 40) }))).toBe('lazy');
  });

  it('순위와 상관없이 연체 2건이면 게으르다', () => {
    expect(statusOf(base({ standing: week(1, 40), overdueCount: 2, maxOverdueDays: 1 }))).toBe('lazy');
  });

  it('이번 주 연체가 있었는데 최근 2일 동안 3건 이상 상환하면 벼락치기', () => {
    expect(statusOf(base({ standing: week(20, 40), hadOverdueThisWeek: true, repaidLast2Days: 3, overdueCount: 1, maxOverdueDays: 1 }))).toBe('cramming');
  });

  it('할 일은 있는데 이번 주 상환이 없으면 간 보는 중', () => {
    expect(statusOf(base({ standing: week(20, 40), repaidThisWeek: 0, onTimeThisWeek: 0 }))).toBe('dabbling');
  });

  it('상위 3%이고 연속 기록 10번 이상이면 일벌레', () => {
    expect(statusOf(base({ standing: week(1, 40), streak: 10 }))).toBe('workaholic');
  });

  it('상위 10%이고 연체가 없으면 부지런하다', () => {
    expect(statusOf(base({ standing: week(4, 40) }))).toBe('diligent');
  });

  it('상위 10%여도 연체가 1건 있으면 부지런하다가 아니다', () => {
    expect(statusOf(base({ standing: week(4, 40), overdueCount: 1, maxOverdueDays: 1 }))).toBe('sincere');
  });

  it('이번 주 5건 이상을 모두 기한 안에 갚으면 칼같다', () => {
    expect(statusOf(base({ standing: week(20, 40), repaidThisWeek: 5, onTimeThisWeek: 5 }))).toBe('sharp');
  });

  it('상위 40% 안이면 성실하다, 그 아래 중간이면 어영부영하다', () => {
    expect(statusOf(base({ standing: week(16, 40) }))).toBe('sincere');
    expect(statusOf(base({ standing: week(24, 40) }))).toBe('mediocre');
  });

  it('겨룰 사람이 5명 미만이면 순위로 정하는 상태 대신 비교 대기', () => {
    expect(statusOf(base({ standing: week(1, 3) }))).toBe('waiting');
    expect(statusOf(base({ standing: null }))).toBe('waiting');
  });

  it('겨룰 사람이 적어도 행동으로 정하는 상태는 붙는다', () => {
    expect(statusOf(base({ standing: week(1, 2), repaidThisWeek: 6, onTimeThisWeek: 6 }))).toBe('sharp');
    expect(statusOf(base({ standing: null, repaidThisWeek: 0, onTimeThisWeek: 0 }))).toBe('dabbling');
  });
});

describe('기기 기록으로 신호 만들기', () => {
  const todo = (over: Partial<Todo>): Todo => ({ id: 't', title: 'x', importance: 3, dueDate: TODAY, status: 'open', ...over });
  const rep = (settledOn: string, overdueDays = 0, kind: Repayment['kind'] = 'repaid'): Repayment => ({
    id: settledOn + overdueDays + kind, todoId: 'x', kind, title: 'x', principal: 3000, interest: overdueDays ? 300 : 0, overdueDays, settledOn,
  });

  it('연체 수, 최장 연체일, 이번 주 상환 수를 센다', () => {
    const sig = buildSignals({
      todos: [todo({ id: 'a', dueDate: '2026-11-20' }), todo({ id: 'b', dueDate: '2026-11-22' }), todo({ id: 'c', dueDate: '2026-11-30' })],
      repayments: [rep('2026-11-23'), rep('2026-11-22', 1), rep('2026-11-10')],
      today: TODAY,
      streak: 1,
      standing: null,
      lastActivity: '2026-11-21',
      signupDate: '2026-11-01',
    });
    expect(sig).toMatchObject({
      openCount: 3,
      overdueCount: 2,
      maxOverdueDays: 3,
      repaidThisWeek: 2,
      onTimeThisWeek: 1,
      repaidLast2Days: 2,
      hadOverdueThisWeek: true,
      totalRepaid: 3,
      daysSinceActivity: 2,
      daysSinceSignup: 22,
    });
  });

  it('상한에 닿은 할 일을 찾는다 (25일째부터 상한)', () => {
    const sig = buildSignals({ todos: [todo({ dueDate: '2026-10-29' })], repayments: [], today: TODAY, streak: 0, standing: null, lastActivity: null, signupDate: null });
    expect(sig.hasCapped).toBe(true);
  });
});

describe('마스코트 한마디 (TC-067)', () => {
  it('매운맛과 순한맛이 다르다', () => {
    const sig = base({ standing: week(30, 40) });
    expect(statusMessage('lazy', sig, 'spicy')).not.toBe(statusMessage('lazy', sig, 'mild'));
  });

  it('숫자가 들어가는 문구는 실제 값을 쓴다', () => {
    expect(statusMessage('debtPile', base({ overdueCount: 4 }), 'spicy')).toContain('4건');
    expect(statusMessage('diligent', base({ standing: week(3, 40) }), 'spicy')).toContain('상위 8%');
    expect(statusMessage('sincere', base({ standing: week(6, 40) }), 'spicy')).toContain('5명');
  });

  it('모든 상태에 두 말투 문구가 있다', () => {
    for (const code of STATUS_ORDER) {
      expect(statusMessage(code, base({ daysSinceActivity: 4 }), 'spicy').length).toBeGreaterThan(5);
      expect(statusMessage(code, base({ daysSinceActivity: 4 }), 'mild').length).toBeGreaterThan(5);
    }
  });
});

describe('지난주 대비 등수 변화 (TC-068)', () => {
  it('등수가 오르면 몇 계단 올랐는지 알려준다', () => {
    expect(rankChange(week(5, 30), week(8, 28))).toMatchObject({ kind: 'up', steps: 3, text: '지난주보다 3계단 올랐어요' });
  });
  it('내려가면 내려갔다고 알려준다', () => {
    expect(rankChange(week(9, 30), week(7, 30))).toMatchObject({ kind: 'down', steps: 2 });
  });
  it('지난주 기록이 없으면 그렇게 알려준다', () => {
    expect(rankChange(week(9, 30), null).kind).toBe('new');
  });
});

describe('주간 차트 (TC-069)', () => {
  it('최근 7일 하루별로 번 냥에서 낸 이자를 뺀다. 오래된 날부터', () => {
    const r = (settledOn: string, overdueDays: number, interest: number): Repayment => ({
      id: settledOn + interest, todoId: 'x', kind: 'repaid', title: 'x', principal: 3000, interest, overdueDays, settledOn,
    });
    const days = dailyScores([r('2026-11-23', 0, 0), r('2026-11-23', 2, 630), r('2026-11-20', 0, 0), r('2026-11-01', 0, 0)], TODAY);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-11-17');
    expect(days[6]).toEqual({ date: TODAY, score: 300 - 630 });
    expect(days[3]).toEqual({ date: '2026-11-20', score: 300 });
  });
});

describe('서버 행과 월간 차트', () => {
  it('서버 행을 앱의 모양으로 옮긴다', () => {
    expect(standingFromRow({ week_end: TODAY, rank: 2, participants: 7, score: 1200, top_score: 1500 })).toEqual({
      weekEnd: TODAY, rank: 2, participants: 7, score: 1200, topScore: 1500,
    });
  });

  it('주마다 등수를 막대 높이로 바꾼다. 1등이 가장 높다', () => {
    const bars = weeklyBars([week(1, 10), week(10, 10)]);
    expect(bars[0]).toMatchObject({ value: 100, label: '상위 10%' });
    expect(bars[1]).toMatchObject({ value: 10, label: '상위 100%' });
  });

  it('겨룬 사람이 5명 미만이면 %가 아니라 등수로 적는다', () => {
    expect(weeklyBars([week(1, 1)])[0]).toMatchObject({ value: 100, label: '1명 중 1등' });
  });
});

describe('점수 설명 (TC-065)', () => {
  it('이번 주 번 냥에서 낸 이자와 지금 붙고 있는 이자를 뺀다', () => {
    const reps: Repayment[] = [
      { id: 'a', todoId: 'a', kind: 'repaid', title: 'x', principal: 3000, interest: 0, overdueDays: 0, settledOn: '2026-11-22' },
      { id: 'b', todoId: 'b', kind: 'forgiven', title: 'x', principal: 3000, interest: 630, overdueDays: 2, settledOn: '2026-11-21' },
      { id: 'c', todoId: 'c', kind: 'repaid', title: 'x', principal: 5000, interest: 0, overdueDays: 0, settledOn: '2026-11-16' },
    ];
    const todos: Todo[] = [{ id: 'd', title: 'x', importance: 3, dueDate: '2026-11-20', status: 'open' }];
    expect(scoreBreakdown(reps, todos, TODAY)).toEqual({ earned: 300, paid: 630, accruing: 993, total: 300 - 630 - 993 });
  });
});
