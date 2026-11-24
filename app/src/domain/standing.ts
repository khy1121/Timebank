import { addDays, diffDays, type DateString } from './dates';
import { isCapped, overdueDays, principalOf, summarize, type Todo } from './interest';
import type { Repayment } from './records';
import { isOnTime, rewardFor } from './wallet';

/**
 * 이번 주 순위와 상태. (FR-065~069, 코드정의서 2.15)
 * 순위는 서버가 계산해 내 것만 돌려준다. 상태는 순위와 기기의 기록을 함께 보고 정한다.
 */

/** 서버 standing_history가 돌려주는 한 주 */
export type StandingWeek = {
  /** 그 주의 마지막 날(한국 날짜). 이번 주는 오늘 */
  weekEnd: DateString;
  rank: number;
  participants: number;
  score: number;
  topScore: number;
};

/** 순위로 상태를 정하려면 최소 이만큼은 겨뤄야 한다 */
export const MIN_PARTICIPANTS = 5;
export const NEWBIE_DAYS = 7;
export const NEWBIE_REPAYMENTS = 3;
export const DORMANT_DAYS = 3;
export const PILE_OVERDUE_COUNT = 3;
export const PILE_OVERDUE_DAYS = 7;
export const CRAM_DAYS = 2;
export const CRAM_COUNT = 3;
export const SHARP_COUNT = 5;
export const WORKAHOLIC_STREAK = 10;

export type StatusCode =
  | 'newbie'
  | 'bankrupt'
  | 'dormant'
  | 'debtPile'
  | 'slothful'
  | 'lazy'
  | 'cramming'
  | 'dabbling'
  | 'workaholic'
  | 'diligent'
  | 'sharp'
  | 'sincere'
  | 'mediocre'
  | 'waiting';

export type Tone = 'good' | 'neutral' | 'warn' | 'bad';

export const STATUS: Record<StatusCode, { label: string; tone: Tone; rule: string }> = {
  newbie: { label: '신입', tone: 'neutral', rule: '가입 7일 안이고 상환이 3건 미만' },
  bankrupt: { label: '파산 직전', tone: 'bad', rule: '이자가 상한(원금의 10배)에 닿은 할 일이 있음' },
  dormant: { label: '잠수 중', tone: 'bad', rule: '남은 할 일이 있는데 3일 넘게 아무것도 안 함' },
  debtPile: { label: '빚더미', tone: 'bad', rule: '연체 3건 이상 또는 7일 넘게 밀린 할 일이 있음' },
  slothful: { label: '나태하다', tone: 'bad', rule: '하위 10%' },
  lazy: { label: '게으르다', tone: 'warn', rule: '하위 30% 또는 연체 2건' },
  cramming: { label: '벼락치기', tone: 'warn', rule: '이번 주 연체가 있었는데 최근 2일 동안 3건 이상 상환' },
  dabbling: { label: '간 보는 중', tone: 'warn', rule: '할 일은 있는데 이번 주 상환 0건' },
  workaholic: { label: '일벌레', tone: 'good', rule: '상위 3%이고 연속 기록 10번 이상' },
  diligent: { label: '부지런하다', tone: 'good', rule: '상위 10%이고 연체 0건' },
  sharp: { label: '칼같다', tone: 'good', rule: '이번 주 5건 이상을 모두 기한 안에 상환' },
  sincere: { label: '성실하다', tone: 'good', rule: '상위 40% 안이고 연체 1건 이하' },
  mediocre: { label: '어영부영하다', tone: 'neutral', rule: '위 어디에도 해당하지 않음(대개 상위 40~70%)' },
  waiting: { label: '비교 대기', tone: 'neutral', rule: '이번 주 겨룰 사람이 5명 미만' },
};

/** 판정 순서. 위에서부터 처음 맞는 상태 하나를 붙인다. 화면의 "상태 기준" 목록도 이 순서다. */
export const STATUS_ORDER: StatusCode[] = [
  'newbie',
  'bankrupt',
  'dormant',
  'debtPile',
  'slothful',
  'lazy',
  'cramming',
  'dabbling',
  'workaholic',
  'diligent',
  'sharp',
  'sincere',
  'mediocre',
  'waiting',
];

