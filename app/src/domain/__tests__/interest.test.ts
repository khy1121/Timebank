import { addDays, diffDays, formatKoreanDate, weekdayLabel } from '../dates';
import {
  capRatio,
  creditGrade,
  gradeTable,
  debtFor,
  formatAmount,
  gaugeFilled,
  gradeLevel,
  interestFor,
  nextDayInterest,
  overdueDays,
  principalOf,
  sortViews,
  summarize,
  todoState,
  viewOf,
  weekDays,
  type Importance,
  type Todo,
} from '../interest';

const TODAY = '2026-11-23'; // 월요일

const todo = (id: string, importance: Importance, dueDate: string, status: Todo['status'] = 'open'): Todo => ({
  id,
  title: id,
  importance,
  dueDate,
  status,
});

/** 화면설계서 9절의 홈 예시 */
const HOME: Todo[] = [
  todo('보고서 초안', 3, '2026-11-20'), // 연체 3일
  todo('병원 예약', 2, '2026-11-22'), // 연체 1일
  todo('책 반납', 1, '2026-11-23'), // 오늘까지
  todo('이력서 수정', 4, '2026-11-29'), // D-6
];

describe('날짜', () => {
  test('일수 차이와 더하기', () => {
    expect(diffDays('2026-11-20', '2026-11-23')).toBe(3);
    expect(diffDays('2026-11-23', '2026-11-23')).toBe(0);
    expect(addDays('2026-11-29', 7)).toBe('2026-12-06');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  test('요일과 표기', () => {
    expect(weekdayLabel('2026-11-23')).toBe('월');
    expect(formatKoreanDate('2026-11-20')).toBe('11월 20일 (금)');
  });
});

describe('원금 (TC-020)', () => {
  test('중요도 1~5 → 1,000~5,000냥', () => {
    expect([1, 2, 3, 4, 5].map((i) => principalOf(i as Importance))).toEqual([1000, 2000, 3000, 4000, 5000]);
  });
});

describe('이자 계산 (TC-021)', () => {
  test('데이터설계서 7절 검증 값', () => {
    expect(debtFor(3000, 0)).toBe(0);
    expect(debtFor(3000, 1)).toBe(3300);
    expect(debtFor(3000, 3)).toBe(3993);
    expect(interestFor(3000, 3)).toBe(993);
    expect(debtFor(1000, 24)).toBe(9849);
    expect(interestFor(1000, 24)).toBe(8849);
  });

  test('연체가 아니면 이자 0', () => {
    expect(interestFor(3000, 0)).toBe(0);
    expect(interestFor(3000, -5)).toBe(0);
    expect(overdueDays('2026-11-23', TODAY)).toBe(0);
    expect(overdueDays('2026-11-29', TODAY)).toBe(0);
  });

  test('버림은 마지막에 한 번만 한다', () => {
    // 하루씩 버리면 2,142가 되지만 한 번에 계산하면 2,143 (1000 × 1.1^8 = 2143.58…)
    expect(debtFor(1000, 8)).toBe(2143);
    expect(debtFor(3000, 4)).toBe(4392);
  });
});

describe('이자 상한 (TC-022)', () => {
  test('부채는 원금의 10배를 넘지 않는다', () => {
    expect(debtFor(1000, 25)).toBe(10000);
    expect(debtFor(1000, 26)).toBe(10000);
    expect(debtFor(1000, 3650)).toBe(10000);
    expect(debtFor(5000, 400)).toBe(50000);
  });
});

describe('이자 붙는 속도 (TC-028)', () => {
  test('내일 붙을 이자', () => {
    expect(nextDayInterest(3000, 3)).toBe(399);
    expect(nextDayInterest(2000, 1)).toBe(220);
    expect(nextDayInterest(3000, 0)).toBe(300); // 기한 당일: 내일부터 300냥
  });

  test('상한에 도달하면 더 붙지 않는다', () => {
    expect(nextDayInterest(1000, 25)).toBe(0);
    expect(nextDayInterest(1000, 24)).toBe(151); // 9,849 → 10,000
  });

  test('상한 대비 비율', () => {
    expect(Math.round(capRatio(3000, 3) * 100)).toBe(13);
    expect(capRatio(1000, 30)).toBe(1);
    expect(capRatio(1000, 0)).toBe(0);
  });
});

describe('기한 상태 (TC-019)', () => {
  test('연체 / 오늘까지 / 예정', () => {
    expect(todoState({ dueDate: '2026-11-22' }, TODAY)).toBe('overdue');
    expect(todoState({ dueDate: '2026-11-23' }, TODAY)).toBe('today');
    expect(todoState({ dueDate: '2026-11-24' }, TODAY)).toBe('upcoming');
  });

  test('자정이 지나면 오늘까지 → 연체 1일', () => {
    const v = viewOf(todo('a', 1, '2026-11-23'), '2026-11-24');
    expect(v.state).toBe('overdue');
    expect(v.overdueDays).toBe(1);
    expect(v.debt).toBe(1100);
  });
});

describe('신용등급 (TC-025, TC-029)', () => {
  test('구간 경계', () => {
    expect(creditGrade(0)).toBe(1);
    expect(creditGrade(1)).toBe(2);
    expect(creditGrade(999)).toBe(2);
    expect(creditGrade(1000)).toBe(3);
    expect(creditGrade(2999)).toBe(3);
    expect(creditGrade(3000)).toBe(4);
    expect(creditGrade(99999)).toBe(9);
    expect(creditGrade(100000)).toBe(10);
  });

  test('기준표는 화면설계서 6절과 같고 계산과 맞는다', () => {
    const table = gradeTable();
    expect(table).toHaveLength(10);
    expect(table[0]).toEqual({ grade: 1, label: '0냥' });
    expect(table[1]).toEqual({ grade: 2, label: '1,000냥 미만' });
    expect(table[8]).toEqual({ grade: 9, label: '100,000냥 미만' });
    expect(table[9]).toEqual({ grade: 10, label: '100,000냥 이상' });
  });

  test('게이지 칸 수와 색 구간', () => {
    expect(gaugeFilled(1)).toBe(10);
    expect(gaugeFilled(3)).toBe(8);
    expect(gaugeFilled(9)).toBe(2);
    expect(gradeLevel(3)).toBe('good');
    expect(gradeLevel(4)).toBe('warn');
    expect(gradeLevel(7)).toBe('warn');
    expect(gradeLevel(8)).toBe('bad');
  });
});

describe('홈 요약 (TC-023, TC-027)', () => {
  const s = summarize(HOME, TODAY);

  test('총 부채는 연체 항목만 더한다', () => {
    expect(s.totalDebt).toBe(6193); // 3,993 + 2,200
    expect(s.totalInterest).toBe(1193);
    expect(s.grade).toBe(3);
  });

  test('건수', () => {
    expect([s.overdueCount, s.todayCount, s.upcomingCount]).toEqual([2, 1, 1]);
  });

  test('미완료가 없으면 빚이 없고 1등급', () => {
    const none = summarize([todo('done', 3, '2026-11-01', 'repaid')], TODAY);
    expect(none.totalDebt).toBe(0);
    expect(none.grade).toBe(1);
  });

  test('상환·탕감한 할 일은 계산에서 빠진다', () => {
    const withDone = summarize([...HOME, todo('x', 5, '2026-11-01', 'repaid'), todo('y', 5, '2026-11-01', 'forgiven')], TODAY);
    expect(withDone.totalDebt).toBe(6193);
  });
});

describe('목록 정렬 (TC-014)', () => {
  test('연체(부채 큰 순) → 오늘까지 → 예정(기한 가까운 순)', () => {
    const extra = [...HOME, todo('세금 신고', 1, '2026-11-25'), todo('가벼운 연체', 1, '2026-11-21')];
    const order = sortViews(extra.map((t) => viewOf(t, TODAY))).map((v) => v.todo.id);
    expect(order).toEqual(['보고서 초안', '병원 예약', '가벼운 연체', '책 반납', '세금 신고', '이력서 수정']);
  });
});

describe('이번 주 기한 표시 (TC-018)', () => {
  test('오늘을 가운데 둔 7일, 지난 기한은 연체 점, 오늘 이후는 예정 점', () => {
    const w = weekDays(HOME, TODAY);
    expect(w.map((d) => d.date)).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
    ]);
    expect(w.map((d) => d.dot)).toEqual(['overdue', null, 'overdue', 'upcoming', null, null, null]);
    expect(w.filter((d) => d.isToday).map((d) => d.date)).toEqual([TODAY]);
  });
});

describe('금액 표기', () => {
  test('천 단위 구분 기호', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(993)).toBe('993');
    expect(formatAmount(3993)).toBe('3,993');
    expect(formatAmount(18416)).toBe('18,416');
    expect(formatAmount(1000000)).toBe('1,000,000');
  });
});
