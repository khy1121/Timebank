import { ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';
import { PRIVACY_EFFECTIVE_DATE, PRIVACY_SECTIONS } from '@/domain/privacy';
import { CONTACT_EMAIL } from '@/domain/settings';
import * as layout from '@/theme/layout';
import { color, themed, type } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';


/** TI-SCR-08 개인정보 처리방침. 로그인 전에도 볼 수 있다. (FR-052) */
export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="개인정보 처리방침" onLead={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {PRIVACY_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[type.headline, styles.title]} accessibilityRole="header">
              {section.title}
            </Text>
            <View style={styles.card}>
              {section.lines.map((line) => (
                <Text key={line} style={[type.body, styles.line]}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ))}
        <View style={styles.section}>
          <Text style={[type.headline, styles.title]} accessibilityRole="header">
            문의
          </Text>
          <View style={styles.card}>
            <Text style={[type.body, styles.line]}>
              {`문의는 메일 ${CONTACT_EMAIL} 앞으로 보내 주세요. 설정의 "의견 보내기"를 누르면 메일 앱이 바로 열려요.`}
            </Text>
          </View>
        </View>
        <Text style={[type.caption, styles.date]}>{PRIVACY_EFFECTIVE_DATE}부터 적용해요</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  content: layout.content,
  section: { gap: 8 },
  title: { color: color.textPrimary, paddingLeft: 4 },
  card: { ...layout.panel, padding: 16, gap: 10 },
  line: { color: color.textSecondary },
  date: { color: color.textTertiary, textAlign: 'center' },
}));