export type Signals = {
  /** 이번 주 순위. 서버에서 못 받았으면 null */
  standing: StandingWeek | null;
  openCount: number;
  overdueCount: number;
  maxOverdueDays: number;
  hasCapped: boolean;
  repaidThisWeek: number;
  onTimeThisWeek: number;
  repaidLast2Days: number;
  /** 이번 주에 연체가 있었는가(연체 상환·탕감 기록 또는 지금 연체 중) */
  hadOverdueThisWeek: boolean;
  totalRepaid: number;
  streak: number;
  /** 마지막으로 무언가를 고친 뒤 지난 날. 기록이 없으면 null */
  daysSinceActivity: number | null;
  /** 가입 후 지난 날. 모르면 null */
  daysSinceSignup: number | null;
};

const inLastDays = (date: DateString, today: DateString, days: number) => {
  const d = diffDays(date, today);
  return d >= 0 && d < days;
};

/** 기기의 기록으로 상태 판정에 쓸 신호를 만든다. */
export function buildSignals(input: {
  todos: Todo[];
  repayments: Repayment[];
  today: DateString;
  streak: number;
  standing: StandingWeek | null;
  lastActivity: DateString | null;
  signupDate: DateString | null;
}): Signals {
  const { todos, repayments, today } = input;
  const open = todos.filter((t) => t.status === 'open');
  const overdue = open.map((t) => overdueDays(t.dueDate, today)).filter((d) => d > 0);
  const thisWeek = repayments.filter((r) => inLastDays(r.settledOn, today, 7));
  return {
    standing: input.standing,
    openCount: open.length,
    overdueCount: overdue.length,
    maxOverdueDays: overdue.length ? Math.max(...overdue) : 0,
    hasCapped: open.some((t) => isCapped(principalOf(t.importance), overdueDays(t.dueDate, today))),
    repaidThisWeek: thisWeek.filter((r) => r.kind === 'repaid').length,
    onTimeThisWeek: thisWeek.filter(isOnTime).length,
    repaidLast2Days: repayments.filter((r) => r.kind === 'repaid' && inLastDays(r.settledOn, today, CRAM_DAYS)).length,
    hadOverdueThisWeek: overdue.length > 0 || thisWeek.some((r) => !isOnTime(r)),
    totalRepaid: repayments.filter((r) => r.kind === 'repaid').length,
    streak: input.streak,
    daysSinceActivity: input.lastActivity ? diffDays(input.lastActivity, today) : null,
    daysSinceSignup: input.signupDate ? diffDays(input.signupDate, today) : null,
  };
}

/** 상위 몇 %인지. 1등이면 가장 작은 값. 23명 중 3등 → 14 */
export function topPercent(rank: number, participants: number): number {
  return Math.ceil((rank / participants) * 100);
}

/** 순위로 상태를 정할 수 있는가 */
export function isRanked(s: StandingWeek | null): s is StandingWeek {
  return !!s && s.participants >= MIN_PARTICIPANTS;
}

export function statusOf(sig: Signals): StatusCode {
  if (sig.daysSinceSignup !== null && sig.daysSinceSignup < NEWBIE_DAYS && sig.totalRepaid < NEWBIE_REPAYMENTS) return 'newbie';
  if (sig.hasCapped) return 'bankrupt';
  if (sig.openCount > 0 && sig.daysSinceActivity !== null && sig.daysSinceActivity > DORMANT_DAYS) return 'dormant';
  if (sig.overdueCount >= PILE_OVERDUE_COUNT || sig.maxOverdueDays > PILE_OVERDUE_DAYS) return 'debtPile';

  const ranked = isRanked(sig.standing);
  const top = ranked ? topPercent(sig.standing!.rank, sig.standing!.participants) : null;
  const isCramming = sig.hadOverdueThisWeek && sig.repaidLast2Days >= CRAM_COUNT;
  const isDabbling = sig.openCount > 0 && sig.repaidThisWeek === 0;
  const isSharp = sig.repaidThisWeek >= SHARP_COUNT && sig.onTimeThisWeek === sig.repaidThisWeek;

  if (top !== null && top > 90) return 'slothful';
  if ((top !== null && top > 70) || sig.overdueCount >= 2) return 'lazy';
  if (isCramming) return 'cramming';
  if (isDabbling) return 'dabbling';
  if (top !== null && top <= 3 && sig.streak >= WORKAHOLIC_STREAK) return 'workaholic';
  if (top !== null && top <= 10 && sig.overdueCount === 0) return 'diligent';
  if (isSharp) return 'sharp';
  if (top !== null && top <= 40 && sig.overdueCount <= 1) return 'sincere';
  return ranked ? 'mediocre' : 'waiting';
}

