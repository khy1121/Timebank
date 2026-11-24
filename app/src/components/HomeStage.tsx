import { Pressable, Text, View } from 'react-native';

import { gradeOf } from '@/domain/credit';
import { formatAmount } from '@/domain/interest';
import { color, radius, shadow, stroke, themed, type } from '@/theme/tokens';

import { GRADE_TONE } from './GradeBadge';
import { Mascot } from './Mascot';

type Props = {
  /** 통장(쓸 수 있는 냥) */
  cash: number;
  /** 신용 점수. 아직 못 받았으면 null */
  score: number | null;
  rank: number | null;
  participants: number | null;
  onRank: () => void;
  onGrade: () => void;
  onWallet: () => void;
};

/**
 * 홈 무대 (피그마 v6 홈 109:118). 하늘과 언덕, 가운데 마스코트, 왼쪽 "전체 N등", 오른쪽 "신용 AA", 발밑 냥 그릇.
 * 색은 테마의 v6/sky·v6/hill을 따른다.
 */
export function HomeStage({ cash, score, rank, participants, onRank, onGrade, onWallet }: Props) {
  const grade = score === null ? null : gradeOf(score);
  const negative = cash < 0;
  return (
    <View style={styles.stage}>
      <View style={styles.hill} pointerEvents="none" />

      <Pressable
        onPress={onRank}
        accessibilityRole="button"
        accessibilityLabel={rank ? `전체 ${participants}명 중 ${rank}등. 순위 보기` : '순위 보기'}
        style={({ pressed }) => [styles.side, styles.left, pressed && styles.pressed]}>
        <Text style={[type.caption, styles.sideLabel]}>전체</Text>
        <Text style={[type.title, styles.ink]}>{rank ? `${rank}등` : '-'}</Text>
      </Pressable>

      <View style={styles.mascot} accessible={false} importantForAccessibility="no-hide-descendants">
        <Mascot size={128} />
      </View>

      <Pressable
        onPress={onGrade}
        accessibilityRole="button"
        accessibilityLabel={grade ? `신용 ${grade.code}. 등급 기준 보기` : '등급 기준 보기'}
        style={({ pressed }) => [styles.side, styles.right, pressed && styles.pressed]}>
        <Text style={[type.caption, styles.sideLabel]}>신용</Text>
        <Text style={[type.title, { color: grade ? GRADE_TONE[grade.tone].fg : color.textTertiary }]}>{grade ? grade.code : '-'}</Text>
      </Pressable>

      <Pressable
        onPress={onWallet}
        accessibilityRole="button"
        accessibilityLabel={`통장 ${negative ? '마이너스 ' : ''}${formatAmount(Math.abs(cash))}냥. 상점 열기`}
        style={({ pressed }) => [styles.bowl, pressed && styles.pressed]}>
        <View style={styles.coin}>
          <View style={styles.hole} />
        </View>
        <Text style={[type.numberL, { color: negative ? color.debtFg : color.textPrimary }]}>
          {negative ? '−' : ''}
          {formatAmount(Math.abs(cash))}
        </Text>
        <Text style={[type.unitM, styles.ink]}>냥</Text>
      </Pressable>
    </View>
  );
}

const SIDE = 76;

const styles = themed(() => ({
  stage: { height: 244, backgroundColor: color.stageSky, overflow: 'hidden', alignItems: 'center' },
  // 아래쪽 넓은 언덕. 가로로 긴 타원을 무대 밖까지 늘려 둥근 능선만 보이게 한다
  hill: { position: 'absolute', alignSelf: 'center', top: 148, width: 900, height: 900, borderRadius: 450, backgroundColor: color.stageHill },
  mascot: { marginTop: 12 },
  side: {
    position: 'absolute',
    top: 36,
    width: SIDE,
    height: SIDE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    ...(shadow.card ? { boxShadow: shadow.card } : {}),
  },
  left: { left: 20, backgroundColor: color.accentCoin },
  right: { right: 20, backgroundColor: color.bgPage },
  sideLabel: { color: color.textSecondary },
  bowl: {
    position: 'absolute',
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: radius.full,
    backgroundColor: color.bgPage,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    ...(shadow.card ? { boxShadow: shadow.card } : {}),
  },
  coin: {
    width: 18,
    height: 18,
    borderRadius: radius.full >= 99 ? 9 : radius.sm,
    borderWidth: 1.5,
    borderColor: color.textPrimary,
    backgroundColor: color.accentCoin,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  hole: { width: 6, height: 6, borderWidth: 1.2, borderColor: color.textPrimary, backgroundColor: color.bgPage },
  ink: { color: color.textPrimary },
  pressed: { opacity: 0.8 },
}));
