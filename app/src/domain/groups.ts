import { STATUS, type StatusCode } from './standing';
import { rewardFor } from './wallet';

/**
 * 친구 그룹 인증 규칙. (FR-075~083, 그룹기획서 TI-GRP-001)
 * 인증 상태 규칙은 서버 함수 proof_state(supabase/migrations/0006_groups.sql)와 같아야 한다.
 */

export const MAX_MEMBERS = 10;
export const MAX_GROUPS = 3;
export const GROUP_NAME_MAX = 20;
export const NICKNAME_MAX = 10;
export const CAPTION_MAX = 40;
export const CODE_LENGTH = 6;
/** 인증을 올린 뒤 투표할 수 있는 시간, 상환 뒤 인증을 올릴 수 있는 시간 */
export const WINDOW_MS = 24 * 60 * 60 * 1000;
/** 사진은 긴 변을 이만큼으로 줄이고 이 품질로 저장한다 */
export const PHOTO_LONG_EDGE = 1080;
export const PHOTO_QUALITY = 0.7;
/** 임시 사진 주소가 유효한 시간(초) */
export const PHOTO_URL_TTL = 60 * 60;

/** 헷갈리는 0·O·1·I·L은 쓰지 않는다 (서버 new_invite_code와 같음) */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export type ProofState = 'pending' | 'passed' | 'rejected';
export type Vote = 'approve' | 'doubt';
export type ReportReason = 'photo' | 'harassment' | 'etc';

export const REPORT_REASONS: { code: ReportReason; label: string }[] = [
  { code: 'photo', label: '부적절한 사진' },
  { code: 'harassment', label: '괴롭힘이나 욕설' },
  { code: 'etc', label: '기타' },
];

/** 붙여 넣거나 소문자로 쳐도 받아 준다. 쓰지 않는 글자는 버린다. */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, CODE_LENGTH);
}

export function isCompleteCode(code: string): boolean {
  return code.length === CODE_LENGTH && normalizeCode(code) === code;
}

/** 초대 링크나 메시지 안에서 코드를 찾는다. 없으면 null */
export function codeFromText(text: string): string | null {
  const fromParam = /[?&]code=([A-Za-z0-9]+)/.exec(text);
  if (fromParam) {
    const code = normalizeCode(fromParam[1]);
    return isCompleteCode(code) ? code : null;
  }
  const words = text.toUpperCase().match(/[A-Z0-9]{6}/g) ?? [];
  for (const w of words) if (isCompleteCode(w)) return w;
  return null;
}

/** 문제가 없으면 null, 있으면 화면에 보여줄 문구 */
export function groupNameError(name: string): string | null {
  const n = name.trim();
  if (!n) return '그룹 이름을 적어 주세요';
  if (n.length > GROUP_NAME_MAX) return `그룹 이름은 ${GROUP_NAME_MAX}자까지예요`;
  return null;
}

export function nicknameError(nickname: string): string | null {
  const n = nickname.trim();
  if (!n) return '별명을 적어 주세요';
  if (n.length > NICKNAME_MAX) return `별명은 ${NICKNAME_MAX}자까지예요`;
  return null;
}

/**
 * 인증 상태 (FR-079)
 * - 인정이 1개 이상이고 의심보다 많으면 바로 통과
 * - 올린 지 24시간 안이면 대기
 * - 24시간이 지났을 때 의심이 없으면 통과, 있으면 불인정
 */
export function proofState(createdAt: string, approvals: number, doubts: number, now: Date): ProofState {
  if (approvals >= 1 && approvals > doubts) return 'passed';
  if (now.getTime() < Date.parse(createdAt) + WINDOW_MS) return 'pending';
  return doubts === 0 ? 'passed' : 'rejected';
}

/** 투표를 닫기까지 남은 시간(올림, 시간 단위). 지났으면 0 */
export function hoursLeft(createdAt: string, now: Date): number {
  const ms = Date.parse(createdAt) + WINDOW_MS - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / (60 * 60 * 1000));
}

export function votingOpen(createdAt: string, now: Date): boolean {
  return hoursLeft(createdAt, now) > 0;
}

