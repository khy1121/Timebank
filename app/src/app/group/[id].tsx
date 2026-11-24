import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { Chip } from '@/components/Chip';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { ProofCard } from '@/components/ProofCard';
import { GradeBadge } from '@/components/GradeBadge';
import { NameplateBackground, NameplateStamp, nameplateNameStyle } from '@/components/Nameplate';
import { ThemeBadge } from '@/components/ThemeBadge';
import { TopBar } from '@/components/TopBar';
import {
  REPORT_REASONS,
  votingOpen,
  withVote,
  type GroupStanding,
  type Member,
  type Proof,
  type Vote,
} from '@/domain/groups';
import { josa } from '@/domain/korean';
import { type FriendState } from '@/domain/friends';
import { feedback } from '@/lib/feedback';
import { useFriends } from '@/store/friends';
import { useGroups } from '@/store/groups';
import * as layout from '@/theme/layout';
import { color, radius, stroke, themed, type } from '@/theme/tokens';

type Tab = 'feed' | 'standing' | 'members';
const TABS: { key: Tab; label: string }[] = [
  { key: 'feed', label: '피드' },
  { key: 'standing', label: '순위' },
  { key: 'members', label: '그룹원' },
];

/** urls: 받지 못한 사진은 null */
type Feed = { items: Proof[]; urls: Record<string, string | null>; done: boolean };
type Dialog = { kind: 'block'; proof: Proof } | { kind: 'delete'; proof: Proof } | null;

