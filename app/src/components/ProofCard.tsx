import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mascot } from './Mascot';
import type { Outfit } from '@/domain/closet';
import { countsLabel, proofNote, proofState, STATE_LABEL, timeAgo, votingOpen, type Proof, type ProofState, type Vote } from '@/domain/groups';
import { color, live, radius, stroke, themed, type } from '@/theme/tokens';


const TONE: Record<ProofState, { fg: string; bg: string }> = live(() => ({
  pending: { fg: color.accentCoinDeep, bg: color.mascotCream },
  passed: { fg: color.okFg, bg: color.okBg },
  rejected: { fg: color.debtFg, bg: color.debtBg },
}));

type Props = {
  /** 글쓴이의 꾸민 옷. 없으면 내 캐릭터(이 기기의 옷)로 그린다 */
  outfit?: Outfit;
  proof: Proof;
  /** 아직 받는 중이면 undefined, 받지 못했으면 null */
  photoUrl: string | null | undefined;
  now: Date;
  onVote: (vote: Vote | null) => void;
  onMore: () => void;
};

/** 그룹 피드의 인증 카드 (TI-SCR-16, FR-078·079). 피그마 ProofCard 50:1571 */
export function ProofCard({ proof, outfit, photoUrl, now, onVote, onMore }: Props) {
  const state = proofState(proof.createdAt, proof.approvals, proof.doubts, now);
  const tone = TONE[state];
  const canVote = !proof.isMine && votingOpen(proof.createdAt, now);
  const note = proofNote({ ...proof, state }, now);

  const voteButton = (vote: Vote, label: string, onBg: string) => {
    const on = proof.myVote === vote;
    return (
      <Pressable
        onPress={() => onVote(on ? null : vote)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={on ? `${label} 거두기` : label}
        hitSlop={6}
        style={({ pressed }) => [styles.vote, on ? { backgroundColor: onBg, borderColor: color.inkOutline, borderWidth: stroke.outline } : styles.voteOff, pressed && styles.pressed]}>
        <Text style={[type.label, styles.ink]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.avatar} accessible={false} importantForAccessibility="no-hide-descendants">
          <Mascot size={40} outfit={outfit} />
        </View>
        <View style={styles.who}>
          <Text style={[type.label, styles.ink]} numberOfLines={1}>
            {proof.isMine ? `${proof.nickname} (나)` : proof.nickname}
          </Text>
          <Text style={[type.caption, styles.muted]}>{timeAgo(proof.createdAt, now)}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: proof.hidden ? color.bgSunken : tone.bg }]}>
          <Text style={[type.label, { color: proof.hidden ? color.textSecondary : tone.fg }]}>{proof.hidden ? '숨겨짐' : STATE_LABEL[state]}</Text>
        </View>
        <Pressable onPress={onMore} accessibilityRole="button" accessibilityLabel="더보기" hitSlop={12} style={styles.more}>
          <Text style={[type.headline, styles.muted]}>⋯</Text>
        </Pressable>
      </View>

      <View style={[styles.photo, state === 'rejected' && styles.dim]}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityLabel={`${proof.todoTitle} 인증 사진`} />
        ) : (
          <Text style={[type.caption, styles.muted]}>{photoUrl === null ? '사진을 볼 수 없어요' : '사진을 불러오는 중'}</Text>
        )}
      </View>

      <Text style={[type.headline, styles.ink]}>{proof.todoTitle}</Text>
      {proof.caption ? <Text style={[type.body, styles.secondary]}>{proof.caption}</Text> : null}

      <View style={styles.foot}>
        {canVote ? (
          <View style={styles.votes}>
            {voteButton('approve', '인정', color.okBg)}
            {voteButton('doubt', '의심', color.debtBg)}
          </View>
        ) : null}
        <View style={styles.info}>
          <Text style={[type.caption, styles.secondary]}>{countsLabel(proof.approvals, proof.doubts)}</Text>
          <Text style={[type.caption, { color: state === 'passed' && !proof.hidden ? color.okFg : color.textTertiary }]}>{note}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  card: {
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    padding: 14,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40 },
  who: { flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  more: { paddingHorizontal: 4 },
  photo: {
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.bgSunken,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.5 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  votes: { flexDirection: 'row', gap: 8 },
  vote: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  voteOff: { backgroundColor: color.bgSurface, borderWidth: stroke.hairline, borderColor: color.borderDefault },
  pressed: { opacity: 0.7 },
  info: { flex: 1, alignItems: 'flex-end' },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
}));
