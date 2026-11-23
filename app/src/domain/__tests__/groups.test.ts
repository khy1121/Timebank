import {
  base64ToBytes,
  canPostProof,
  codeFromText,
  groupErrorMessage,
  groupNameError,
  hoursLeft,
  isCompleteCode,
  nicknameError,
  normalizeCode,
  photoPath,
  proofBonus,
  proofNote,
  proofState,
  timeAgo,
  toStatusCode,
  withVote,
  type Proof,
} from '../groups';

const T0 = '2026-11-23T00:00:00.000Z';
const at = (hours: number) => new Date(Date.parse(T0) + hours * 3600_000);

describe('초대 코드', () => {
  it('소문자와 쓰지 않는 글자를 정리하고 6자로 자른다', () => {
    expect(normalizeCode('k7q-2m9x')).toBe('K7Q2M9');
    expect(normalizeCode('o0i1l')).toBe('');
  });
  it('6자를 다 채워야 완성이다', () => {
    expect(isCompleteCode('K7Q2M9')).toBe(true);
    expect(isCompleteCode('K7Q2M')).toBe(false);
    expect(isCompleteCode('K7Q2M0')).toBe(false);
  });
  it('링크나 메시지에서 코드를 찾는다', () => {
    expect(codeFromText('todointerest://group-join?code=k7q2m9')).toBe('K7Q2M9');
    expect(codeFromText('초대 코드는 K7Q2M9예요')).toBe('K7Q2M9');
    expect(codeFromText('코드 없음')).toBeNull();
  });
});

describe('이름과 별명', () => {
  it('비었거나 길면 알려준다', () => {
    expect(groupNameError('  ')).toBe('그룹 이름을 적어 주세요');
    expect(groupNameError('가'.repeat(21))).toContain('20자');
    expect(groupNameError(' 스터디 ')).toBeNull();
    expect(nicknameError('')).toBe('별명을 적어 주세요');
    expect(nicknameError('가'.repeat(11))).toContain('10자');
    expect(nicknameError('헌영')).toBeNull();
  });
});

describe('인증 상태 (서버 proof_state와 같은 규칙)', () => {
  it('인정이 의심보다 많으면 바로 통과', () => {
    expect(proofState(T0, 1, 0, at(1))).toBe('passed');
    expect(proofState(T0, 2, 1, at(1))).toBe('passed');
  });
  it('24시간 안에는 대기', () => {
    expect(proofState(T0, 0, 0, at(23.9))).toBe('pending');
    expect(proofState(T0, 1, 1, at(5))).toBe('pending');
  });
  it('24시간이 지나면 의심이 없을 때만 통과', () => {
    expect(proofState(T0, 0, 0, at(24))).toBe('passed');
    expect(proofState(T0, 1, 1, at(24))).toBe('rejected');
    expect(proofState(T0, 0, 1, at(30))).toBe('rejected');
  });
  it('남은 시간은 올림하고 지나면 0', () => {
    expect(hoursLeft(T0, at(1.5))).toBe(23);
    expect(hoursLeft(T0, at(24))).toBe(0);
  });
  it('상환 뒤 24시간 안에만 올릴 수 있다', () => {
    expect(canPostProof(T0, at(23))).toBe(true);
    expect(canPostProof(T0, at(24))).toBe(false);
  });
});

describe('보너스와 문구', () => {
  it('기한 안 상환만 보상의 절반을 더 받는다', () => {
    expect(proofBonus(3000, true)).toBe(150);
    expect(proofBonus(1000, true)).toBe(50);
    expect(proofBonus(3000, false)).toBe(0);
  });
  const base = { createdAt: T0, doubts: 0, onTime: true, principal: 3000, hidden: false };
  it('상태마다 한 줄 설명', () => {
    expect(proofNote({ ...base, state: 'passed' }, at(1))).toBe('+150냥 보너스');
    expect(proofNote({ ...base, state: 'passed', onTime: false }, at(1))).toBe('통과했어요');
    expect(proofNote({ ...base, state: 'pending' }, at(2))).toBe('자동 통과까지 22시간');
    expect(proofNote({ ...base, state: 'pending', doubts: 1 }, at(2))).toBe('22시간 안에 인정이 의심보다 많아야 해요');
    expect(proofNote({ ...base, state: 'rejected' }, at(30))).toBe('그룹 순위에 세지 않아요');
    expect(proofNote({ ...base, state: 'passed', hidden: true }, at(1))).toContain('숨겨졌어요');
  });
  it('지난 시간', () => {
    expect(timeAgo(T0, at(0))).toBe('방금 전');
    expect(timeAgo(T0, at(0.5))).toBe('30분 전');
    expect(timeAgo(T0, at(2))).toBe('2시간 전');
    expect(timeAgo(T0, at(30))).toBe('어제');
    expect(timeAgo(T0, at(72))).toBe('3일 전');
  });
  it('서버 이유를 문구로 바꾸고 모르는 것은 기본 문구', () => {
    expect(groupErrorMessage({ hint: 'group_full' }, 'x')).toContain('꽉 찼어요');
    expect(groupErrorMessage({ hint: 'weird' }, '다시 해 주세요')).toBe('다시 해 주세요');
    expect(groupErrorMessage(null, '다시')).toBe('다시');
  });
  it('모르는 상태 코드는 버린다', () => {
    expect(toStatusCode('diligent')).toBe('diligent');
    expect(toStatusCode('hacker')).toBeNull();
    expect(toStatusCode(null)).toBeNull();
  });
});

describe('투표 바꾸기', () => {
  const p: Proof = {
    id: 'p', userId: 'u', nickname: '민지', isMine: false, todoTitle: 't', caption: '', photoPath: '',
    createdAt: T0, approvals: 1, doubts: 0, myVote: null, hidden: false, onTime: true, principal: 3000,
  };
  it('새로 인정하고, 의심으로 바꾸고, 거둔다', () => {
    const a = withVote(p, 'approve');
    expect([a.approvals, a.doubts, a.myVote]).toEqual([2, 0, 'approve']);
    const d = withVote(a, 'doubt');
    expect([d.approvals, d.doubts, d.myVote]).toEqual([1, 1, 'doubt']);
    const n = withVote(d, null);
    expect([n.approvals, n.doubts, n.myVote]).toEqual([1, 0, null]);
  });
});

describe('사진', () => {
  it('경로는 그룹/사람/인증.jpg', () => {
    expect(photoPath('g', 'u', 'p')).toBe('g/u/p.jpg');
  });
  it('base64를 바이트로 바꾼다', () => {
    expect(Array.from(base64ToBytes('aGk='))).toEqual([104, 105]);
    expect(Array.from(base64ToBytes('data:image/jpeg;base64,/9j/'))).toEqual([255, 216, 255]);
    expect(Array.from(base64ToBytes('YWJj'))).toEqual([97, 98, 99]);
  });
});
