import { diffDays, type DateString } from './dates';

/**
 * 친구. (FR-103~107, 친구기획서 TI-FRD-001)
 * 서버 함수가 돌려준 행을 앱 모양으로 바꾸고, 화면 문구를 정한다.
 * 친구에게는 이름과 숫자 기록만 보인다. 할 일 제목은 서버에서부터 오지 않는다.
 */

export const DISPLAY_NAME_MAX = 10;
/** 한 사람당 친구 수. 은행 5단계에서 100명으로 늘어난다(상점기획서 11절, 아직 구현 전) */
export const FRIEND_LIMIT = 50;
/** 이만큼 안 들어오면 "조용해요"로 보여 준다 */
export const QUIET_DAYS = 3;

export type FriendVia = 'code' | 'kakao' | 'group';
export type FriendState = 'friend' | 'sent' | 'received' | 'blocked' | 'none';
/** 친구 신청 결과. friends: 이미 친구이거나 상대가 먼저 신청해서 바로 친구가 됐다 */
export type SendResult = 'sent' | 'friends' | 'not_found';

// ---------------------------------------------------------------------------
// 서버 행 ↔ 앱
// ---------------------------------------------------------------------------

export type FriendRow = { user_id: string; name: string; since: string; done_week: number; overdue_now: number; last_active: string | null };
export type Friend = { userId: string; name: string; since: string; doneWeek: number; overdueNow: number; lastActive: DateString | null };

export function friendFromRow(r: FriendRow): Friend {
  return { userId: r.user_id, name: r.name, since: r.since, doneWeek: r.done_week, overdueNow: r.overdue_now, lastActive: r.last_active };
}

export type RequestRow = { id: string; user_id: string; name: string; via: string; incoming: boolean; created_at: string; common_group: string | null };
export type FriendRequest = { id: string; userId: string; name: string; via: FriendVia; incoming: boolean; createdAt: string; commonGroup: string | null };

export function requestFromRow(r: RequestRow): FriendRequest {
  const via: FriendVia = r.via === 'kakao' || r.via === 'group' ? r.via : 'code';
  return { id: r.id, userId: r.user_id, name: r.name, via, incoming: r.incoming, createdAt: r.created_at, commonGroup: r.common_group };
}

export type ProfileRow = FriendRow & { verified_week: number; common_groups: string[] | null };
export type FriendProfile = Friend & { verifiedWeek: number; commonGroups: string[] };

export function profileFromRow(r: ProfileRow): FriendProfile {
  return { ...friendFromRow(r), verifiedWeek: r.verified_week, commonGroups: r.common_groups ?? [] };
}

export function toFriendState(v: string | null | undefined): FriendState {
  return v === 'friend' || v === 'sent' || v === 'received' || v === 'blocked' ? v : 'none';
}

export function toSendResult(v: string | null | undefined): SendResult {
  return v === 'friends' || v === 'not_found' ? v : 'sent';
}

// ---------------------------------------------------------------------------
// 화면 문구
// ---------------------------------------------------------------------------

/** 표시 이름이 틀렸으면 이유, 맞으면 null */
export function displayNameError(name: string): string | null {
  const t = name.trim();
  if (!t) return '이름을 적어 주세요';
  if (t.length > DISPLAY_NAME_MAX) return `${DISPLAY_NAME_MAX}자까지 적을 수 있어요`;
  return null;
}

export type Tone = 'ok' | 'warn' | 'bad' | 'muted';

/** 친구 목록 한 줄 아래의 활동 문구. 연체가 가장 먼저 보인다 */
export function activityLine(f: Pick<Friend, 'doneWeek' | 'overdueNow' | 'lastActive'>, today: DateString): { text: string; tone: Tone } {
  if (f.overdueNow > 0) return { text: `연체 ${f.overdueNow}건`, tone: 'bad' };
  if (!f.lastActive) return { text: '아직 기록이 없어요', tone: 'muted' };
  const idle = Math.max(0, diffDays(f.lastActive, today));
  if (idle >= QUIET_DAYS) return { text: `${idle}일째 조용해요`, tone: 'warn' };
  if (f.doneWeek > 0) return { text: `이번 주 ${f.doneWeek}건 끝냄`, tone: 'ok' };
  return { text: idle === 0 ? '오늘 들어옴' : `${idle}일 전 들어옴`, tone: 'muted' };
}

export type FriendSort = 'active' | 'name';

/** active: 최근에 들어온 순(같으면 이름), name: 이름 순 */
export function sortFriends(list: Friend[], sort: FriendSort): Friend[] {
  const byName = (a: Friend, b: Friend) => a.name.localeCompare(b.name, 'ko');
  return [...list].sort((a, b) => {
    if (sort === 'name') return byName(a, b);
    const la = a.lastActive ?? '';
    const lb = b.lastActive ?? '';
    return la === lb ? byName(a, b) : la < lb ? 1 : -1;
  });
}

/** 받은·보낸 신청 아래의 작은 글자: 어디서 왔는지 */
export function requestOrigin(r: Pick<FriendRequest, 'via' | 'commonGroup'>): string {
  if (r.commonGroup) return `같은 그룹: ${r.commonGroup}`;
  if (r.via === 'kakao') return '카카오톡 친구';
  if (r.via === 'group') return '그룹에서 신청';
  return '친구 코드로 신청';
}

/** 친구가 된 지 며칠째 (같은 날이면 1일째) */
export function daysSince(since: string, today: DateString): number {
  return Math.max(0, diffDays(since.slice(0, 10), today)) + 1;
}

export function friendShareMessage(code: string, link: string): string {
  return `할 일 이자에서 나랑 같이 미루지 말아요. 친구 코드는 ${code}예요.\n${link}`;
}

export function sendResultMessage(result: SendResult): string {
  if (result === 'friends') return '친구가 됐어요';
  if (result === 'not_found') return '이 코드의 사람이 없어요. 코드를 다시 확인해 주세요';
  return '친구 신청을 보냈어요. 상대가 받으면 친구가 돼요';
}

/** 서버가 hint로 알려 주는 이유를 화면 문구로 바꾼다 */
const HINT_MESSAGE: Record<string, string> = {
  friend_self: '내 친구 코드예요',
  friend_blocked: '신청할 수 없는 사람이에요',
  friend_limit: `친구는 ${FRIEND_LIMIT}명까지 둘 수 있어요`,
  friend_target_limit: '상대의 친구가 가득 찼어요',
  too_many_attempts: '코드를 너무 많이 틀렸어요. 1시간 뒤에 다시 해 주세요',
  request_gone: '이미 없어진 신청이에요',
  bad_display_name: `이름은 1~${DISPLAY_NAME_MAX}자로 적어 주세요`,
};

export function friendErrorMessage(err: { hint?: string | null } | null, fallback: string): string {
  if (err?.hint && HINT_MESSAGE[err.hint]) return HINT_MESSAGE[err.hint];
  return fallback;
}
