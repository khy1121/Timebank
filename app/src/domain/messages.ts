import { formatAmount, type Summary, type TodoView } from './interest';

/**
 * 마스코트 문구. 미리 정한 문구에서 고르며 인공지능을 쓰지 않는다. (FR-055)
 * 금액이 들어가는 문구는 계산값을 그대로 넣는다.
 */

export const LOGIN_GREETING = '안녕하세요. 미루면 이자가 붙는 할 일 앱이에요.';

export const SOURCE_QUESTION = '어디서 알게 되셨어요? 고르지 않아도 돼요.';

export const EMPTY_LIST = '미룰 일이 하나도 없네요. 할 일을 추가해 보세요.';

/** 할 일 입력 화면의 규칙 안내. 원금에 따라 첫날 이자가 달라진다. */
export function inputRuleHint(principal: number): string {
  return `기한을 넘기면 하루에 ${formatAmount(Math.floor(principal / 10))}냥씩 붙기 시작해요.`;
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
export const GUIDE_PAGES = [
  { title: '할 일에 원금을 걸어요', body: '중요한 일일수록 엽전을 많이 걸어요. 엽전 하나가 1,000냥이에요.' },
  { title: '미루면 하루 10%씩 불어나요', body: '기한을 넘긴 날부터 이자가 붙어요. 이자에도 이자가 붙어서 갈수록 빨라져요.' },
  { title: '끝내면 상환돼요', body: '끝낸 할 일에는 완납 도장이 찍혀요. 냥은 앱 안에서만 쓰는 단위라 실제 돈은 오가지 않아요.' },
] as const;

/** 상환 직후 화면 아래 알림 띠 문구. 잔고가 어떻게 바뀌었는지 알려준다. (FR-060~062) */
export function repayMessage(effect: { gained: number; bonus: boolean; lost: number }): string {
  if (effect.bonus) return `완납! 연속 기록 보너스까지 ${formatAmount(effect.gained)}냥 벌었어요`;
  if (effect.gained > 0) return `완납! ${formatAmount(effect.gained)}냥 벌었어요`;
  if (effect.lost > 0) return `완납했어요. 이자 ${formatAmount(effect.lost)}냥이 잔고에서 빠졌어요`;
  return '완납 처리했어요';
}

/** 상점 위쪽 마스코트 한마디 */
export function shopMessage(streak: number, toNextBonus: number): string {
  if (streak === 0) return '기한 안에 끝내면 원금의 10%를 벌어요. 냥을 모아 도장을 꾸며 보세요.';
  return `${streak}번 연속 기한 안에 끝냈어요. ${toNextBonus}번 더 하면 1,000냥 보너스예요.`;
}
