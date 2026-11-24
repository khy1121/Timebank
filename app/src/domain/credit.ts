import { toNameplate, type Nameplate } from './bank';
import { diffDays, type DateString } from './dates';

/**
 * 신용 점수. (FR-097~102, 신용점수기획서 TI-CRD-001)
 * 점수는 서버(credit_day)가 계산한다. 여기서는 받은 점수로 등급·칭호·꼬리표·문구를 정한다.
 */

export const START_SCORE = 600;
export const MAX_SCORE = 1000;

export type GradeCode = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'CC' | 'D';
/** 색 다섯 가지: gold(AAA), good(AA·A), info(BBB·BB, 파랑), warn(B·CCC), bad(CC·D) */
export type GradeTone = 'gold' | 'good' | 'info' | 'warn' | 'bad';
export type Voice = 'spicy' | 'mild' | 'banker';

export type Grade = {
  code: GradeCode;
  /** 이 등급의 가장 낮은 점수 */
  min: number;
  title: string;
  desc: string;
  tone: GradeTone;
  spicy: string;
  mild: string;
  /** 은행원 말투 (동네 창구 혜택) */
  banker: string;
};

/** 높은 등급부터. 신용점수기획서 3절 */
export const GRADES: Grade[] = [
  { code: 'AAA', min: 950, title: '갓생 재벌', desc: '성실함이 넘쳐흐르는 최상위 인간', tone: 'gold', spicy: '더 올라갈 데가 없어요. 이제 지키는 게 일이에요.', mild: '가장 높은 등급이에요. 정말 대단해요.', banker: '최고 등급 고객이십니다. 특별히 모시겠습니다.' },
  { code: 'AA', min: 850, title: '성실 우량주', desc: '믿고 투자할 수 있는 성실한 인간', tone: 'good', spicy: '믿고 맡길 만해요. 한 번만 삐끗하면 A예요.', mild: '아주 잘하고 있어요. 조금만 더 하면 AAA예요.', banker: '우량 고객이십니다. 한 단계만 더 오르시면 최고 등급입니다.' },
  { code: 'A', min: 750, title: '성실 우량주', desc: '시키지 않아도 알아서 해냄', tone: 'good', spicy: '꽤 하네요. 근데 위에 두 칸 남았어요.', mild: '꾸준히 잘하고 있어요.', banker: '신용 상태가 좋으십니다. 꾸준한 거래 감사드립니다.' },
  { code: 'BBB', min: 650, title: '신용 적격자', desc: '꾸준함이 습관으로 자리 잡는 중', tone: 'info', spicy: '나쁘지 않아요. 딱 거기까지지만요.', mild: '습관이 붙고 있어요. 이대로 가요.', banker: '안정적으로 거래하고 계십니다. 이대로 유지해 주십시오.' },
  { code: 'BB', min: 550, title: '신용 적격자', desc: '어느 정도 인간 구실을 하는 중', tone: 'info', spicy: '딱 평균이에요. 여기서 멈출 건 아니죠?', mild: '시작하기 좋은 자리예요.', banker: '보통 등급이십니다. 기한 안 상환이 늘면 등급이 오릅니다.' },
  { code: 'B', min: 425, title: '성실 불량주', desc: '의욕 대비 실적이 저조함', tone: 'warn', spicy: '계획은 거창한데 한 게 없네요.', mild: '조금 밀렸어요. 오늘 하나만 끝내 봐요.', banker: '최근 상환이 늦어지고 있습니다. 오늘 한 건만 처리해 주시겠습니까?' },
  { code: 'CCC', min: 300, title: '성실 불량주', desc: '오늘의 할 일을 내일로 돌려막기', tone: 'warn', spicy: '오늘 할 일을 내일의 나한테 떠넘기는 중이에요.', mild: '미룬 일이 쌓였어요. 가벼운 것부터 해 봐요.', banker: '연체가 쌓이고 있습니다. 가장 가벼운 건부터 정리해 드릴까요?' },
  { code: 'CC', min: 150, title: '성실 부도', desc: '밀린 할 일이 감당하기 어려운 수준', tone: 'bad', spicy: '밀린 게 산더미예요. 어디서부터 손댈지도 모르겠죠?', mild: '많이 밀렸어요. 가장 오래된 것 하나만 정리해요.', banker: '연체가 많아 신용 관리가 필요합니다. 오래된 건부터 상환해 주십시오.' },
  { code: 'D', min: 0, title: '성실 부도', desc: '성실도 부도 처리. 신뢰 회복이 시급함', tone: 'bad', spicy: '부도 처리됐어요. 바닥이니까 올라갈 일만 남았네요.', mild: '다시 시작하면 돼요. 하나만 끝내 봐요.', banker: '부도 등급이십니다. 한 건부터 다시 시작하시면 회복을 도와드리겠습니다.' },
];

export const BANKRUPT_TITLE = '갓생 파산자';

function clampScore(score: number): number {
  return Math.max(0, Math.min(MAX_SCORE, Math.round(score)));
}

export function gradeOf(score: number): Grade {
  const s = clampScore(score);
  return GRADES.find((g) => s >= g.min) ?? GRADES[GRADES.length - 1];
}

/** 파산 중이면 등급과 상관없이 "갓생 파산자" */
export function titleOf(score: number, bankrupt = false): string {
  return bankrupt ? BANKRUPT_TITLE : gradeOf(score).title;
}

