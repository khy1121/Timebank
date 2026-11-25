import { debtFor, formatAmount, type Summary, type TodoView } from './interest';
import type { CompletionPreview } from './savings';

/**
 * 마스코트 문구. 미리 정한 문구에서 고르며 인공지능을 쓰지 않는다. (FR-055)
 * 금액이 들어가는 문구는 계산값을 그대로 넣는다.
 */

export const LOGIN_GREETING = '안녕하세요. 미루면 이자가 붙는 할 일 앱이에요.';

export const SOURCE_QUESTION = '어디서 알게 되셨어요? 고르지 않아도 돼요.';

export const EMPTY_LIST = '미룰 일이 하나도 없네요. 할 일을 추가해 보세요.';

/** 할 일 입력 화면의 규칙 안내. 원금에 따라 첫날 이자가 달라진다. */
/** 할 일 등록 화면의 마스코트 안내. 원금을 걸면 통장이 어떻게 되는지 알려준다 (시간적금기획서 4.2) */
export function inputRuleHint(principal: number, cash: number): string {
  if (cash < principal) {
    const after = cash - principal;
    return `${formatAmount(principal)}냥을 걸면 통장이 ${after < 0 ? '−' : ''}${formatAmount(Math.abs(after))}냥이 돼요. 기한 안에 끝내면 돌아와요.`;
  }
  return `${formatAmount(principal)}냥을 걸어요. 기한을 넘기면 원금이 하루에 ${formatAmount(Math.floor(principal / 10))}냥씩 깎여요.`;
}

/** 홈에서 목록 위에 보여줄 한마디. 보여줄 말이 없으면 null. */
export function homeMessage(summary: Summary, views: TodoView[]): string | null {
  if (views.length === 0) return EMPTY_LIST;
  if (summary.overdueCount === 0 && summary.todayCount > 0) {
    return `오늘까지인 일이 ${summary.todayCount}건 있어요. 오늘 끝내면 이자가 붙지 않아요.`;
  }
  return null;
}

/** 첫 실행 안내의 장마다 보여줄 제목과 설명. 금액은 화면에서 계산값을 그린다. (FR-050) */
/** 첫 실행 안내 3장. mascot은 장마다 마스코트가 하는 한마디 (FR-050, FR-055) */
export const GUIDE_PAGES = [
  {
    title: '할 일에 원금을 걸어요',
    body: '중요한 일일수록 엽전을 많이 걸어요. 엽전 하나가 1,000냥이에요.',
    mascot: '제일 중요한 일엔 엽전 다섯 개! 그만큼 꼭 해낼 거죠?',
  },
  {
    title: '미루면 하루 10%씩 불어나요',
    body: '기한을 넘긴 날부터 이자가 붙어요. 이자에도 이자가 붙어서 갈수록 빨라져요.',
    // 2장 그래프와 같은 예: 원금 3,000냥을 사흘 미루면
    mascot: `3,000냥짜리를 사흘만 미뤄도 ${formatAmount(debtFor(3000, 3))}냥이에요. 저는 밀리는 거 싫어요.`,
  },
  {
    title: '끝내면 상환돼요',
    body: '끝낸 할 일에는 완납 도장이 찍혀요. 냥은 앱 안에서만 쓰는 단위라 실제 돈은 오가지 않아요.',
    mascot: '끝내면 제가 도장을 쾅 찍어 드릴게요. 기한 안에 끝내면 냥도 벌어요.',
  },
] as const;

/** 끝낸 직후 화면 아래 알림 띠 문구. 통장이 어떻게 바뀌었는지 알려준다. (시간적금기획서 4.4, 4.7) */
export function repayMessage(p: CompletionPreview, principal: number): string {
  if (p.pending) return `적립 대기! 친구가 인정하면 ${formatAmount(p.promised)}냥이 돌아와요`;
  if (p.forfeit) return `늦어서 보증금 ${formatAmount(principal)}냥은 그룹 금고로 갔어요`;
  if (p.bonus) return `적립! 연속 기록 보너스까지 ${formatAmount(p.back)}냥이 돌아왔어요`;
  if (p.gained > 0) return `적립! ${formatAmount(p.back)}냥이 돌아왔어요 (+${formatAmount(p.gained)})`;
  if (p.back < 0) return `원금을 다 잃고 ${formatAmount(-p.back)}냥이 통장에서 빠졌어요`;
  return `연체료 ${formatAmount(p.lost)}냥을 빼고 ${formatAmount(p.back)}냥이 돌아왔어요`;
}

/** 상점 위쪽 마스코트 한마디 */
export function shopMessage(streak: number, toNextBonus: number): string {
  if (streak === 0) return '기한 안에 끝내면 원금의 10%를 벌어요. 냥을 모아 도장을 꾸며 보세요.';
  return `${streak}번 연속 기한 안에 끝냈어요. ${toNextBonus}번 더 하면 1,000냥 보너스예요.`;
}

/** 할 일을 찾을 수 없을 때 (상세·수정 화면) */
export const TODO_GONE = '이미 처리했거나 없는 할 일이에요.';

/** 끝낸 일이 하나도 없을 때 (상환 내역) */
export const HISTORY_EMPTY = '아직 끝낸 일이 없어요. 기한 안에 끝내면 여기에 적립 도장이 찍혀요.';

/** 할 일 상세: 기한 전·오늘까지일 때 돌려받을 냥과 넘기면 깎이는 냥 */
export function dueBubble(state: 'today' | 'upcoming', payout: number, daysLeft: number, nextDayLoss: number): string {
  if (state === 'today') return `오늘 끝내면 ${formatAmount(payout)}냥이 돌아와요. 넘기면 내일부터 원금이 하루에 ${formatAmount(nextDayLoss)}냥씩 깎여요.`;
  return `기한까지 ${daysLeft}일 남았어요. 넘기면 원금이 하루에 ${formatAmount(nextDayLoss)}냥씩 깎이기 시작해요.`;
}

/** 빚 화면: 연체가 있으면 그것부터, 없으면 작은 일부터 */
export function debtBubble(hasOverdue: boolean): string {
  return hasOverdue ? '연체된 것부터 하나만 끝내 봐요. 깎이는 게 바로 멈춰요.' : '작은 일 하나부터 기한 안에 끝내 봐요.';
}

/** 파산 중 화면 */
export const BANKRUPT_COMFORT = '괜찮아요. 다들 한 번쯤은 무너져요. 이번엔 작은 일부터 걸어 봐요.';

/** 빚이 없을 때 빚 화면 */
export const NO_DEBT_CHEER = '이대로만 가요. 기한 안에 끝내면 이자가 계속 쌓여요.';