/** 상환한 지 24시간 안이면 인증을 올릴 수 있다. 상환 기록을 마지막으로 고친 시각으로 본다. */
export function canPostProof(repaidAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(repaidAt) < WINDOW_MS;
}

/**
 * 이 상환으로 아직 인증을 올릴 수 있는 그룹 ID. 상환(탕감 말고)이고, 상환한 지 24시간 안이며, 아직 올리지 않은 그룹만.
 * repaidAt은 기기에 남은 상환 기록의 수정 시각이다(서버는 기록을 만든 시각으로 다시 확인한다).
 */
export function openProofGroups(
  repayment: { id: string; kind: 'repaid' | 'forgiven'; repaidAt: string },
  groupIds: readonly string[],
  posted: ReadonlyMap<string, ReadonlySet<string>>,
  now: Date,
): string[] {
  if (repayment.kind !== 'repaid' || !canPostProof(repayment.repaidAt, now)) return [];
  const done = posted.get(repayment.id);
  return groupIds.filter((g) => !done?.has(g));
}

/** 통과한 인증의 보너스 냥 (FR-080). 기한 안 상환 보상의 50% */
export function proofBonus(principal: number, onTime: boolean): number {
  return onTime ? Math.floor(rewardFor(principal) / 2) : 0;
}

export function countsLabel(approvals: number, doubts: number): string {
  return `인정 ${approvals}명, 의심 ${doubts}명`;
}

export const STATE_LABEL: Record<ProofState, string> = { pending: '대기', passed: '통과', rejected: '불인정' };

/** 인증 카드 아래 한 줄 설명 */
export function proofNote(p: { state: ProofState; createdAt: string; doubts: number; onTime: boolean; principal: number; hidden: boolean }, now: Date): string {
  if (p.hidden) return '신고가 쌓여 그룹원에게 숨겨졌어요';
  if (p.state === 'rejected') return '그룹 순위에 세지 않아요';
  if (p.state === 'passed') {
    const bonus = proofBonus(p.principal, p.onTime);
    return bonus > 0 ? `+${bonus.toLocaleString('ko-KR')}냥 보너스` : '통과했어요';
  }
  const h = hoursLeft(p.createdAt, now);
  return p.doubts > 0 ? `${h}시간 안에 인정이 의심보다 많아야 해요` : `자동 통과까지 ${h}시간`;
}

