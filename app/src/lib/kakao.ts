/**
 * 카카오 친구 목록 API. (FR-108, 친구기획서 3.3절)
 * GET https://kapi.kakao.com/v1/api/talk/friends, 한 번에 최대 100명.
 * 앱에 카카오로 가입하고 친구 목록 제공에 동의했으며 숨김·차단이 아닌 친구만 온다.
 * 받은 목록은 서버에 저장하지 않는다. 회원 번호(id)만 서버로 보내 앱 사용자와 맞춘다.
 */

export type KakaoFriend = { id: string; nickname: string };

export type KakaoFriendsResult = { ok: true; friends: KakaoFriend[] } | { ok: false; message: string };

type Page = {
  elements?: { id?: number | string; profile_nickname?: string }[];
  after_url?: string | null;
  code?: number;
  msg?: string;
};

const FIRST_PAGE = 'https://kapi.kakao.com/v1/api/talk/friends?limit=100&offset=0';
/** 끝없이 돌지 않게 */
const MAX_PAGES = 10;

/** 카카오 오류 코드를 화면 문구로. -402: 동의 항목(친구 목록) 없음, -401: 토큰 만료 */
export function kakaoApiMessage(code: number | undefined): string {
  if (code === -402) return '친구 목록 제공에 동의해야 찾을 수 있어요.';
  if (code === -401) return '카카오 연결이 끊겼어요. 다시 시도해 주세요.';
  if (code === -3) return '카카오톡 친구 목록 권한이 아직 승인되지 않았어요. 지금은 앱 팀원끼리만 찾을 수 있어요.';
  return '카카오톡 친구 목록을 받아 오지 못했어요.';
}

export async function fetchKakaoFriends(token: string, fetcher: typeof fetch = fetch): Promise<KakaoFriendsResult> {
  const friends: KakaoFriend[] = [];
  let url: string | null | undefined = FIRST_PAGE;
  for (let i = 0; url && i < MAX_PAGES; i++) {
    let page: Page;
    try {
      const res = await fetcher(url, { headers: { Authorization: `Bearer ${token}` } });
      page = (await res.json()) as Page;
      if (!res.ok) return { ok: false, message: kakaoApiMessage(page.code) };
    } catch {
      return { ok: false, message: '카카오에 연결하지 못했어요. 연결을 확인해 주세요.' };
    }
    for (const e of page.elements ?? []) {
      if (e.id === undefined || e.id === null) continue;
      friends.push({ id: String(e.id), nickname: e.profile_nickname ?? '' });
    }
    url = page.after_url;
  }
  return { ok: true, friends };
}
