import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Mascot } from '@/components/Mascot';
import { NameplateBorder, NameplateStamp, nameplateNameStyle } from '@/components/Nameplate';
import { TopBar } from '@/components/TopBar';
import { activityLine, daysSince, type FriendProfile } from '@/domain/friends';
import { useFriends } from '@/store/friends';
import { useGroups } from '@/store/groups';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, themed, type } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

type Dialog = 'remove' | 'block' | null;

/** TI-SCR-23 친구 프로필 (FR-106, FR-107). 이름과 숫자 기록만 보인다. 피그마 155:3591 */
export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { friends, profile, remove, cheer, cheeredToday } = useFriends();
  const { block } = useGroups();
  const { today } = useTodos();
  const known = friends.find((f) => f.userId === id);
  // undefined: 받는 중, null: 친구가 아니거나 없음
  const [data, setData] = useState<{ id: string; value: FriendProfile | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [cheered, setCheered] = useState(false);

  useEffect(() => {
    if (!id) return;
    cheeredToday().then((s) => setCheered(s.has(id)));
  }, [id, cheeredToday]);

  const sendCheer = async () => {
    if (!id || cheered) return;
    const r = await cheer(id);
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    setCheered(r.value !== 'not_friend');
    setMessage(r.value === 'sent' ? `${name}님에게 응원을 보냈어요` : r.value === 'already' ? '오늘은 이미 응원했어요. 내일 또 보내요' : '친구가 아니라 보낼 수 없어요');
  };

  useEffect(() => {
    if (!id) return;
    let active = true;
    profile(id).then((r) => {
      if (!active) return;
      if (r.ok) setData({ id, value: r.value });
      else setMessage(r.message);
    });
    return () => {
      active = false;
    };
  }, [id, profile]);

  const p = data && data.id === id ? data.value : undefined;
  const name = p?.name ?? known?.name ?? '';
  const line = p ? activityLine(p, today) : null;

  const leave = async (andBlock: boolean) => {
    if (!id) return;
    setDialog(null);
    const r = await remove(id);
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    if (andBlock) {
      const b = await block(id);
      if (!b.ok) {
        setMessage(b.message);
        return;
      }
    }
    goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title={name} onLead={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {message ? (
          <View style={styles.errorBox}>
            <Text style={[type.label, styles.error]} accessibilityRole="alert">
              {message}
            </Text>
          </View>
        ) : null}

        {p === undefined && !message ? <Text style={[type.caption, styles.muted]}>불러오는 중이에요</Text> : null}
        {p === null ? (
          <View style={styles.empty}>
            <Text style={[type.headline, styles.ink]}>친구가 아니에요</Text>
            <Text style={[type.body, styles.secondary]}>친구를 끊었거나 상대가 계정을 지웠어요.</Text>
          </View>
        ) : null}

        {p ? (
          <>
            <View style={styles.hero}>
              <Mascot size={96} />
              <View style={[styles.plate, p.nameplate === 'none' && styles.plateNone]}>
                <NameplateBorder plate={p.nameplate} radius={14} />
                <Text style={[type.title, styles.ink, nameplateNameStyle(p.nameplate)]}>{p.name}</Text>
                <NameplateStamp plate={p.nameplate} />
              </View>
              <Text style={[type.caption, styles.secondary]}>친구가 된 지 {daysSince(p.since, today)}일째</Text>
              {line ? <Text style={[type.label, styles.secondary]}>{line.text}</Text> : null}
            </View>

            <View style={styles.stats} accessibilityLabel={`이번 주 ${p.doneWeek}건 끝냄, 지금 연체 ${p.overdueNow}건, 인증 통과 ${p.verifiedWeek}번`}>
              <Stat label="이번 주 끝냄" value={`${p.doneWeek}건`} tone={p.doneWeek > 0 ? color.okFg : color.textPrimary} />
              <Stat label="지금 연체" value={`${p.overdueNow}건`} tone={p.overdueNow > 0 ? color.debtFg : color.textPrimary} />
              <Stat label="인증 통과" value={`${p.verifiedWeek}번`} tone={color.textPrimary} />
            </View>
            <Text style={[type.caption, styles.muted]}>할 일 제목은 친구에게도 보이지 않아요. 숫자만 보여요.</Text>

            {p.commonGroups.length ? (
              <View style={styles.section}>
                <Text style={[type.label, styles.secondary]}>함께 있는 그룹</Text>
                <View style={styles.list}>
                  {p.commonGroups.map((g, i) => (
                    <View key={g + i} style={[styles.groupRow, i > 0 && styles.rowBorder]}>
                      <Text style={[type.label, styles.ink]}>{g}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <Button label={cheered ? '오늘 응원했어요' : '응원 보내기'} onPress={sendCheer} disabled={cheered} />
            <Text style={[type.caption, styles.muted]}>같은 친구에게 하루 한 번 보낼 수 있어요. 친구 알림을 끈 사람에게는 알림이 가지 않아요.</Text>

            <View style={styles.footer}>
              <Button label="친구 끊기" variant="secondary" onPress={() => setDialog('remove')} />
              <Button label="차단" variant="danger" onPress={() => setDialog('block')} />
            </View>
          </>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={dialog === 'remove'}
        title={`${name}님과 친구를 끊을까요?`}
        message="서로의 친구 목록에서 빠져요. 상대에게 알리지 않아요."
        confirmLabel="친구 끊기"
        danger
        onConfirm={() => leave(false)}
        onCancel={() => setDialog(null)}
      />
      <ConfirmSheet
        visible={dialog === 'block'}
        title={`${name}님을 차단할까요?`}
        message="친구가 끊기고 다시 신청할 수 없어요. 같은 그룹에 있으면 그 사람의 인증도 보이지 않아요."
        confirmLabel="차단"
        danger
        onConfirm={() => leave(true)}
        onCancel={() => setDialog(null)}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[type.headline, { color: tone }]}>{value}</Text>
      <Text style={[type.caption, styles.secondary]}>{label}</Text>
    </View>
  );
}

const styles = themed(() => ({
  // 이름을 이름표 테두리 안에 둔다. 이름표가 없으면 테두리 없이 이름만
  plate: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 16, borderRadius: 14, backgroundColor: color.bgSurface },
  plateNone: { backgroundColor: 'transparent' },
  safe: layout.screen,
  content: layout.content,
  section: layout.section,
  hero: { alignItems: 'center', gap: 6, paddingTop: 8 },
  stats: { ...layout.panel, flexDirection: 'row', paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  list: layout.list,
  groupRow: { paddingVertical: 12, paddingHorizontal: 16 },
  rowBorder: { borderTopWidth: 1, borderTopColor: color.borderDefault },
  footer: { gap: 12, paddingTop: 8 },
  empty: { ...layout.panel, gap: 8, padding: 20 },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
  error: { color: color.debtFg },
  errorBox: { padding: 12, borderRadius: radius.md, backgroundColor: color.debtBg },
}));
