import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '@/components/Amount';
import { Button } from '@/components/Button';
import { CoinMeter } from '@/components/CoinMeter';
import { OptionRow } from '@/components/OptionRow';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Stamp } from '@/components/Stamp';
import { debtFor, principalOf, type Importance } from '@/domain/interest';
import { GUIDE_PAGES, SOURCE_QUESTION } from '@/domain/messages';
import { SOURCE_OPTIONS, type SignupSource } from '@/domain/profile';
import { useProfile } from '@/store/profile';
import { color, radius, stroke, themed, type } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

const LEVELS: Importance[] = [1, 2, 3, 4, 5];
const EXAMPLE_PRINCIPAL = 3000;
const GRAPH_HEIGHT = 120;

/**
 * TI-SCR-09 첫 실행 안내. 규칙 3장과 유입 경로 질문 1장. (FR-050, FR-054)
 * 설정에서 다시 볼 때(review)는 규칙 3장만 보여주고 아무것도 저장하지 않는다.
 */
export default function OnboardingScreen() {
  const { review } = useLocalSearchParams<{ review?: string }>();
  const isReview = review === '1';
  const { update } = useProfile();
  const [page, setPage] = useState(0);
  const [source, setSource] = useState<SignupSource | null>(null);
  const [busy, setBusy] = useState(false);

  const pageCount = isReview ? GUIDE_PAGES.length : GUIDE_PAGES.length + 1;
  const isLast = page === pageCount - 1;
  const guide = page < GUIDE_PAGES.length ? GUIDE_PAGES[page] : null;

  const finish = async (picked: SignupSource | null) => {
    if (isReview) {
      goBack();
      return;
    }
    setBusy(true);
    // 고르지 않았거나 건너뛰면 유입 경로는 unknown으로 남긴다
    await update({ onboardedAt: new Date().toISOString(), signupSource: picked ?? 'unknown' });
    // 경로 타입 생성기가 탭 묶음 안의 index를 '/(tabs)/index'로 적어서 '/'를 모른다. 실제 주소는 '/'가 맞다.
    router.replace('/' as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {page > 0 ? (
          <Pressable onPress={() => setPage(page - 1)} accessibilityRole="button" accessibilityLabel="이전" hitSlop={10} style={styles.lead}>
            <Text style={styles.glyph}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.lead} />
        )}
        <View style={styles.dots} accessible accessibilityLabel={`${pageCount}장 중 ${page + 1}장`}>
          {Array.from({ length: pageCount }, (_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        <Pressable
          onPress={() => finish(null)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={isReview ? '닫기' : '건너뛰기'}
          hitSlop={10}>
          <Text style={[type.label, styles.skip]}>{isReview ? '닫기' : '건너뛰기'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {guide ? (
          <>
            <View style={styles.figure}>
              {page === 0 ? <PrincipalFigure /> : page === 1 ? <GrowthFigure /> : <RepaidFigure />}
            </View>
            <Text style={[type.title, styles.title]} accessibilityRole="header">
              {guide.title}
            </Text>
            <Text style={[type.body, styles.body]}>{guide.body}</Text>
            <SpeechBubble text={guide.mascot} />
          </>
        ) : (
          <>
            <SpeechBubble text={SOURCE_QUESTION} />
            <View style={styles.options} accessibilityRole="radiogroup">
              {SOURCE_OPTIONS.map((option) => (
                <OptionRow
                  key={option.code}
                  label={option.label}
                  selected={source === option.code}
                  onPress={() => setSource(source === option.code ? null : option.code)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={isLast ? (isReview ? '닫기' : '시작하기') : '다음'}
          onPress={() => (isLast ? finish(source) : setPage(page + 1))}
          disabled={busy}
        />
      </View>
    </SafeAreaView>
  );
}

/** 1장: 중요도마다 엽전 개수와 원금 */
function PrincipalFigure() {
  return (
    <View style={styles.levels}>
      {LEVELS.map((level) => (
        <View key={level} style={styles.levelRow}>
          <CoinMeter level={level} />
          <Amount value={principalOf(level)} />
        </View>
      ))}
    </View>
  );
}

/** 2장: 원금 3,000냥이 사흘 동안 불어나는 모습. 금액은 실제 계산값이다. */
function GrowthFigure() {
  const days = [0, 1, 2, 3].map((n) => ({ n, amount: n === 0 ? EXAMPLE_PRINCIPAL : debtFor(EXAMPLE_PRINCIPAL, n) }));
  const max = days[days.length - 1].amount;
  const summary = days.map((d) => `${d.n === 0 ? '기한일' : `${d.n}일 뒤`} ${d.amount}냥`).join(', ');
  return (
    <View style={styles.graph} accessible accessibilityLabel={summary}>
      {days.map((d) => (
        <View key={d.n} style={styles.barColumn}>
          <Amount value={d.amount} tone={d.n === 0 ? 'ink' : 'debt'} />
          <View
            style={[
              styles.bar,
              { height: Math.round((d.amount / max) * GRAPH_HEIGHT) },
              d.n === 0 ? styles.barBase : styles.barDebt,
            ]}
          />
          <Text style={[type.caption, styles.barLabel]}>{d.n === 0 ? '기한일' : `${d.n}일 뒤`}</Text>
        </View>
      ))}
    </View>
  );
}

/** 3장: 완납 도장 */
function RepaidFigure() {
  return (
    <View style={styles.repaid}>
      <Stamp kind="saved" size={112} />
    </View>
  );
}

const styles = themed(() => ({
  safe: { flex: 1, backgroundColor: color.bgPage },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12, paddingRight: 16 },
  lead: { width: 48, height: 44, justifyContent: 'center', paddingLeft: 8 },
  glyph: { fontSize: 26, lineHeight: 30, color: color.textPrimary, fontFamily: type.body.fontFamily },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.borderDefault },
  dotOn: { width: 20, backgroundColor: color.inkOutline },
  skip: { color: color.textSecondary, minWidth: 48, textAlign: 'right' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
  figure: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.xl,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 24,
    marginBottom: 8,
  },
  title: { color: color.textPrimary },
  body: { color: color.textSecondary },
  options: { gap: 12, marginTop: 8 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  levels: { gap: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  graph: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { alignSelf: 'stretch', borderRadius: radius.sm, borderWidth: stroke.outline, borderColor: color.inkOutline },
  barBase: { backgroundColor: color.brandSoft },
  barDebt: { backgroundColor: color.debtBg },
  barLabel: { color: color.textSecondary },
  repaid: { alignItems: 'center', paddingVertical: 12 },
}));
