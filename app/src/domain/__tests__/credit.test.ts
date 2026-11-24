import {
  boardFromRows,
  creditFromJson,
  gradeOf,
  gradeRange,
  GRADES,
  nextStep,
  partItems,
  signed,
  tagOf,
  titleOf,
  voiceLine,
} from '../credit';

const TODAY = '2026-11-24';

describe('등급과 칭호 (FR-098)', () => {
  it('구간 경계', () => {
    expect(gradeOf(1000).code).toBe('AAA');
    expect(gradeOf(950).code).toBe('AAA');
    expect(gradeOf(949).code).toBe('AA');
    expect(gradeOf(882).code).toBe('AA');
    expect(gradeOf(600).code).toBe('BB');
    expect(gradeOf(549).code).toBe('B');
    expect(gradeOf(150).code).toBe('CC');
    expect(gradeOf(149).code).toBe('D');
    expect(gradeOf(-5).code).toBe('D');
  });
  it('칭호 다섯 개, 파산 중이면 갓생 파산자', () => {
    expect(titleOf(882)).toBe('성실 우량주');
    expect(titleOf(438)).toBe('성실 불량주');
    expect(titleOf(882, true)).toBe('갓생 파산자');
    expect(new Set(GRADES.map((g) => g.title)).size).toBe(5);
  });
  it('등급 범위', () => {
    expect(gradeRange('AAA')).toEqual({ min: 950, max: 1000 });
    expect(gradeRange('BB')).toEqual({ min: 550, max: 649 });
    expect(gradeRange('D')).toEqual({ min: 0, max: 149 });
  });
  it('다음 등급까지', () => {
    expect(nextStep(882)).toMatchObject({ next: 'AAA', points: 68 });
    expect(nextStep(438)).toMatchObject({ next: 'BB', points: 112 });
    expect(nextStep(975).next).toBe(null);
    expect(nextStep(550).progress).toBe(0);
  });
  it('말투', () => {
    expect(voiceLine(882, 'spicy')).toContain('삐끗');
    expect(voiceLine(882, 'mild')).toContain('AAA');
  });
});

describe('꼬리표 (FR-099)', () => {
  const base = { lastActive: TODAY, weekDelta: 0, joinedOn: '2026-10-01' };
  it('3일 넘게 안 들어오면 관찰 대상이 먼저', () => {
    expect(tagOf({ ...base, lastActive: '2026-11-20', weekDelta: 80 }, TODAY)).toBe('관찰 대상');
    expect(tagOf({ ...base, lastActive: '2026-11-21' }, TODAY)).toBe(null);
  });
  it('7일 동안 30점 넘게 오르내리면 전망', () => {
    expect(tagOf({ ...base, weekDelta: -31 }, TODAY)).toBe('전망: 부정적');
    expect(tagOf({ ...base, weekDelta: 31 }, TODAY)).toBe('전망: 긍정적');
    expect(tagOf({ ...base, weekDelta: 30 }, TODAY)).toBe(null);
  });
  it('가입 7일 안이면 신규 고객', () => {
    expect(tagOf({ ...base, joinedOn: '2026-11-20' }, TODAY)).toBe('신규 고객');
    expect(tagOf({ ...base, joinedOn: '2026-11-17' }, TODAY)).toBe(null);
  });
});

describe('서버 값', () => {
  it('my_credit 결과를 읽는다', () => {
    const c = creditFromJson({
      score: 882, confirmed: 870, week_delta: 84, rank: 3, participants: 23,
      week: [{ day: '2026-11-24', delta: 12 }], weeks: [{ week_end: '2026-11-24', score: 882 }],
      week_parts: { on_time: 79, late_done: 0, verified: 5, streak: 0, overdue: 0, give_up: 0, idle: 0 },
      last_active: TODAY, joined_on: '2026-11-01',
    });
    expect(c).toMatchObject({ score: 882, confirmed: 870, weekDelta: 84, rank: 3, participants: 23 });
    expect(c!.week).toEqual([{ day: '2026-11-24', delta: 12 }]);
    expect(c!.weekParts.verified).toBe(5);
    expect(creditFromJson(null)).toBe(null);
  });
  it('이번 주 내역 한 줄', () => {
    expect(partItems({ onTime: 32, lateDone: 0, verified: 0, streak: 0, overdue: 70, giveUp: 0, idle: 24 })).toEqual([
      { label: '끝냄', value: 32 },
      { label: '연체', value: -70 },
      { label: '안 들어옴', value: -24 },
    ]);
  });
  it('부호', () => {
    expect(signed(84)).toBe('+84');
    expect(signed(-62)).toBe('−62');
    expect(signed(0)).toBe('0');
  });
  it('순위표 행', () => {
    expect(boardFromRows([{ rank: 1, name: '준*', score: 968, week_delta: 5, is_me: false }])).toEqual([
      { rank: 1, userId: null, name: '준*', score: 968, weekDelta: 5, isMe: false, nameplate: 'none' },
    ]);
  });
});