/** "2시간 전" 같은 표시 */
export function timeAgo(at: string, now: Date): string {
  const min = Math.floor((now.getTime() - Date.parse(at)) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return d === 1 ? '어제' : `${d}일 전`;
}

export function photoPath(groupId: string, userId: string, proofId: string): string {
  return `${groupId}/${userId}/${proofId}.jpg`;
}

export function inviteMessage(groupName: string, code: string, link: string): string {
  return `할 일 이자 "${groupName}" 그룹에 들어와요. 초대 코드는 ${code}예요.\n${link}`;
}

/** 서버가 hint로 알려 주는 이유를 화면 문구로 바꾼다 */
const HINT_MESSAGE: Record<string, string> = {
  too_many_groups: `그룹은 ${MAX_GROUPS}개까지 들 수 있어요`,
  group_full: `그룹이 꽉 찼어요. ${MAX_MEMBERS}명까지 들어갈 수 있어요`,
  not_found: '초대 코드를 찾을 수 없어요',
  own_proof: '내 인증에는 투표할 수 없어요',
  closed: '24시간이 지나 투표할 수 없어요',
  blocked: '이 인증에는 투표할 수 없어요',
};

export function groupErrorMessage(err: { hint?: string | null; message?: string } | null, fallback: string): string {
  if (!err) return fallback;
  if (err.hint && HINT_MESSAGE[err.hint]) return HINT_MESSAGE[err.hint];
  return fallback;
}

/** 서버에서 7일 안에 올라온 상태만 오고, 아는 코드만 받는다 */
export function toStatusCode(v: string | null | undefined): StatusCode | null {
  return v && v in STATUS ? (v as StatusCode) : null;
}

// ---------------------------------------------------------------------------
// 서버 행 ↔ 앱
// ---------------------------------------------------------------------------

export type MyGroupRow = { id: string; name: string; invite_code: string; is_owner: boolean; members: number; new_proofs: number; joined_at: string };
export type MyGroup = { id: string; name: string; inviteCode: string; isOwner: boolean; members: number; newProofs: number };

export function groupFromRow(r: MyGroupRow): MyGroup {
  return { id: r.id, name: r.name, inviteCode: r.invite_code, isOwner: r.is_owner, members: r.members, newProofs: r.new_proofs };
}

export type FeedRow = {
  id: string;
  user_id: string;
  nickname: string;
  is_mine: boolean;
  todo_title: string;
  caption: string;
  photo_path: string;
  created_at: string;
  approvals: number;
  doubts: number;
  my_vote: Vote | null;
  state: ProofState;
  hidden: boolean;
  on_time: boolean;
  principal: number;
};

export type Proof = {
  id: string;
  userId: string;
  nickname: string;
  isMine: boolean;
  todoTitle: string;
  caption: string;
  photoPath: string;
  createdAt: string;
  approvals: number;
  doubts: number;
  myVote: Vote | null;
  hidden: boolean;
  onTime: boolean;
  principal: number;
};

export function proofFromRow(r: FeedRow): Proof {
  return {
    id: r.id,
    userId: r.user_id,
    nickname: r.nickname,
    isMine: r.is_mine,
    todoTitle: r.todo_title,
    caption: r.caption,
    photoPath: r.photo_path,
    createdAt: r.created_at,
    approvals: r.approvals,
    doubts: r.doubts,
    myVote: r.my_vote,
    hidden: r.hidden,
    onTime: r.on_time,
    principal: r.principal,
  };
}

/** 내 투표를 바꾸면 서버 응답을 기다리지 않고 수를 고쳐 보여준다 */
export function withVote(p: Proof, vote: Vote | null): Proof {
  let { approvals, doubts } = p;
  if (p.myVote === 'approve') approvals -= 1;
  if (p.myVote === 'doubt') doubts -= 1;
  if (vote === 'approve') approvals += 1;
  if (vote === 'doubt') doubts += 1;
  return { ...p, approvals, doubts, myVote: vote };
}

export type MemberRow = { user_id: string; nickname: string; is_owner: boolean; is_me: boolean; joined_at: string; status_code: string | null; blocked: boolean };
export type Member = { userId: string; nickname: string; isOwner: boolean; isMe: boolean; status: StatusCode | null; blocked: boolean };

export function memberFromRow(r: MemberRow): Member {
  return { userId: r.user_id, nickname: r.nickname, isOwner: r.is_owner, isMe: r.is_me, status: toStatusCode(r.status_code), blocked: r.blocked };
}

export type GroupStandingRow = { user_id: string; nickname: string; is_me: boolean; status_code: string | null; score: number; passed: number; rank: number };
export type GroupStanding = { userId: string; nickname: string; isMe: boolean; status: StatusCode | null; score: number; passed: number; rank: number };

export function groupStandingFromRow(r: GroupStandingRow): GroupStanding {
  return { userId: r.user_id, nickname: r.nickname, isMe: r.is_me, status: toStatusCode(r.status_code), score: r.score, passed: r.passed, rank: r.rank };
}

export function passedLabel(n: number): string {
  return n > 0 ? `인증 ${n}개 통과` : '통과한 인증 없음';
}

export type GroupPreviewRow = { id: string; name: string; members: number; owner_nickname: string | null; is_member: boolean };

// ---------------------------------------------------------------------------
// 사진 올리기: base64 → 바이트. 저장소는 바이트를 받는다.
// ---------------------------------------------------------------------------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? B64.indexOf(clean[i + 2]) : -1;
    const d = i + 3 < clean.length ? B64.indexOf(clean[i + 3]) : -1;
    out[o++] = (a << 2) | (b >> 4);
    if (c >= 0) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[o++] = ((c & 3) << 6) | d;
  }
  return out.slice(0, o);
}