/** TI-SCR-16 그룹: 피드·순위·그룹원 (FR-079, FR-081, FR-082). 피그마 53:1617, 53:1695 */
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    groups: myGroups,
    loaded,
    feed: fetchFeed,
    standing: fetchStanding,
    members: fetchMembers,
    photoUrls,
    vote: sendVote,
    report,
    removeProof,
    block,
    unblock,
    markSeen,
    pot: fetchPot,
  } = useGroups();
  const { states: fetchFriendStates, sendToUser } = useFriends();
  const [friendStates, setFriendStates] = useState<Record<string, FriendState>>({});
  const group = myGroups.find((g) => g.id === id);
  const [tab, setTab] = useState<Tab>('feed');
  const [feed, setFeed] = useState<Feed | null>(null);
  const [pot, setPot] = useState<number | null>(null);
  const [standing, setStanding] = useState<GroupStanding[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // 잘 된 일을 알리는 문구. 오류와 다르게 파란 띠로 보여준다
  const [notice, setNotice] = useState<string | null>(null);
  const [menu, setMenu] = useState<Proof | null>(null);
  const [reporting, setReporting] = useState<Proof | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [now, setNow] = useState(() => new Date());

  // 남은 시간과 불인정이 화면에서 바뀌도록 1분마다 시각을 새로 잡는다
  // 이번 주 금고. 투표나 새로고침 뒤에도 다시 받는다
  useEffect(() => {
    if (!id) return;
    fetchPot(id).then(setPot);
  }, [id, fetchPot, feed]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const loadFeed = useCallback(
    async (more?: Feed) => {
      if (!id) return;
      setLoading(true);
      const before = more?.items.at(-1)?.createdAt;
      const r = await fetchFeed(id, before);
      if (!r.ok) {
        setMessage(r.message);
        setLoading(false);
        return;
      }
      const wanted = r.value.filter((p) => !(more?.urls ?? {})[p.photoPath]).map((p) => p.photoPath);
      const got = await photoUrls(wanted);
      const urls: Record<string, string | null> = {};
      for (const path of wanted) urls[path] = got[path] ?? null;
      setFeed({
        items: [...(more?.items ?? []), ...r.value],
        urls: { ...(more?.urls ?? {}), ...urls },
        done: r.value.length < 20,
      });
      setNow(new Date());
      setLoading(false);
    },
    [id, fetchFeed, photoUrls],
  );

  // 상태는 응답을 받은 뒤 콜백에서만 바꾼다
  const loadStanding = useCallback(() => {
    if (!id) return;
    fetchStanding(id).then((r) => (r.ok ? setStanding(r.value) : setMessage(r.message)));
  }, [id, fetchStanding]);

  const loadMembers = useCallback(() => {
    if (!id) return;
    fetchMembers(id).then((r) => {
      if (!r.ok) {
        setMessage(r.message);
        return;
      }
      setMembers(r.value);
      // 그룹원과의 친구 상태(친구 신청 버튼)
      fetchFriendStates(r.value.filter((m) => !m.isMe).map((m) => m.userId)).then(setFriendStates);
    });
  }, [id, fetchMembers, fetchFriendStates]);

  // 화면에 들어올 때마다 새로 받고, 본 시각을 남긴다(그룹 목록의 새 인증 수가 0이 된다)
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      loadFeed();
      markSeen(id);
    }, [id, loadFeed, markSeen]),
  );

  useEffect(() => {
    if (tab === 'standing') loadStanding();
    if (tab === 'members') loadMembers();
  }, [tab, loadStanding, loadMembers]);

  const replace = (p: Proof) => setFeed((f) => (f ? { ...f, items: f.items.map((x) => (x.id === p.id ? p : x)) } : f));
  const drop = (proofId: string) => setFeed((f) => (f ? { ...f, items: f.items.filter((x) => x.id !== proofId) } : f));

  const vote = async (p: Proof, v: Vote | null) => {
    replace(withVote(p, v));
    feedback.tap();
    const r = await sendVote(p.id, v);
    if (!r.ok) {
      replace(p);
      setMessage(r.message);
      feedback.deny();
    }
  };

  const menuActions = (p: Proof): SheetAction[] => {
    const acts: SheetAction[] = [];
    if (!p.isMine) {
      acts.push({ label: '신고하기', onPress: () => setReporting(p) });
      acts.push({ label: `${p.nickname} 차단하기`, danger: true, onPress: () => setDialog({ kind: 'block', proof: p }) });
    }
    if (p.isMine || group?.isOwner) acts.push({ label: '인증 지우기', danger: true, onPress: () => setDialog({ kind: 'delete', proof: p }) });
    return acts;
  };

  const waiting = (feed?.items ?? []).filter((p) => !p.isMine && !p.myVote && votingOpen(p.createdAt, now) && p.approvals <= p.doubts).length;

  if (loaded && !group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar title="그룹" onLead={() => router.back()} />
        <View style={styles.content}>
          <Text style={[type.body, styles.secondary]}>이 그룹에 들어가 있지 않아요. 나갔거나 내보내졌을 수 있어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <View style={styles.headerBlock}>
      {group ? <ThemeBadge theme={group.theme} label={group.themeLabel} /> : null}
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </View>
      {message ? (
        <Pressable onPress={() => setMessage(null)} accessibilityRole="alert" style={styles.errorBox}>
          <Text style={[type.label, styles.error]}>{message}</Text>
        </Pressable>
      ) : null}
      {notice ? (
        <Pressable onPress={() => setNotice(null)} accessibilityRole="alert" style={styles.banner}>
          <Text style={[type.label, styles.brand]}>{notice}</Text>
        </Pressable>
      ) : null}

      {tab === 'feed' && pot !== null ? (
        <View style={styles.pot} accessible accessibilityLabel={`이번 주 금고 ${pot}냥`}>
          <Text style={[type.label, styles.secondary]}>이번 주 금고</Text>
          <Text style={[type.numberL, styles.ink]}>{pot.toLocaleString('ko-KR')}냥</Text>
          <Text style={[type.caption, styles.secondary]}>인정 못 받은 보증금이 모여요. 월요일 0시에 이번 주 인정받은 사람끼리 인정 수만큼 나눠요.</Text>
        </View>
      ) : null}
      {tab === 'feed' && waiting > 0 ? (
        <View style={styles.banner}>
          <Text style={[type.label, styles.brand]}>인정을 기다리는 친구 인증이 {waiting}개 있어요</Text>
        </View>
      ) : null}
      {tab === 'feed' && feed && feed.items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[type.headline, styles.ink]}>아직 올라온 인증이 없어요</Text>
          <Text style={[type.body, styles.secondary]}>할 일을 상환하면 사진으로 인증할 수 있어요. 친구가 인정하면 냥을 50% 더 받아요.</Text>
        </View>
      ) : null}

      {tab === 'standing' ? <StandingList rows={standing} /> : null}
      {tab === 'members' ? (
        <MemberList
          rows={members}
          friendStates={friendStates}
          onFriend={async (m) => {
            const r = await sendToUser(m.userId, 'group');
            if (!r.ok) setMessage(r.message);
            else {
              setNotice(r.value === 'friends' ? `${m.nickname}님과 친구가 됐어요` : `${m.nickname}님에게 친구 신청을 보냈어요`);
              feedback.buy();
            }
            loadMembers();
          }}
          onToggleBlock={async (m) => {
            const r = m.blocked ? await unblock(m.userId) : await block(m.userId);
            if (!r.ok) setMessage(r.message);
            loadMembers();
            loadFeed();
          }}
        />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar
        title={group?.name ?? '그룹'}
        onLead={() => router.back()}
        action="설정"
        onAction={() => router.push({ pathname: '/group-settings/[id]', params: { id: id! } })}
      />
      <FlatList
        data={tab === 'feed' ? (feed?.items ?? []) : []}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        renderItem={({ item }) => (
          <ProofCard proof={item} photoUrl={feed?.urls[item.photoPath]} now={now} onVote={(v) => vote(item, v)} onMore={() => setMenu(item)} />
        )}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (tab === 'feed' && feed && !feed.done && !loading) loadFeed(feed);
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!feed}
            onRefresh={() => {
              if (tab === 'feed') loadFeed();
              if (tab === 'standing') loadStanding();
              if (tab === 'members') loadMembers();
            }}
          />
        }
      />

      <ActionSheet visible={!!menu} actions={menu ? menuActions(menu) : []} onClose={() => setMenu(null)} />
      <ActionSheet
        visible={!!reporting}
        title="어떤 문제가 있나요?"
        actions={REPORT_REASONS.map((r) => ({
          label: r.label,
          onPress: async () => {
            if (!reporting) return;
            const res = await report(reporting.id, r.code);
            if (res.ok) setNotice('신고했어요. 두 명이 신고하면 바로 숨겨지고, 운영자가 24시간 안에 확인해요.');
            else setMessage(res.message);
          },
        }))}
        onClose={() => setReporting(null)}
      />
      <ConfirmSheet
        visible={dialog?.kind === 'block'}
        title={dialog ? `${josa(dialog.proof.nickname, '을', '를')} 차단할까요?` : ''}
        message="이 사람의 인증이 내 피드에서 보이지 않고, 이 사람은 내 인증에 투표할 수 없어요. 그룹원 탭에서 풀 수 있어요."
        confirmLabel="차단하기"
        danger
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.kind !== 'block') return;
          const target = dialog.proof;
          setDialog(null);
          const r = await block(target.userId);
          if (!r.ok) setMessage(r.message);
          else setFeed((f) => (f ? { ...f, items: f.items.filter((x) => x.userId !== target.userId) } : f));
        }}
      />
      <ConfirmSheet
        visible={dialog?.kind === 'delete'}
        title="인증을 지울까요?"
        message="사진과 투표가 함께 지워지고 되돌릴 수 없어요. 통과한 인증이었다면 보너스 냥과 그룹 점수도 빠져요."
        confirmLabel="지우기"
        danger
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.kind !== 'delete') return;
          const target = dialog.proof;
          setDialog(null);
          const r = await removeProof(target);
          if (r.ok) drop(target.id);
          else setMessage(r.message);
        }}
      />
    </SafeAreaView>
  );
}

