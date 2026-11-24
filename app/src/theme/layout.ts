import type { ViewStyle } from 'react-native';

import { color, onThemeChange, radius, shadow, stroke } from './tokens';

/**
 * 화면 틀 규칙. 모든 화면이 같은 여백과 간격을 쓰도록 여기서만 정한다. (디자인방향 6절)
 * - 좌우 16, 위 8, 아래 32
 * - 섹션 사이 20, 섹션 안 10
 * - 아래 고정 버튼 영역은 좌우 16, 위아래 12, 버튼 사이 12
 * 로그인·첫 실행 안내처럼 가운데 정렬하는 화면만 좌우 24를 쓴다.
 *
 * 색·모서리·테두리는 테마를 따른다. 아래 값들은 테마가 바뀌면 다시 만들어진다(import * as layout으로 읽으면 바뀐 값이 보인다).
 */
export const GUTTER = 16;
export const SECTION_GAP = 20;
export const INNER_GAP = 10;

export const content: ViewStyle = { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32, gap: SECTION_GAP };

export const section: ViewStyle = { gap: INNER_GAP };

export let screen: ViewStyle = {};
export let footer: ViewStyle = {};
/**
 * 카드 두 가지
 * - card: 누를 수 있거나 강조하는 카드. 테마의 굵은 외곽선이나 아래 그림자 (요약 카드, 할 일, 그룹 줄, 인증)
 * - panel / list: 보기만 하는 묶음. 얇은 외곽선 (점수 설명, 설정 목록, 내역, 순위표)
 */
export let card: ViewStyle = {};
export let panel: ViewStyle = {};
/** 줄 목록 묶음 (줄 사이는 얇은 선) */
export let list: ViewStyle = {};

function build() {
  screen = { flex: 1, backgroundColor: color.bgPage };
  footer = { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 12, gap: 12, backgroundColor: color.bgPage };
  card = {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    ...(shadow.card ? { boxShadow: shadow.card } : {}),
  };
  panel = {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
  };
  list = { ...panel, overflow: 'hidden' };
}

build();
onThemeChange(build);
