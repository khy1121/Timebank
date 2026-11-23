/**
 * 사용자 설정(profiles 테이블). (FR-032, FR-050, FR-054)
 * 코드값은 코드정의서 2.6절과 같다.
 */

export type SignupSource = 'friend' | 'store' | 'sns' | 'etc' | 'unknown';

export type Profile = {
  notifyEnabled: boolean;
  /** 알림 시각. 'HH:MM', 기기의 현지 시각 */
  notifyTime: string;
  /** 첫 실행 안내를 마친 일시. 아직이면 null */
  onboardedAt: string | null;
  signupSource: SignupSource;
};

export type ProfileRow = {
  notify_enabled: boolean;
  notify_time: string;
  onboarded_at: string | null;
  signup_source: string;
};

export const DEFAULT_NOTIFY_TIME = '09:00';

/** 고를 수 있는 알림 시각 */
export const NOTIFY_TIMES = ['07:00', '08:00', '09:00', '12:00', '18:00', '21:00'] as const;

export const SOURCE_OPTIONS: { code: Exclude<SignupSource, 'unknown'>; label: string }[] = [
  { code: 'friend', label: '지인 소개' },
  { code: 'store', label: '스토어 검색' },
  { code: 'sns', label: 'SNS' },
  { code: 'etc', label: '기타' },
];

const SOURCES: SignupSource[] = ['friend', 'store', 'sns', 'etc', 'unknown'];

/** 'HH:MM' 또는 'HH:MM:SS'를 시와 분으로. 형식이 틀리면 기본 시각. */
export function parseTime(value: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  const hour = match ? Number(match[1]) : NaN;
  const minute = match ? Number(match[2]) : NaN;
  if (!(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59)) return parseTime(DEFAULT_NOTIFY_TIME);
  return { hour, minute };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 서버의 '09:00:00'을 '09:00'으로 맞춘다. */
export function normalizeTime(value: string): string {
  const { hour, minute } = parseTime(value);
  return `${pad(hour)}:${pad(minute)}`;
}

/** 화면에 보여줄 시각. 예: '09:00' → '오전 9시', '18:30' → '오후 6시 30분' */
export function formatTimeLabel(value: string): string {
  const { hour, minute } = parseTime(value);
  const half = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${half} ${hour12}시` : `${half} ${hour12}시 ${minute}분`;
}

export function profileFromRow(row: ProfileRow): Profile {
  return {
    notifyEnabled: row.notify_enabled,
    notifyTime: normalizeTime(row.notify_time),
    onboardedAt: row.onboarded_at,
    signupSource: SOURCES.includes(row.signup_source as SignupSource) ? (row.signup_source as SignupSource) : 'unknown',
  };
}

/** 바꾼 항목만 서버 컬럼 이름으로 옮긴다. */
export function profilePatchToRow(patch: Partial<Profile>): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {};
  if (patch.notifyEnabled !== undefined) row.notify_enabled = patch.notifyEnabled;
  if (patch.notifyTime !== undefined) row.notify_time = normalizeTime(patch.notifyTime);
  if (patch.onboardedAt !== undefined) row.onboarded_at = patch.onboardedAt;
  if (patch.signupSource !== undefined) row.signup_source = patch.signupSource;
  return row;
}

/** 첫 실행 안내를 보여줘야 하는가. 설정을 아직 읽지 못했으면 보여주지 않는다. */
export function needsOnboarding(profile: Profile | null): boolean {
  return profile !== null && profile.onboardedAt === null;
}