function StandingList({ rows }: { rows: GroupStanding[] | null }) {
  if (!rows) return <Text style={[type.caption, styles.muted]}>순위를 불러오는 중이에요</Text>;
  return (
    <View style={styles.section}>
      <Text style={[type.headline, styles.ink]}>이번 주 그룹 순위</Text>
      <Text style={[type.caption, styles.secondary]}>
        이번 주에 친구에게 인정받은 인증 횟수로 겨뤄요. 같으면 먼저 채운 사람이 위예요.
      </Text>
      <View style={styles.list}>
        {rows.map((r, i) => (
          <View
            key={r.userId}
            style={[styles.rankRow, i > 0 && styles.rowBorder]}
            accessible
            accessibilityLabel={`${r.rank}등 ${r.nickname}${r.isMe ? ', 나' : ''}. 인증 ${r.passed}번`}>
            <Text style={[type.numberM, styles.rank]}>{r.rank}</Text>
            <NameplateBackground plate={r.nameplate} />
            {r.isMe ? <View style={styles.meBar} /> : null}
            <View style={styles.who}>
              <View style={styles.nameRow}>
                <Text style={[type.label, styles.ink, nameplateNameStyle(r.nameplate)]}>{r.isMe ? `${r.nickname} (나)` : r.nickname}</Text>
                <NameplateStamp plate={r.nameplate} />
              </View>
              {r.creditScore !== null ? <GradeBadge score={r.creditScore} size="s" /> : null}
            </View>
            <View style={styles.score}>
              <Text style={[type.headline, styles.ink]}>인증 {r.passed}번</Text>
              {r.passed === 0 ? <Text style={[type.caption, styles.muted]}>이번 주에 인정받은 인증이 없어요</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const FRIEND_LABEL: Partial<Record<FriendState, string>> = { none: '친구 신청', received: '친구 수락', sent: '신청함', friend: '친구' };

function MemberList({
  rows,
  friendStates,
  onFriend,
  onToggleBlock,
}: {
  rows: Member[] | null;
  friendStates: Record<string, FriendState>;
  onFriend: (m: Member) => void;
  onToggleBlock: (m: Member) => void;
}) {
  if (!rows) return <Text style={[type.caption, styles.muted]}>그룹원을 불러오는 중이에요</Text>;
  return (
    <View style={styles.list}>
      {rows.map((m, i) => (
        <View key={m.userId} style={[styles.rankRow, i > 0 && styles.rowBorder]}>
          <NameplateBackground plate={m.blocked ? 'none' : m.nameplate} />
          <View style={styles.who}>
            <Text style={[type.label, styles.ink, nameplateNameStyle(m.nameplate)]}>
              {m.isMe ? `${m.nickname} (나)` : m.nickname}
              {m.isOwner ? '  방장' : ''}
            </Text>
            {m.creditScore !== null ? <GradeBadge score={m.creditScore} size="s" /> : null}
          </View>
          {!m.isMe && !m.blocked && friendStates[m.userId] && FRIEND_LABEL[friendStates[m.userId]] ? (
            friendStates[m.userId] === 'none' || friendStates[m.userId] === 'received' ? (
              <Pressable onPress={() => onFriend(m)} accessibilityRole="button" hitSlop={8} style={styles.friendPill}>
                <Text style={[type.label, styles.onBrand]}>{FRIEND_LABEL[friendStates[m.userId]]}</Text>
              </Pressable>
            ) : (
              <Text style={[type.label, styles.muted]}>{FRIEND_LABEL[friendStates[m.userId]]}</Text>
            )
          ) : null}
          {!m.isMe ? (
            <Pressable onPress={() => onToggleBlock(m)} accessibilityRole="button" hitSlop={8}>
              <Text style={[type.label, m.blocked ? styles.brand : styles.muted]}>{m.blocked ? '차단 풀기' : '차단'}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  content: { ...layout.content, gap: 0 },
  headerBlock: { gap: 16, marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8 },
  gap: { height: 16 },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
  brand: { color: color.brandPrimary },
  onBrand: { color: color.textOnPrimary },
  friendPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: color.brandPrimary },
  error: { color: color.debtFg },
  errorBox: { padding: 12, borderRadius: radius.md, backgroundColor: color.debtBg },
  pot: { gap: 2, padding: 14, borderRadius: radius.lg, backgroundColor: color.mascotCream, borderWidth: stroke.hairline, borderColor: color.borderDefault },
  banner: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.brandSoft },
  empty: { ...layout.panel, gap: 8, padding: 20 },
  section: { gap: 10 },
  list: layout.list,
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, overflow: 'hidden' },
  meBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color.brandPrimary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  rank: { width: 20, color: color.textPrimary },
  who: { flex: 1, gap: 4, alignItems: 'flex-start' },
  score: { alignItems: 'flex-end' },
}));
