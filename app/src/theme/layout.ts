import type { ViewStyle } from 'react-native';

import { color, radius, stroke } from './tokens';

/**
 * 화면 틀 규칙. 모든 화면이 같은 여백과 간격을 쓰도록 여기서만 정한다. (디자인방향 6절)
 * - 좌우 16, 위 8, 아래 32
 * - 섹션 사이 20, 섹션 안 10
 * - 아래 고정 버튼 영역은 좌우 16, 위아래 12, 버튼 사이 12
 * 로그인·첫 실행 안내처럼 가운데 정렬하는 화면만 좌우 24를 쓴다.
 */
export const GUTTER = 16;
export const SECTION_GAP = 20;
export const INNER_GAP = 10;

export const screen: ViewStyle = { flex: 1, backgroundColor: color.bgPage };

export const content: ViewStyle = { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32, gap: SECTION_GAP };

export const footer: ViewStyle = { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 12, gap: 12, backgroundColor: color.bgPage };

export const section: ViewStyle = { gap: INNER_GAP };

/**
 * 카드 두 가지
 * - card: 누를 수 있거나 강조하는 카드. 굵은 남색 외곽선 (요약 카드, 할 일, 그룹 줄, 인증)
 * - panel / list: 보기만 하는 묶음. 얇은 회색 외곽선 (점수 설명, 설정 목록, 내역, 순위표)
 */
export const card: ViewStyle = {
  backgroundColor: color.bgSurface,
  borderRadius: radius.lg,
  borderWidth: stroke.outline,
  borderColor: color.inkOutline,
};

export const panel: ViewStyle = {
  backgroundColor: color.bgSurface,
  borderRadius: radius.lg,
  borderWidth: stroke.hairline,
  borderColor: color.borderDefault,
};

/** 줄 목록 묶음 (줄 사이는 얇은 선) */
export const list: ViewStyle = { ...panel, overflow: 'hidden' };
