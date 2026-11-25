import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';

/**
 * 앱에서 난 오류·크래시를 Sentry로 보낸다.
 * DSN이 없으면(.env 미설정) 아무것도 보내지 않는다.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: __DEV__ ? 'development' : 'production',
  // 이메일·IP 같은 개인정보와 화면 주소의 실제 ID는 보내지 않는다
  sendDefaultPii: false,
  // 개발 중에는 모든 화면 이동을, 배포 앱에서는 10%만 성능 추적한다
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  enableLogs: true,
  enableNativeFramesTracking: !isRunningInExpoGo(),
  // 오류가 난 세션만 화면 재현을 남긴다. 글자와 사진은 기본으로 가려진다
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.expoRouterIntegration({ enableTimeToInitialDisplay: !isRunningInExpoGo() }),
    Sentry.mobileReplayIntegration(),
  ],
});

export { Sentry };
