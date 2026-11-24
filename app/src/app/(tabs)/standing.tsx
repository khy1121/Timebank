import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { GradeBadge } from '@/components/GradeBadge';
import { NameplateBackground, NameplateStamp, nameplateNameStyle } from '@/components/Nameplate';
import { TopBar } from '@/components/TopBar';
import { signed, titleOf, type BoardRow } from '@/domain/credit';
import { useCredit } from '@/store/credit';
import { useFriends } from '@/store/friends';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, stroke, themed, type } from '@/theme/tokens';

type Board = 'global' | 'friends';

/**
 * TI-SCR-11 순위 탭 (FR-101, FR-102). 첫 화면은 순위표(전체 / 친구)이고, 맨 위의 내 점수 카드를 누르면 내 신용(TI-SCR-20).
 * 전체 순위표의 다른 사람 이름은 서버가 첫 글자만 보낸다. 피그마 144:3335, 144:3436
 */
export default function StandingScreen() {
  const { info, global, friends, loaded, failed, refresh } = useCredit();
  const { incomingCount } = useFriends();
  const { account } = useTodos();
  const [board, setBoard] = useState<Board>('global');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const rows = board === 'global' ? global : friends;
  const myRank = rows.find((r) => r.isMe)?.rank;
  const caption =
    board === 'global'
      ? info
        ? `신용 점수가 높은 순서예요. ${info.participants}명 중 ${info.rank}등이에요.`
        : '신용 점수가 높은 순서예요.'
      : friends.length > 1
        ? `나와 친구 ${friends.length - 1}명 중 ${myRank ?? '-'}등이에요.`
        : '친구를 추가하면 친구끼리 순위를 볼 수 있어요.';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar lead="none" title="순위" action={incomingCount > 0 ? `친구 ${incomingCount}` : '친구'} onAction={() => router.push('/friends')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.push('/credit')}
          accessibilityRole="button"
          accessibilityLabel={info ? `내 신용 ${info.score}점, ${titleOf(info.score, account.state === 'bankrupt')}. 자세히 보기` : '내 신용 보기'}
          style={({ pressed }) => [styles.myCard, pressed && styles.pressed]}>
          {info ? <GradeBadge score={info.score} /> : null}
          <View style={styles.flex}>
            <View style={styles.scoreRow}>
              <Text style={[type.numberM, styles.ink]}>{info ? `${info.score}점` : '…'}</Text>
              {info ? <Text style={[type.label, { color: info.weekDelta < 0 ? color.debtFg : color.okFg }]}>이번 주 {signed(info.weekDelta)}</Text> : null}
            </View>
            <Text style={[type.caption, styles.secondary]} numberOfLines={1}>
              {info ? `${titleOf(info.score, account.state === 'bankrupt')}, 전체 ${info.rank}등` : failed ? '점수를 받아 오지 못했어요' : '불러오는 중이에요'}
            </Text>
          </View>
          <Text style={[type.label, styles.secondary]}>내 신용 ›</Text>
        </Pressable>

        <View style={styles.tabs} accessibilityRole="tablist">
          <Chip label="전체" selected={board === 'global'} onPress={() => setBoard('global')} grow />
          <Chip label="친구" selected={board === 'friends'} onPress={() => setBoard('friends')} grow />
        </View>
        <Text style={[type.caption, styles.secondary]}>{caption}</Text>

        {!loaded ? (
          <Text style={[type.caption, styles.muted]}>{failed ? '순위를 받아 오지 못했어요. 연결되면 다시 받아요.' : '순위를 불러오는 중이에요.'}</Text>
        ) : board === 'friends' && friends.length <= 1 ? (
          <View style={styles.empty}>
            <Text style={[type.headline, styles.ink]}>아직 친구가 없어요</Text>
            <Text style={[type.body, styles.secondary]}>친구 코드를 보내거나 그룹원에게 친구 신청을 해 보세요.</Text>
            <Button label="친구 추가" variant="secondary" onPress={() => router.push('/friends')} />
          </View>
        ) : (
          <BoardList rows={rows} board={board} />
        )}

        {board === 'global' ? <Text style={[type.caption, styles.muted]}>전체 순위표에서는 다른 사람의 이름을 첫 글자만 보여 줘요.</Text> : null}
        <Text style={[type.caption, styles.muted]}>순위표 점수는 매일 밤 12시에 확정해요. 오늘 오르내린 점수는 내 신용 카드에 먼저 보이고, 순위표에는 내일 반영돼요.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function BoardList({ rows, board }: { rows: BoardRow[]; board: Board }) {
  return (
    <View style={styles.list}>
      {rows.map((r, i) => {
        // 위 20명 다음에 내가 붙어 있으면 사이를 띄운다
        const gap = i > 0 && r.rank - rows[i - 1].rank > 1 && r.isMe;
        const open = board === 'friends' && !r.isMe && r.userId;
        // 줄 배경은 이름표가 쓴다. 나는 왼쪽 막대와 "(나)"로 표시한다 (상점기획서 11.4절)
        const body = (
          <>
            <NameplateBackground plate={r.nameplate} />
            {r.isMe ? <View style={styles.meBar} /> : null}
            <Text style={[type.label, styles.rank, r.rank <= 3 && styles.top]}>{r.rank}</Text>
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text style={[type.label, styles.ink, styles.shrink, nameplateNameStyle(r.nameplate)]} numberOfLines={1}>
                  {r.isMe ? `${r.name} (나)` : r.name}
                </Text>
                <NameplateStamp plate={r.nameplate} />
              </View>
              <Text style={[type.caption, { color: r.weekDelta < 0 ? color.debtFg : r.weekDelta > 0 ? color.okFg : color.textTertiary }]}>
                이번 주 {signed(r.weekDelta)}
              </Text>
            </View>
            <GradeBadge score={r.score} size="s" />
            <Text style={[type.label, styles.ink, styles.score]}>{r.score}</Text>
          </>
        );
        return (
          <View key={`${r.rank}-${r.name}-${i}`}>
            {gap ? <Text style={[type.caption, styles.dots]}>⋯</Text> : null}
            {open ? (
              <Pressable
                onPress={() => router.push({ pathname: '/friend/[id]', params: { id: r.userId! } })}
                accessibilityRole="button"
                style={[styles.row, i > 0 && styles.rowBorder]}>
                {body}
              </Pressable>
            ) : (
              <View style={[styles.row, i > 0 && styles.rowBorder]}>{body}</View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  content: layout.content,
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },
  myCard: { ...layout.card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  tabs: { flexDirection: 'row', gap: 8 },
  list: layout.list,
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, overflow: 'hidden' },
  meBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color.brandPrimary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shrink: { flexShrink: 1 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  rank: { width: 24, color: color.textTertiary },
  top: { color: color.accentCoinDeep },
  score: { width: 44, textAlign: 'right' },
  dots: { textAlign: 'center', color: color.textTertiary, paddingVertical: 4 },
  empty: { ...layout.panel, gap: 10, padding: 20 },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
}));