/** 말투: 매운맛, 순한맛, 은행원(동네 창구 혜택, FR-111) */
export type Voice = 'spicy' | 'mild' | 'banker';

/** 상태마다 마스코트 한마디. 숫자는 실제 값을 넣는다. */
export function statusMessage(code: StatusCode, sig: Signals, voice: Voice): string {
  const s = sig.standing;
  const above = s ? s.rank - 1 : 0;
  const top = s ? topPercent(s.rank, s.participants) : 0;
  const spicy: Record<StatusCode, string> = {
    newbie: '아직 판단 보류예요. 첫 주는 봐 드릴게요. 딱 첫 주만요.',
    bankrupt: '이자가 원금의 10배예요. 이건 할 일이 아니라 유적이에요.',
    dormant: `${sig.daysSinceActivity}일째 소식이 없네요. 빚은 그동안 쉬지 않고 불어났어요.`,
    debtPile: `밀린 게 ${sig.overdueCount}건이에요. 할 일 목록이 아니라 차용증 더미네요.`,
    slothful: `하위 ${100 - top + 1}%예요. 이자가 당신 대신 일하고 있어요.`,
    lazy: '아래에서 세는 게 더 빨라요. 미루는 게 습관이 됐네요.',
    cramming: '이제야 정신 차렸네요. 처음부터 그렇게 하지 그랬어요.',
    dabbling: '적어 놓기만 하고 하나도 안 했어요. 목록 쓰는 게 일이 아니에요.',
    workaholic: '이쯤 되면 쉬어도 돼요. 아, 쉬면 밀리겠네요.',
    diligent: `상위 ${top}%예요. 다들 보고 배워야 해요.`,
    sharp: `이번 주 ${sig.repaidThisWeek}건을 한 번도 안 넘겼어요. 무서운 사람이네요.`,
    sincere: above > 0 ? `나쁘지 않아요. 근데 위에 아직 ${above}명 있어요.` : '나쁘지 않아요. 이대로만 가요.',
    mediocre: '딱 중간이에요. 이렇게 평범하게 살 거예요?',
    waiting: '아직 겨룰 사람이 적어요. 대신 지난주의 나랑 비교할게요.',
  };
  const mild: Record<StatusCode, string> = {
    newbie: '첫 주예요. 천천히 익숙해져 봐요.',
    bankrupt: '이자가 상한까지 찼어요. 오늘 하나만 정리해 볼까요?',
    dormant: `${sig.daysSinceActivity}일 동안 쉬었네요. 가벼운 것부터 하나 끝내 봐요.`,
    debtPile: `밀린 일이 ${sig.overdueCount}건 있어요. 가장 오래된 것부터 하나씩 해 봐요.`,
    slothful: '이번 주는 많이 밀렸어요. 오늘 하나만 갚아도 순위가 올라가요.',
    lazy: '조금 밀리고 있어요. 오늘 하나만 끝내 볼까요?',
    cramming: '다시 속도가 붙었어요. 이 흐름 그대로 가요.',
    dabbling: '할 일을 적어 뒀네요. 이제 하나만 끝내 봐요.',
    workaholic: '정말 꾸준해요. 가끔은 쉬어도 괜찮아요.',
    diligent: `상위 ${top}%예요. 아주 잘하고 있어요.`,
    sharp: `이번 주 ${sig.repaidThisWeek}건을 모두 기한 안에 끝냈어요.`,
    sincere: '잘하고 있어요. 이대로만 가요.',
    mediocre: '중간쯤이에요. 하나만 더 끝내면 올라가요.',
    waiting: '아직 겨룰 사람이 적어요. 지난주의 나와 비교해 볼게요.',
  };
  const banker: Record<StatusCode, string> = {
    newbie: '처음 오셨군요, 고객님. 첫 주는 실적을 보지 않고 통장만 만들어 드립니다.',
    bankrupt: '고객님, 연체 이자가 한도에 이르렀습니다. 오늘 한 건만 상환해 주시겠습니까?',
    dormant: `${sig.daysSinceActivity}일째 거래가 없으십니다. 그사이 연체 이자는 계속 붙고 있습니다.`,
    debtPile: `연체 ${sig.overdueCount}건이 확인됩니다. 가장 오래된 건부터 정리해 드릴까요?`,
    slothful: `이번 주 실적이 하위 ${100 - top + 1}%로 집계됩니다. 상환 계획을 다시 세워 보시지요.`,
    lazy: '상환이 조금씩 밀리고 있습니다. 오늘 한 건만 처리해 주십시오.',
    cramming: '막판 상환이 많으셨습니다. 다음 주에는 미리 처리해 주시면 감사하겠습니다.',
    dabbling: '등록만 하시고 상환 실적이 없습니다. 한 건만 처리해 주시겠습니까?',
    workaholic: '실적이 매우 우수하십니다. 가끔은 쉬셔도 신용에 문제없습니다.',
    diligent: `상위 ${top}% 우수 고객이십니다. 늘 감사드립니다.`,
    sharp: `이번 주 ${sig.repaidThisWeek}건 모두 기한 안에 상환하셨습니다. 최우수 고객이십니다.`,
    sincere: above > 0 ? `성실하게 거래 중이십니다. 위로 ${above}분 남아 계십니다.` : '성실하게 거래 중이십니다. 지금처럼만 이용해 주십시오.',
    mediocre: '평균 수준의 실적이십니다. 한 건만 더 상환하시면 순위가 오릅니다.',
    waiting: '아직 비교할 고객이 적습니다. 지난주 실적과 비교해 드리겠습니다.',
  };
  return (voice === 'mild' ? mild : voice === 'banker' ? banker : spicy)[code];
}

