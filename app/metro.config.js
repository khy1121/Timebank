// Sentry가 번들과 소스맵에 Debug ID를 붙여, 배포 빌드의 오류도 원래 코드 줄로 보이게 한다.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
