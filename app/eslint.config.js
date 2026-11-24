// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // '@/…' 경로 별칭을 tsconfig.json의 paths로 풀게 한다.
    // 상대 경로여야 한다: 상위 폴더 이름(app(dev))의 괄호가 절대 경로에서는 패턴 문자로 해석되어 못 찾는다.
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
  },
  {
    ignores: ['dist/*', 'supabase/functions/*'],
  },
]);
