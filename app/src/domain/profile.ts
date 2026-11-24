import type { Equipped } from './shop';
import type { Voice } from './standing';

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
  /** 칸마다 착용한 상점 물건 코드 (FR-064) */
  equipped: Equipped;
  /** 상태 문구 말투 (FR-067) */
  voice: Voice;
  /** 가입한 날(기기 현지 날짜). 신입 판정에 쓴다. 모르면 null */
  signupDate: string | null;
  /** 친구 인증·투표·들어오기 푸시를 받는가 (그룹기획서 9절) */
  pushFriends: boolean;
};

export type ProfileRow = {
  notify_enabled: boolean;
  notify_time: string;
  onboarded_at: string | null;
  signup_source: string;
  equipped?: Record<string, unknown> | null;
  voice?: string | null;
  created_at?: string | null;
  push_friends?: boolean | null;
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
    equipped: equippedFromRow(row.equipped),
    voice: row.voice === 'mild' ? 'mild' : 'spicy',
    signupDate: row.created_at ? localDate(row.created_at) : null,
    pushFriends: row.push_friends ?? true,
  };
}

/** 바꾼 항목만 서버 컬럼 이름으로 옮긴다. */
export function profilePatchToRow(patch: Partial<Profile>): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {};
  if (patch.notifyEnabled !== undefined) row.notify_enabled = patch.notifyEnabled;
  if (patch.notifyTime !== undefined) row.notify_time = normalizeTime(patch.notifyTime);
  if (patch.onboardedAt !== undefined) row.onboarded_at = patch.onboardedAt;
  if (patch.signupSource !== undefined) row.signup_source = patch.signupSource;
  if (patch.equipped !== undefined) row.equipped = patch.equipped;
  if (patch.voice !== undefined) row.voice = patch.voice;
  if (patch.pushFriends !== undefined) row.push_friends = patch.pushFriends;
  return row;
}

/** 첫 실행 안내를 보여줘야 하는가. 설정을 아직 읽지 못했으면 보여주지 않는다. */
export function needsOnboarding(profile: Profile | null): boolean {
  return profile !== null && profile.onboardedAt === null;
}

const SLOT_KEYS = ['stampInk', 'stampWord', 'stampShape', 'bubble', 'background', 'head', 'face', 'body'] as const;

/** 서버의 jsonb에서 문자열 값만 골라 읽는다. 물건이 실제로 있는지는 shop.resolveLook이 판단한다. */
export function equippedFromRow(value: Record<string, unknown> | null | undefined): Equipped {
  const equipped: Equipped = {};
  if (!value || typeof value !== 'object') return equipped;
  for (const key of SLOT_KEYS) {
    if (typeof value[key] === 'string') equipped[key] = value[key] as string;
  }
  return equipped;
}

/** 서버 일시를 기기 현지 날짜(YYYY-MM-DD)로 */
function localDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
