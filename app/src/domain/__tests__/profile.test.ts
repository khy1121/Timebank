import {
  formatTimeLabel,
  needsOnboarding,
  normalizeTime,
  parseTime,
  profileFromRow,
  profilePatchToRow,
  type Profile,
} from '../profile';

const profile = (over: Partial<Profile> = {}): Profile => ({
  notifyEnabled: true,
  notifyTime: '09:00',
  onboardedAt: null,
  signupSource: 'unknown',
  equipped: {},
  voice: 'spicy',
  signupDate: null,
  pushFriends: true,
  nameplate: 'none',
  ...over,
});

describe('알림 시각 (TC-032)', () => {
  it("서버의 '09:00:00'을 시와 분으로 읽는다", () => {
    expect(parseTime('09:00:00')).toEqual({ hour: 9, minute: 0 });
    expect(normalizeTime('21:30:00')).toBe('21:30');
  });

  it('형식이 틀리면 기본 시각 오전 9시로 읽는다', () => {
    expect(parseTime('')).toEqual({ hour: 9, minute: 0 });
    expect(parseTime('25:00')).toEqual({ hour: 9, minute: 0 });
  });

  it('화면에는 오전·오후로 보여준다', () => {
    expect(formatTimeLabel('09:00')).toBe('오전 9시');
    expect(formatTimeLabel('12:00')).toBe('오후 12시');
    expect(formatTimeLabel('00:00')).toBe('오전 12시');
    expect(formatTimeLabel('18:30')).toBe('오후 6시 30분');
  });
});

describe('사용자 설정 변환', () => {
  it('서버 행을 앱의 모양으로 옮긴다', () => {
    expect(
      profileFromRow({ notify_enabled: false, notify_time: '18:00:00', onboarded_at: null, signup_source: 'sns' }),
    ).toEqual({ notifyEnabled: false, notifyTime: '18:00', onboardedAt: null, signupSource: 'sns', equipped: {}, voice: 'spicy', signupDate: null, pushFriends: true, nameplate: 'none' });
    expect(profileFromRow({ notify_enabled: true, notify_time: '09:00', onboarded_at: null, signup_source: 'sns', push_friends: false }).pushFriends).toBe(false);
  });

  it('모르는 유입 경로는 unknown으로 읽는다', () => {
    const row = { notify_enabled: true, notify_time: '09:00:00', onboarded_at: null, signup_source: 'tv' };
    expect(profileFromRow(row).signupSource).toBe('unknown');
  });

  it('바꾼 항목만 서버 컬럼으로 옮긴다', () => {
    expect(profilePatchToRow({ notifyEnabled: false })).toEqual({ notify_enabled: false });
    expect(profilePatchToRow({ pushFriends: false })).toEqual({ push_friends: false });
    expect(profilePatchToRow({ onboardedAt: '2026-11-23T00:00:00.000Z', signupSource: 'friend' })).toEqual({
      onboarded_at: '2026-11-23T00:00:00.000Z',
      signup_source: 'friend',
    });
  });
});

describe('첫 실행 안내를 보여줄지 (TC-050)', () => {
  it('안내를 마친 적이 없으면 보여준다', () => {
    expect(needsOnboarding(profile())).toBe(true);
  });

  it('마쳤으면 보여주지 않는다', () => {
    expect(needsOnboarding(profile({ onboardedAt: '2026-11-23T00:00:00.000Z' }))).toBe(false);
  });

  it('설정을 아직 읽지 못했으면 보여주지 않는다', () => {
    expect(needsOnboarding(null)).toBe(false);
  });
});

describe('착용한 물건 읽기', () => {
  it('서버 값에서 칸 이름과 문자열 값만 읽는다', () => {
    const row = {
      notify_enabled: true,
      notify_time: '09:00:00',
      onboarded_at: null,
      signup_source: 'unknown',
      equipped: { stampInk: 'ink-blue', bubble: 3, hat: 'x' },
    };
    expect(profileFromRow(row).equipped).toEqual({ stampInk: 'ink-blue' });
  });

  it('바꾼 착용 정보를 그대로 올린다', () => {
    expect(profilePatchToRow({ equipped: { stampWord: 'word-choego' } })).toEqual({ equipped: { stampWord: 'word-choego' } });
  });
});

describe('말투와 가입일', () => {
  it('말투는 mild가 아니면 매운맛으로 읽는다', () => {
    const row = { notify_enabled: true, notify_time: '09:00:00', onboarded_at: null, signup_source: 'unknown' };
    expect(profileFromRow({ ...row, voice: 'mild' }).voice).toBe('mild');
    expect(profileFromRow({ ...row, voice: 'loud' }).voice).toBe('spicy');
    expect(profileFromRow(row).voice).toBe('spicy');
  });

  it('바꾼 말투를 그대로 올린다', () => {
    expect(profilePatchToRow({ voice: 'mild' })).toEqual({ voice: 'mild' });
  });

  it('가입 일시를 날짜로 읽는다', () => {
    const row = { notify_enabled: true, notify_time: '09:00:00', onboarded_at: null, signup_source: 'unknown', created_at: '2026-11-20T03:00:00Z' };
    expect(profileFromRow(row).signupDate).toMatch(/^2026-11-2[01]$/);
  });
});
