import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradeBadge } from '@/components/GradeBadge';
import { TopBar } from '@/components/TopBar';
import { BANKRUPT_TITLE, gradeOf, gradeRange, GRADES } from '@/domain/credit';
import { useCredit } from '@/store/credit';
import * as layout from '@/theme/layout';
import { color, stroke, type } from '@/theme/tokens';

/** TI-SCR-12 등급표 (FR-098). 아홉 등급, 칭호, 한 줄 설명, 점수 구간. 피그마 111:444 */
export default function GradesScreen() {
  const { info } = useCredit();
  const mine = info ? gradeOf(info.score).code : null;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="등급표" onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.body, styles.secondary]}>끝내면 점수가 오르고 미루면 깎여요. 점수에 따라 등급과 칭호가 정해져요.</Text>
        <View style={styles.list}>
          {GRADES.map((g, i) => {
            const r = gradeRange(g.code);
            const me = g.code === mine;
            return (
              <View
                key={g.code}
                style={[styles.row, i > 0 && styles.rowBorder, me && styles.mine]}
                accessible
                accessibilityLabel={`${g.code}, ${g.title}, ${r.min}점에서 ${r.max}점${me ? ', 지금 내 등급' : ''}`}>
                <View style={styles.badge}>
                  <GradeBadge score={g.min} />
                </View>
                <View style={styles.flex}>
                  <Text style={[type.label, styles.ink]}>
                    {g.title}
                    {me ? <Text style={styles.brand}>  지금</Text> : null}
                  </Text>
                  <Text style={[type.caption, styles.secondary]}>{g.desc}</Text>
                </View>
                <Text style={[type.caption, styles.secondary]}>
                  {r.min}~{r.max.toLocaleString('ko-KR')}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={[type.caption, styles.muted]}>파산하면 점수와 상관없이 150점이 되고 &quot;{BANKRUPT_TITLE}&quot; 칭호가 붙어요.</Text>
        <Text style={[type.caption, styles.muted]}>
          오르는 일: 기한 안에 끝내면 10 + 중요도 × 2점, 인증 통과 5점, 5번 연속 10점, 늦게 끝내면 3점(하루 40점까지, 850점부터 절반).
          깎이는 일: 연체 중인 할 일마다 하루 4 + 중요도점(하나당 60점까지), 포기 30점, 할 일이 남았는데 3일 넘게 안 들어오면 하루 5점.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  content: layout.content,
  flex: { flex: 1, minWidth: 0 },
  badge: { width: 52 },
  list: layout.list,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  mine: { backgroundColor: color.brandSoft },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
  brand: { color: color.brandPrimary },
});
