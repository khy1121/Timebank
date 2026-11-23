import type { Importance, Todo } from '../interest';
import {
  canChangeDueDate,
  groupByMonth,
  historySummary,
  interestHistory,
  settle,
  validateInput,
  type Repayment,
} from '../records';

const TODAY = '2026-11-23';

const todo = (id: string, importance: Importance, dueDate: string): Todo => ({
  id,
  title: id,
  importance,
  dueDate,
  status: 'open',
});

describe('상환·탕감 기록 (TC-015, TC-024)', () => {
  test('상환 시점의 원금·이자·연체 일수를 남긴다', () => {
    const r = settle(todo('보고서 초안', 3, '2026-11-20'), 'repaid', TODAY, 'r1');
    expect(r).toEqual({
      id: 'r1',
      todoId: '보고서 초안',
      kind: 'repaid',
      title: '보고서 초안',
      principal: 3000,
      interest: 993,
      overdueDays: 3,
      settledOn: TODAY,
    });
  });

  test('기한 전에 끝내면 이자 0', () => {
    const r = settle(todo('a', 2, '2026-11-25'), 'repaid', TODAY, 'r2');
    expect(r.interest).toBe(0);
    expect(r.overdueDays).toBe(0);
  });

  test('탕감도 그 시점의 금액을 남긴다', () => {
    const r = settle(todo('헬스장 등록', 3, '2026-11-19'), 'forgiven', TODAY, 'r3');
    expect(r.kind).toBe('forgiven');
    expect(r.principal + r.interest).toBe(4392);
  });
});

describe('입력 검사 (TC-010, TC-012)', () => {
  const ok = { title: '세금 신고 자료 정리', importance: 3 as Importance, dueDate: '2026-11-24' };

  test('정상 입력', () => {
    expect(validateInput(ok, TODAY)).toEqual([]);
    expect(validateInput({ ...ok, dueDate: TODAY }, TODAY)).toEqual([]);
  });

  test('제목이 비었거나 공백뿐이면 오류', () => {
    expect(validateInput({ ...ok, title: '   ' }, TODAY)).toEqual(['titleRequired']);
  });

  test('제목 100자까지 허용, 101자는 오류', () => {
    expect(validateInput({ ...ok, title: '가'.repeat(100) }, TODAY)).toEqual([]);
    expect(validateInput({ ...ok, title: '가'.repeat(101) }, TODAY)).toEqual(['titleTooLong']);
  });

  test('오늘 이전 기한은 오류', () => {
    expect(validateInput({ ...ok, dueDate: '2026-11-22' }, TODAY)).toEqual(['dueInPast']);
  });

  test('수정에서 지난 기한을 그대로 두는 것은 허용', () => {
    const original = todo('보고서 초안', 3, '2026-11-20');
    expect(validateInput({ title: '보고서 초안 v2', importance: 4, dueDate: '2026-11-20' }, TODAY, original)).toEqual([]);
  });

  test('연체된 할 일은 기한을 바꿀 수 없다', () => {
    expect(canChangeDueDate(todo('a', 1, '2026-11-22'), TODAY)).toBe(false);
    expect(canChangeDueDate(todo('b', 1, '2026-11-23'), TODAY)).toBe(true);
    expect(canChangeDueDate(todo('c', 1, '2026-11-30'), TODAY)).toBe(true);
  });
});

describe('이자가 붙은 날 (화면설계서 TI-SCR-05)', () => {
  test('원금 3,000냥, 연체 3일', () => {
    expect(interestHistory(3000, 3)).toEqual([
      { day: 1, added: 300, total: 3300, future: false },
      { day: 2, added: 330, total: 3630, future: false },
      { day: 3, added: 363, total: 3993, future: false },
      { day: 4, added: 399, total: 4392, future: true },
    ]);
  });

  test('연체가 아니면 비어 있다', () => {
    expect(interestHistory(3000, 0)).toEqual([]);
  });

  test('오래 연체되면 최근 7일과 내일만', () => {
    const rows = interestHistory(1000, 12);
    expect(rows.map((r) => r.day)).toEqual([6, 7, 8, 9, 10, 11, 12, 13]);
    expect(rows[rows.length - 1].future).toBe(true);
  });

  test('상한에 닿으면 내일 줄이 없다', () => {
    const rows = interestHistory(1000, 25);
    expect(rows.every((r) => !r.future)).toBe(true);
    expect(rows[rows.length - 1].total).toBe(10000);
  });
});

describe('상환 내역 (TC-017)', () => {
  const rec = (id: string, kind: Repayment['kind'], interest: number, settledOn: string): Repayment => ({
    id,
    todoId: id,
    kind,
    title: id,
    principal: 1000,
    interest,
    overdueDays: 0,
    settledOn,
  });
  const records = [
    rec('장보기', 'repaid', 0, '2026-11-18'),
    rec('병원 예약', 'repaid', 200, '2026-11-22'),
    rec('헬스장 등록', 'forgiven', 1392, '2026-11-19'),
    rec('여권 갱신', 'repaid', 630, '2026-10-28'),
    rec('작년 일', 'repaid', 10, '2025-12-30'),
  ];

  test('낸 이자 합계에 탕감은 넣지 않는다', () => {
    expect(historySummary(records)).toEqual({ paidInterest: 840, repaidCount: 4, forgivenCount: 1 });
  });

  test('최근 순으로 월별 묶음', () => {
    const groups = groupByMonth(records, TODAY);
    expect(groups.map((g) => g.label)).toEqual(['11월', '10월', '2025년 12월']);
    expect(groups[0].records.map((r) => r.title)).toEqual(['병원 예약', '헬스장 등록', '장보기']);
  });
});
