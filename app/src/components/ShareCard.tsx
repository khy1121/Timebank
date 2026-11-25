import { forwardRef, type ComponentRef } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { color, radius, shadow, themed, type } from '@/theme/tokens';

import { Mascot } from './Mascot';

/**
 * 친구 코드 공유 카드 (피그마 155:3654). 9:16 비율이라 인스타그램 스토리에 그대로 올라간다.
 * 이 화면을 그림으로 찍어 공유한다(app/share-card.tsx).
 */
export const ShareCard = forwardRef<ComponentRef<typeof View>, { code: string; width: number }>(function ShareCard({ code, width }, ref) {
  const height = Math.round((width * 16) / 9);
  const s = width / 270;
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height, borderRadius: 20 * s }]}>
      <View style={[styles.hill, { top: height * 0.5, width: width * 3, height: width * 3, borderRadius: width * 1.5 }]} />
      <Text style={[type.title, styles.title, { fontSize: 26 * s, lineHeight: 34 * s, marginTop: 28 * s }]}>{'나랑 같이\n미루지 말자'}</Text>
      <View style={{ marginTop: 10 * s }}>
        <Mascot size={110 * s} />
      </View>
      <View style={[styles.codeBox, { marginTop: 36 * s, paddingVertical: 12 * s, paddingHorizontal: 22 * s, borderRadius: 16 * s }]}>
        <Text style={[type.caption, styles.sub, { fontSize: 11 * s }]}>친구 코드</Text>
        <Text style={[type.display, styles.code, { fontSize: 30 * s, lineHeight: 38 * s, letterSpacing: 2 * s }]}>{code}</Text>
      </View>
      <Text style={[type.caption, styles.foot, { fontSize: 10 * s, bottom: 18 * s }]}>todobank 앱에서 코드를 넣어 주세요</Text>
    </View>
  );
});

const styles = themed(() => ({
  card: { backgroundColor: color.stageSky, alignItems: 'center', overflow: 'hidden' },
  hill: { position: 'absolute', alignSelf: 'center', backgroundColor: color.stageHill },
  title: { color: color.textPrimary, textAlign: 'center' },
  codeBox: { alignItems: 'center', backgroundColor: color.bgPage, ...(shadow.card ? { boxShadow: shadow.card } : {}), borderRadius: radius.lg },
  sub: { color: color.textSecondary },
  code: { color: color.textPrimary },
  foot: { position: 'absolute', color: color.textSecondary },
}));
