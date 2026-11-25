import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { GroupRow } from '@/components/GroupRow';
import { TopBar } from '@/components/TopBar';
import { perksOf } from '@/domain/bank';
import { useGroups } from '@/store/groups';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, themed, type } from '@/theme/tokens';

/** TI-SCR-14 그룹 목록 (FR-075, FR-076). 피그마 53:1511 */
export default function GroupsScreen() {
  const { groups, loaded, refresh } = useGroups();
  // 들 수 있는 그룹 수는 은행 단계를 따른다 (FR-111)
  const { account } = useTodos();
  const MAX_GROUPS = perksOf(account.bankStage).maxGroups;
  const full = groups.length >= MAX_GROUPS;

  // 다른 화면에서 돌아오면 새 인증 수를 다시 받는다
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar lead="none" title="그룹" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.title, styles.ink]}>친한 친구끼리 인증하고 겨뤄요</Text>
        <Text style={[type.body, styles.secondary]}>
          할 일을 끝내고 사진을 올리면 친구가 인정해 줘요. 인정받은 상환만 그룹 순위에 세고, 냥을 50% 더 받아요.
        </Text>

        {groups.map((g) => (
          <GroupRow key={g.id} group={g} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })} />
        ))}

        {loaded && !full ? (
          <View style={styles.slot}>
            <Text style={[type.label, styles.secondary]}>
              {groups.length === 0 ? '아직 든 그룹이 없어요' : `${MAX_GROUPS - groups.length}자리 남았어요`}
            </Text>
            <Text style={[type.caption, styles.muted]}>그룹은 {MAX_GROUPS}개까지 들 수 있어요</Text>
          </View>
        ) : null}
        {!loaded ? <Text style={[type.caption, styles.muted]}>그룹을 불러오는 중이에요</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {full ? <Text style={[type.caption, styles.muted, styles.center]}>그룹을 {MAX_GROUPS}개 모두 채웠어요. 하나를 나가거나 은행을 키우면 새로 들 수 있어요.</Text> : null}
        <Button label="그룹 만들기" disabled={full} onPress={() => router.push('/group-new')} />
        <Button label="초대 코드로 들어가기" variant="secondary" disabled={full} onPress={() => router.push('/group-join')} />
      </View>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  content: layout.content,
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
  center: { textAlign: 'center' },
  slot: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 18,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.borderDefault,
  },
  footer: layout.footer,
}));