export type RankChange = { kind: 'up' | 'down' | 'same' | 'new'; steps: number; text: string };

/** 지난주 대비 등수 변화. 참여자 수가 달라도 등수 그대로 비교한다. */
export function rankChange(current: StandingWeek | null, previous: StandingWeek | null): RankChange {
  if (!current || !previous) return { kind: 'new', steps: 0, text: '지난주 기록이 없어요' };
  const steps = previous.rank - current.rank;
  if (steps > 0) return { kind: 'up', steps, text: `지난주보다 ${steps}계단 올랐어요` };
  if (steps < 0) return { kind: 'down', steps: -steps, text: `지난주보다 ${-steps}계단 내려갔어요` };
  return { kind: 'same', steps: 0, text: '지난주와 같은 등수예요' };
}

/** 하루별 점수(그날 기한 안 상환으로 번 냥 − 그날 낸 이자). 주간 차트용. 오래된 날부터. */
export function dailyScores(repayments: Repayment[], today: DateString, days = 7): { date: DateString; score: number }[] {
  const out: { date: DateString; score: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const score = repayments
      .filter((r) => r.settledOn === date)
      .reduce((s, r) => s + (isOnTime(r) ? rewardFor(r.principal) : -r.interest), 0);
    out.push({ date, score });
  }
  return out;
}

export type StandingRow = { week_end: string; rank: number; participants: number; score: number; top_score: number };

export function standingFromRow(row: StandingRow): StandingWeek {
  return { weekEnd: row.week_end, rank: row.rank, participants: row.participants, score: row.score, topScore: row.top_score };
}

/**
 * 월간 차트용: 주마다 몇 등이었는지를 막대 높이로. 1등이 가장 높고(100) 꼴찌가 가장 낮다.
 * 겨룬 사람이 적으면 %가 오해를 부르므로(1명 중 1등 = 상위 100%) "N명 중 M등"으로 적는다.
 */
export function weeklyBars(weeks: StandingWeek[]): { weekEnd: DateString; value: number; label: string }[] {
  return weeks.map((w) => ({
    weekEnd: w.weekEnd,
    value: Math.round(((w.participants - w.rank + 1) / w.participants) * 100),
    label: w.participants >= MIN_PARTICIPANTS ? `상위 ${topPercent(w.rank, w.participants)}%` : `${w.participants}명 중 ${w.rank}등`,
  }));
}

export type ScoreBreakdown = { earned: number; paid: number; accruing: number; total: number };

/** 이번 주 점수를 나눠 보여준다. 서버 점수와 같은 규칙이지만 기기의 기록으로 계산한다. */
export function scoreBreakdown(repayments: Repayment[], todos: Todo[], today: DateString): ScoreBreakdown {
  let earned = 0;
  let paid = 0;
  for (const r of repayments) {
    if (!inLastDays(r.settledOn, today, 7)) continue;
    if (isOnTime(r)) earned += rewardFor(r.principal);
    else paid += r.interest;
  }
  const accruing = summarize(todos, today).totalInterest;
  return { earned, paid, accruing, total: earned - paid - accruing };
}
