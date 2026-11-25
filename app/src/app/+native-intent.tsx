/**
 * 카카오 로그인·친구 찾기에서 돌아오는 주소(todobank://auth-callback)는 화면이 아니다.
 * 결과는 WebBrowser.openAuthSessionAsync가 받으므로, 라우터는 지금 화면에 그대로 둔다.
 * 안드로이드는 이 주소를 앱에도 넘겨서, 막지 않으면 "Unmatched Route"가 뜬다.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    if (/^(?:[a-z][\w+.-]*:\/*)?[^?#]*auth-callback(?:[?#/]|$)/i.test(path)) return initial ? '/' : null;
    return path;
  } catch {
    return path;
  }
}