export function gradeRange(code: GradeCode): { min: number; max: number } {
  const i = GRADES.findIndex((g) => g.code === code);
  return { min: GRADES[i].min, max: i === 0 ? MAX_SCORE : GRADES[i - 1].min - 1 };
}

/** 다음 등급과 남은 점수, 지금 등급 안에서 얼마나 왔는지(0~1). 맨 위면 next가 null */
export function nextStep(score: number): { next: GradeCode | null; points: number; progress: number } {
  const s = clampScore(score);
  const i = GRADES.findIndex((g) => g.code === gradeOf(s).code);
  const { min, max } = gradeRange(GRADES[i].code);
  if (i === 0) return { next: null, points: 0, progress: (s - min) / (max - min || 1) };
  const nextMin = GRADES[i - 1].min;
  return { next: GRADES[i - 1].code, points: nextMin - s, progress: (s - min) / (nextMin - min) };
}

export function voiceLine(score: number, voice: Voice): string {
  const g = gradeOf(score);
  return voice === 'mild' ? g.mild : voice === 'banker' ? g.banker : g.spicy;
}

// ---------------------------------------------------------------------------
// 꼬리표 (FR-099). 없거나 하나. 위에 있는 것이 먼저
// ---------------------------------------------------------------------------

export type CreditTag = '관찰 대상' | '전망: 부정적' | '전망: 긍정적' | '신규 고객';
export const OUTLOOK_POINTS = 30;

export function tagOf(
  input: { lastActive: DateString | null; weekDelta: number; joinedOn: DateString | null },
  today: DateString,
): CreditTag | null {
  if (input.lastActive && diffDays(input.lastActive, today) > 3) return '관찰 대상';
  if (input.weekDelta < -OUTLOOK_POINTS) return '전망: 부정적';
  if (input.weekDelta > OUTLOOK_POINTS) return '전망: 긍정적';
  if (input.joinedOn && diffDays(input.joinedOn, today) < 7) return '신규 고객';
  return null;
}

// ---------------------------------------------------------------------------
// 서버 값 ↔ 앱
// ---------------------------------------------------------------------------

export type CreditParts = { onTime: number; lateDone: number; verified: number; streak: number; overdue: number; giveUp: number; idle: number };

export type CreditInfo = {
  score: number;
  /** 어제까지 확정한 점수 */
  confirmed: number;
  weekDelta: number;
  /** 최근 7일 하루별 변화(오늘 포함) */
  week: { day: DateString; delta: number }[];
  /** 최근 5주 주말 점수(이번 주는 지금 점수) */
  weeks: { weekEnd: DateString; score: number }[];
  weekParts: CreditParts;
  rank: number;
  participants: number;
  lastActive: DateString | null;
  joinedOn: DateString | null;
};

type Json = Record<string, unknown>;
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v: unknown) => (typeof v === 'string' ? v : null);

function partsFrom(v: unknown): CreditParts {
  const p = (v && typeof v === 'object' ? v : {}) as Json;
  return {
    onTime: num(p.on_time),
    lateDone: num(p.late_done),
    verified: num(p.verified),
    streak: num(p.streak),
    overdue: num(p.overdue),
    giveUp: num(p.give_up),
    idle: num(p.idle),
  };
}

export function creditFromJson(v: unknown): CreditInfo | null {
  if (!v || typeof v !== 'object') return null;
  const j = v as Json;
  if (j.score === undefined) return null;
  return {
    score: clampScore(num(j.score, START_SCORE)),
    confirmed: clampScore(num(j.confirmed, START_SCORE)),
    weekDelta: num(j.week_delta),
    week: (Array.isArray(j.week) ? j.week : []).map((x) => ({ day: str((x as Json).day) ?? '', delta: num((x as Json).delta) })),
    weeks: (Array.isArray(j.weeks) ? j.weeks : []).map((x) => ({ weekEnd: str((x as Json).week_end) ?? '', score: num((x as Json).score, START_SCORE) })),
    weekParts: partsFrom(j.week_parts),
    rank: num(j.rank, 1),
    participants: num(j.participants, 1),
    lastActive: str(j.last_active),
    joinedOn: str(j.joined_on),
  };
}

/** 이번 주 내역 한 줄. 0인 것은 빼되 "끝냄"과 "연체"는 늘 보인다 */
export function partItems(p: CreditParts): { label: string; value: number }[] {
  const items = [
    { label: '끝냄', value: p.onTime + p.lateDone + p.streak, always: true },
    { label: '인증', value: p.verified, always: false },
    { label: '연체', value: -p.overdue, always: true },
    { label: '포기', value: -p.giveUp, always: false },
    { label: '안 들어옴', value: -p.idle, always: false },
  ];
  return items.filter((i) => i.always || i.value !== 0).map(({ label, value }) => ({ label, value }));
}

export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

export type BoardRow = { rank: number; userId: string | null; name: string; score: number; weekDelta: number; isMe: boolean; nameplate: Nameplate };

export function boardFromRows(rows: { rank: number; user_id?: string | null; name: string; score: number; week_delta: number; is_me: boolean; nameplate?: string | null }[]): BoardRow[] {
  return rows.map((r) => ({ rank: r.rank, userId: r.user_id ?? null, name: r.name, score: r.score, weekDelta: r.week_delta, isMe: r.is_me, nameplate: toNameplate(r.nameplate) }));
}
