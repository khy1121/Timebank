import { router, type Href } from 'expo-router';

/**
 * 뒤로 가기. 앞 화면이 없으면(주소로 바로 열었거나 알림으로 들어왔을 때) 홈으로 간다.
 * router.back()만 쓰면 앞 화면이 없을 때 "GO_BACK was not handled" 오류가 난다.
 */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/' as Href);
}
