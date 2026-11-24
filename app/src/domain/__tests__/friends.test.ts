import {
  activityLine,
  daysSince,
  displayNameError,
  friendErrorMessage,
  friendFromRow,
  friendShareMessage,
  requestFromRow,
  requestOrigin,
  sendResultMessage,
  sortFriends,
  toFriendState,
  toSendResult,
  type Friend,
} from '../friends';

const TODAY = '2026-11-24';

function friend(name: string, lastActive: string | null, doneWeek = 0, overdueNow = 0): Friend {
  return { userId: name, name, since: '2026-11-01T00:00:00Z', doneWeek, overdueNow, lastActive };
}

describe('표시 이름 (FR-103)', () => {
  it('비었거나 10자를 넘으면 이유를 알려 준다', () => {
    expect(displayNameError('  ')).toBe('이름을 적어 주세요');
    expect(displayNameError('열한글자이름입니다요')).toBe(null);
    expect(displayNameError('열한글자를넘는이름입니다')).toBe('10자까지 적을 수 있어요');
    expect(displayNameError(' 헌영 ')).toBe(null);
  });
});

describe('활동 한 줄 (FR-106)', () => {
  it('연체가 있으면 연체를 먼저 보여 준다', () => {
    expect(activityLine(friend('a', TODAY, 3, 2), TODAY)).toEqual({ text: '연체 2건', tone: 'bad' });
  });
  it('3일 넘게 안 들어왔으면 조용하다고 한다', () => {
    expect(activityLine(friend('a', '2026-11-20', 5), TODAY)).toEqual({ text: '4일째 조용해요', tone: 'warn' });
  });
  it('이번 주에 끝낸 일이 있으면 그 수', () => {
    expect(activityLine(friend('a', '2026-11-23', 3), TODAY)).toEqual({ text: '이번 주 3건 끝냄', tone: 'ok' });
  });
  it('기록이 없거나 들어오기만 했을 때', () => {
    expect(activityLine(friend('a', null), TODAY).text).toBe('아직 기록이 없어요');
    expect(activityLine(friend('a', TODAY), TODAY).text).toBe('오늘 들어옴');
    expect(activityLine(friend('a', '2026-11-22'), TODAY).text).toBe('2일 전 들어옴');
  });
});

describe('정렬', () => {
  const list = [friend('서연', '2026-11-20'), friend('가람', TODAY), friend('준호', TODAY), friend('민지', null)];
  it('최근 활동순: 최근에 들어온 사람이 위, 같으면 이름 순, 기록 없는 사람은 맨 아래', () => {
    expect(sortFriends(list, 'active').map((f) => f.name)).toEqual(['가람', '준호', '서연', '민지']);
  });
  it('이름 순', () => {
    expect(sortFriends(list, 'name').map((f) => f.name)).toEqual(['가람', '민지', '서연', '준호']);
  });
});

describe('신청 (FR-105)', () => {
  it('어디서 온 신청인지', () => {
    expect(requestOrigin({ via: 'group', commonGroup: '스터디 4인방' })).toBe('같은 그룹: 스터디 4인방');
    expect(requestOrigin({ via: 'code', commonGroup: null })).toBe('친구 코드로 신청');
    expect(requestOrigin({ via: 'kakao', commonGroup: null })).toBe('카카오톡 친구');
  });
  it('결과 문구', () => {
    expect(sendResultMessage('friends')).toBe('친구가 됐어요');
    expect(sendResultMessage('not_found')).toContain('코드를 다시 확인');
    expect(toSendResult('friends')).toBe('friends');
    expect(toSendResult('이상한 값')).toBe('sent');
  });
  it('서버 이유를 문구로', () => {
    expect(friendErrorMessage({ hint: 'friend_self' }, '실패')).toBe('내 친구 코드예요');
    expect(friendErrorMessage({ hint: 'friend_limit' }, '실패')).toBe('친구는 50명까지 둘 수 있어요');
    expect(friendErrorMessage({ hint: '모르는 것' }, '실패')).toBe('실패');
    expect(friendErrorMessage(null, '실패')).toBe('실패');
  });
});

describe('서버 행', () => {
  it('친구와 신청을 앱 모양으로', () => {
    expect(friendFromRow({ user_id: 'u', name: '준호', since: 's', done_week: 3, overdue_now: 1, last_active: TODAY })).toEqual({
      userId: 'u', name: '준호', since: 's', doneWeek: 3, overdueNow: 1, lastActive: TODAY,
    });
    expect(requestFromRow({ id: 'r', user_id: 'u', name: '지우', via: '???', incoming: true, created_at: 'c', common_group: null }).via).toBe('code');
    expect(toFriendState('sent')).toBe('sent');
    expect(toFriendState(null)).toBe('none');
  });
});

describe('그 밖', () => {
  it('친구가 된 지 며칠째', () => {
    expect(daysSince('2026-11-24T03:00:00Z', TODAY)).toBe(1);
    expect(daysSince('2026-11-02T03:00:00Z', TODAY)).toBe(23);
  });
  it('공유 문구에 코드와 링크', () => {
    const m = friendShareMessage('HY8K2Q', 'todointerest://friends?code=HY8K2Q');
    expect(m).toContain('HY8K2Q');
    expect(m).toContain('todointerest://friends?code=HY8K2Q');
  });
});
