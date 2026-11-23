import { daysUntilDue, enqueue, QUEUE_LIMIT, sanitize, shouldLogOpen, type QueuedEvent } from '../events';

describe('사용 기록 (TC-053)', () => {
  it('정해진 키만 남긴다. 제목 같은 것은 버린다', () => {
    expect(sanitize('todo_create', { importance: 3, days_until_due: 2, title: '보고서 초안' } as never)).toEqual({ importance: 3, days_until_due: 2 });
  });

  it('글자 값은 40자로 자른다', () => {
    const long = 'x'.repeat(100);
    expect(String(sanitize('item_buy', { item_code: long, price: 1 }).item_code)).toHaveLength(40);
  });

  it('쌓아 두는 개수가 넘치면 오래된 것부터 버린다', () => {
    let q: QueuedEvent[] = [];
    for (let i = 0; i < QUEUE_LIMIT + 3; i++) q = enqueue(q, { event: 'app_open', props: {}, ts: String(i) });
    expect(q).toHaveLength(QUEUE_LIMIT);
    expect(q[0].ts).toBe('3');
  });

  it('앱 열기는 하루에 한 번만 남긴다', () => {
    expect(shouldLogOpen(null, '2026-11-23')).toBe(true);
    expect(shouldLogOpen('2026-11-23', '2026-11-23')).toBe(false);
    expect(shouldLogOpen('2026-11-22', '2026-11-23')).toBe(true);
  });

  it('기한까지 남은 날을 센다', () => {
    expect(daysUntilDue('2026-11-25', '2026-11-23')).toBe(2);
    expect(daysUntilDue('2026-11-23', '2026-11-23')).toBe(0);
  });
});
