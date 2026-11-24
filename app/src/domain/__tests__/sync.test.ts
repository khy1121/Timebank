import {
  isUuid,
  latestUpdatedAt,
  mergeRows,
  repaymentFromRow,
  repaymentToParams,
  ledgerEventFromRow,
  ledgerEventToParams,
  splitLedgerEvents,
  todoFromRow,
  todoToParams,
  visible,
  type StoredTodo,
} from '../sync';

const row = (id: string, title: string, updatedAt: string, deletedAt: string | null = null): StoredTodo => ({
  id,
  title,
  importance: 3,
  dueDate: '2026-11-25',
  status: 'open',
  updatedAt,
  deletedAt,
});

describe('행 합치기 (TC-042)', () => {
  test('서버에만 있는 행은 받아 온다', () => {
    const merged = mergeRows([row('a', '기기', '2026-11-23T01:00:00Z')], [row('b', '서버', '2026-11-23T02:00:00Z')]);
    expect(merged.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  test('수정 시각이 늦은 쪽이 이긴다', () => {
    const local = [row('a', '기기에서 고침', '2026-11-23T03:00:00Z')];
    expect(mergeRows(local, [row('a', '서버의 옛 값', '2026-11-23T02:00:00Z')])[0].title).toBe('기기에서 고침');
    expect(mergeRows(local, [row('a', '서버의 새 값', '2026-11-23T04:00:00Z')])[0].title).toBe('서버의 새 값');
  });

  test('시각이 같으면 기기 쪽을 둔다', () => {
    const merged = mergeRows([row('a', '기기', '2026-11-23T03:00:00Z')], [row('a', '서버', '2026-11-23T03:00:00.000Z')]);
    expect(merged[0].title).toBe('기기');
  });

  test('시간대 표기가 달라도 같은 순간으로 비교한다', () => {
    // 서버는 +00:00, 기기는 Z로 적는다
    const merged = mergeRows([row('a', '기기', '2026-11-23T03:00:00.000Z')], [row('a', '서버', '2026-11-23T12:30:00+09:00')]);
    expect(merged[0].title).toBe('서버');
  });

  test('서버에서 삭제된 행은 삭제 표시가 넘어온다', () => {
    const merged = mergeRows(
      [row('a', '할 일', '2026-11-23T01:00:00Z')],
      [row('a', '할 일', '2026-11-23T02:00:00Z', '2026-11-23T02:00:00Z')],
    );
    expect(visible(merged)).toEqual([]);
  });
});

describe('다음에 받을 기준 시각', () => {
  test('가장 늦은 수정 시각', () => {
    const rows = [row('a', '', '2026-11-23T01:00:00Z'), row('b', '', '2026-11-23T05:00:00Z')];
    expect(latestUpdatedAt(rows, null)).toBe('2026-11-23T05:00:00Z');
    expect(latestUpdatedAt(rows, '2026-11-23T09:00:00Z')).toBe('2026-11-23T09:00:00Z');
    expect(latestUpdatedAt([], null)).toBeNull();
  });
});

describe('ID 형식', () => {
  test('UUID만 서버에 올릴 수 있다', () => {
    expect(isUuid('3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b')).toBe(true);
    expect(isUuid('sample-1')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});

describe('서버 행 변환', () => {
  test('할 일: 받아서 다시 보내면 같은 값', () => {
    const server = {
      id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
      title: '보고서 초안',
      importance: 3,
      due_date: '2026-11-20',
      status: 'open',
      updated_at: '2026-11-23T01:00:00+00:00',
      deleted_at: null,
    };
    const todo = todoFromRow(server);
    expect(todo.dueDate).toBe('2026-11-20');
    expect(todoToParams(todo)).toEqual({
      p_id: server.id,
      p_title: '보고서 초안',
      p_importance: 3,
      p_due_date: '2026-11-20',
      p_status: 'open',
      p_updated_at: '2026-11-23T01:00:00+00:00',
      p_deleted_at: null,
      p_created_at: null,
      p_stake_group_id: null,
      p_repeat: null,
      p_repeat_from: null,
    });
  });

  test('할 일: 등록 시각과 보증금 그룹을 주고받는다 (시간 적금)', () => {
    const todo = todoFromRow({
      id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
      title: '운동',
      importance: 2,
      due_date: '2026-11-20',
      status: 'open',
      updated_at: '2026-11-23T01:00:00+00:00',
      deleted_at: null,
      created_at: '2026-11-22T10:00:00+00:00',
      stake_group_id: '7a62b5f5-2171-478f-a69c-910f89ee0c74',
    });
    expect(todo.createdAt).toBe('2026-11-22T10:00:00+00:00');
    expect(todoToParams(todo)).toMatchObject({ p_created_at: '2026-11-22T10:00:00+00:00', p_stake_group_id: '7a62b5f5-2171-478f-a69c-910f89ee0c74' });
  });

  test('장부 사건: 받아서 다시 보내고, 계산용으로 나눈다', () => {
    const rows = [
      { id: 'e1', kind: 'extend', todo_id: 't1', days: 3, amount: 450, happened_on: '2026-11-03', updated_at: '2026-11-03T00:00:00Z', deleted_at: null },
      { id: 'e2', kind: 'bankrupt', todo_id: null, days: null, amount: 0, happened_on: '2026-11-10', updated_at: '2026-11-10T00:00:00Z', deleted_at: null },
      { id: 'e3', kind: 'payout', todo_id: null, days: null, amount: 1500, happened_on: '2026-11-09', updated_at: '2026-11-09T00:00:00Z', deleted_at: null },
    ];
    const events = rows.map(ledgerEventFromRow);
    expect(ledgerEventToParams(events[0])).toEqual({
      p_id: 'e1', p_kind: 'extend', p_todo_id: 't1', p_days: 3, p_amount: 450, p_happened_on: '2026-11-03', p_updated_at: '2026-11-03T00:00:00Z', p_deleted_at: null,
    });
    expect(splitLedgerEvents(events)).toEqual({
      extensions: [{ id: 'e1', todoId: 't1', days: 3, fee: 450, on: '2026-11-03' }],
      bankruptcies: [{ id: 'e2', on: '2026-11-10' }],
      payouts: [{ id: 'e3', amount: 1500, on: '2026-11-09' }],
    });
  });

  test('상환 기록: 받아서 다시 보내면 같은 값', () => {
    const server = {
      id: '11111111-1111-4111-8111-111111111111',
      todo_id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
      kind: 'repaid',
      title: '보고서 초안',
      principal: 3000,
      interest: 993,
      overdue_days: 3,
      settled_on: '2026-11-23',
      updated_at: '2026-11-23T01:00:00+00:00',
      deleted_at: null,
    };
    const r = repaymentFromRow(server);
    expect(r.todoId).toBe(server.todo_id);
    expect(r.overdueDays).toBe(3);
    expect(repaymentToParams(r).p_settled_on).toBe('2026-11-23');
    expect(repaymentToParams(r).p_interest).toBe(993);
  });
});
