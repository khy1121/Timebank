import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { NameplateBorder, NameplateStamp, nameplateNameStyle } from '@/components/Nameplate';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import {
  activityLine,
  DISPLAY_NAME_MAX,
  displayNameError,
  FRIEND_LIMIT,
  friendShareMessage,
  requestOrigin,
  sendResultMessage,
  sortFriends,
  type FriendSort,
  type KakaoMatch,
  type Tone,
} from '@/domain/friends';
import { codeFromText, CODE_LENGTH, isCompleteCode, normalizeCode } from '@/domain/groups';
import { feedback } from '@/lib/feedback';
import { useFriends } from '@/store/friends';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, inputType, live, radius, stroke, themed, type } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

const TONE: Record<Tone, string> = live(() => ({
  ok: color.okFg,
  warn: color.accentCoinDeep,
  bad: color.debtFg,
  muted: color.textTertiary,
}));

/**
 * TI-SCR-21·22 친구 (FR-103~107). 1·2단계는 한 화면에 둔다: 내 코드와 공유, 코드로 신청, 받은·보낸 신청, 친구 목록.
 * 친구 코드 링크(todointerest://friends?code=...)로 오면 코드가 채워져 있다. 피그마 155:3386, 155:3500
 */
export default function FriendsScreen() {
  const params = useLocalSearchParams<{ code?: string; editName?: string }>();
  const { me, friends, requests, loaded, refresh, sendByCode, sendToUser, respond, cancel, rotateCode, setName, findKakaoFriends } = useFriends();
  const { today } = useTodos();
  const [code, setCode] = useState(() => (params.code ? normalizeCode(params.code) : ''));
  const [sort, setSort] = useState<FriendSort>('active');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(params.editName === '1');
  const [nameDraft, setNameDraft] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [rotating, setRotating] = useState(false);
  // 카카오톡 친구 중 앱을 쓰는 사람. null: 아직 찾지 않음
  const [kakao, setKakao] = useState<KakaoMatch[] | null>(null);
  const [finding, setFinding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const incoming = requests.filter((r) => r.incoming);
  const outgoing = requests.filter((r) => !r.incoming);
  const sorted = sortFriends(friends, sort);
  const complete = isCompleteCode(code);

  const say = (ok: boolean, text: string) => {
    setNotice(ok ? text : null);
    setMessage(ok ? null : text);
  };

  const share = async () => {
    if (!me) return;
    const link = Linking.createURL('friends', { queryParams: { code: me.code } });
    try {
      await Share.share({ message: friendShareMessage(me.code, link) });
    } catch {
      // 공유 창을 닫았거나 웹에서 지원하지 않으면 코드를 직접 알려 주면 된다
    }
  };

  const submit = async () => {
    if (!complete || busy) return;
    setBusy(true);
    const r = await sendByCode(code);
    setBusy(false);
    if (!r.ok) {
      say(false, r.message);
      feedback.deny();
      return;
    }
    say(r.value !== 'not_found', sendResultMessage(r.value));
    if (r.value === 'not_found') feedback.deny();
    else {
      feedback.buy();
      setCode('');
    }
  };

  const answer = async (id: string, accept: boolean) => {
    const r = await respond(id, accept);
    if (!r.ok) say(false, r.message);
    else if (accept) {
      say(true, '친구가 됐어요');
      feedback.buy();
    }
  };

  const findKakao = async () => {
    if (finding) return;
    setFinding(true);
    const r = await findKakaoFriends();
    setFinding(false);
    if (!r.ok) {
      say(false, r.message);
      return;
    }
    setKakao(r.value);
  };

  const askKakao = async (m: KakaoMatch) => {
    const r = await sendToUser(m.userId, 'kakao');
    if (!r.ok) {
      say(false, r.message);
      return;
    }
    say(true, r.value === 'friends' ? `${m.name}님과 친구가 됐어요` : `${m.name}님에게 친구 신청을 보냈어요`);
    feedback.buy();
    setKakao((list) => list && list.map((x) => (x.userId === m.userId ? { ...x, state: r.value === 'friends' ? 'friend' : 'sent' } : x)));
  };

  const saveName = async () => {
    setNameTouched(true);
    if (displayNameError(nameDraft)) return;
    const r = await setName(nameDraft);
    if (!r.ok) {
      say(false, r.message);
      return;
    }
    setEditing(false);
    say(true, '이름을 바꿨어요');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="친구" onLead={goBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {message ? (
            <View style={styles.errorBox}>
              <Text style={[type.label, styles.error]} accessibilityRole="alert">
                {message}
              </Text>
            </View>
          ) : null}
          {notice ? (
            <View style={styles.banner}>
              <Text style={[type.label, styles.brand]}>{notice}</Text>
            </View>
          ) : null}

          {/* 내 이름과 코드 */}
          <View style={styles.card}>
            {editing ? (
              <View style={styles.section}>
                <TextField
                  label="친구에게 보일 이름"
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  maxLength={DISPLAY_NAME_MAX}
                  placeholder={me?.name ?? '예: 헌영'}
                  hint="친구 목록과 순위표에 이 이름이 보여요. 전체 순위표에는 첫 글자만 보여요."
                  error={nameTouched ? displayNameError(nameDraft) : null}
                />
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Button label="취소" variant="secondary" onPress={() => setEditing(false)} />
                  </View>
                  <View style={styles.flex}>
                    <Button label="저장" onPress={saveName} />
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.nameRow}
                onPress={() => {
                  setNameDraft(me?.name ?? '');
                  setNameTouched(false);
                  setEditing(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="이름 바꾸기">
                <Text style={[type.label, styles.secondary]}>내 이름</Text>
                <Text style={[type.headline, styles.ink, styles.flex]} numberOfLines={1}>
                  {me?.name ?? '…'}
                </Text>
                <Text style={[type.label, styles.brand]}>바꾸기</Text>
              </Pressable>
            )}
            <View style={styles.codeBox}>
              <Text style={[type.caption, styles.secondary]}>내 친구 코드</Text>
              <Text style={[type.display, styles.ink, styles.code]} accessibilityLabel={me ? `내 친구 코드 ${me.code.split('').join(' ')}` : undefined}>
                {me?.code ?? '······'}
              </Text>
              <Text style={[type.caption, styles.secondary, styles.center]}>이 코드를 받은 사람이 나에게 친구 신청을 할 수 있어요.</Text>
            </View>
            <Button label="코드 보내기" onPress={share} disabled={!me} />
            <Button label="카드로 만들어 공유 (인스타그램 등)" variant="secondary" onPress={() => router.push('/share-card')} disabled={!me} />
            <Pressable onPress={() => setRotating(true)} accessibilityRole="button" hitSlop={8} style={styles.center}>
              <Text style={[type.label, styles.muted]}>코드 바꾸기</Text>
            </Pressable>
          </View>

          {/* 코드로 신청 */}
          <View style={styles.section}>
            <Text style={[type.label, styles.secondary]}>친구 코드로 신청</Text>
            <View style={styles.row}>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.length > CODE_LENGTH + 2 ? (codeFromText(v) ?? normalizeCode(v)) : normalizeCode(v))}
                onSubmitEditing={submit}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="K2M9QX"
                placeholderTextColor={color.textTertiary}
                accessibilityLabel="친구 코드"
                returnKeyType="send"
                style={[inputType.title, styles.codeInput, { borderColor: complete ? color.inkOutline : color.borderDefault }]}
              />
              <View style={styles.askButton}>
                <Button label={busy ? '…' : '신청'} variant="secondary" onPress={submit} disabled={!complete || busy} />
              </View>
            </View>
          </View>

          {/* 카카오톡 친구 (FR-108) */}
          <View style={styles.section}>
            <Text style={[type.label, styles.secondary]}>카카오톡 친구</Text>
            {kakao === null ? (
              <>
                <Button label={finding ? '카카오에서 찾는 중…' : '카카오톡 친구 찾기'} variant="kakao" onPress={findKakao} disabled={finding} />
                <Text style={[type.caption, styles.muted]}>앱을 쓰는 카카오톡 친구만 보여요. 친구 목록은 저장하지 않아요.</Text>
              </>
            ) : kakao.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[type.body, styles.secondary]}>아직 앱을 쓰는 카카오톡 친구가 없어요. 위의 코드를 보내 보세요.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {kakao.map((m, i) => (
                  <View key={m.userId} style={[styles.listRow, i > 0 && styles.rowBorder]}>
                    <View style={styles.who}>
                      <Text style={[type.label, styles.ink]}>{m.name}</Text>
                      {m.kakaoName ? <Text style={[type.caption, styles.muted]}>카카오톡: {m.kakaoName}</Text> : null}
                    </View>
                    {m.state === 'none' || m.state === 'received' ? (
                      <Pressable onPress={() => askKakao(m)} accessibilityRole="button" hitSlop={8} style={styles.pill}>
                        <Text style={[type.label, styles.onBrand]}>{m.state === 'received' ? '수락' : '신청'}</Text>
                      </Pressable>
                    ) : (
                      <Text style={[type.label, styles.muted]}>{m.state === 'friend' ? '친구' : '신청함'}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 받은 신청 */}
          {incoming.length ? (
            <View style={styles.section}>
              <Text style={[type.label, styles.secondary]}>받은 신청 {incoming.length}</Text>
              <View style={styles.list}>
                {incoming.map((r, i) => (
                  <View key={r.id} style={[styles.listRow, i > 0 && styles.rowBorder]}>
                    <View style={styles.who}>
                      <Text style={[type.label, styles.ink]}>{r.name}</Text>
                      <Text style={[type.caption, styles.muted]} numberOfLines={1}>
                        {requestOrigin(r)}
                      </Text>
                    </View>
                    <Pressable onPress={() => answer(r.id, true)} accessibilityRole="button" hitSlop={8} style={styles.pill}>
                      <Text style={[type.label, styles.onBrand]}>수락</Text>
                    </Pressable>
                    <Pressable onPress={() => answer(r.id, false)} accessibilityRole="button" hitSlop={8}>
                      <Text style={[type.label, styles.muted]}>거절</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 보낸 신청 */}
          {outgoing.length ? (
            <View style={styles.section}>
              <Text style={[type.label, styles.secondary]}>보낸 신청 {outgoing.length}</Text>
              <View style={styles.list}>
                {outgoing.map((r, i) => (
                  <View key={r.id} style={[styles.listRow, i > 0 && styles.rowBorder]}>
                    <View style={styles.who}>
                      <Text style={[type.label, styles.ink]}>{r.name}</Text>
                      <Text style={[type.caption, styles.muted]}>기다리는 중</Text>
                    </View>
                    <Pressable onPress={async () => { const x = await cancel(r.id); if (!x.ok) say(false, x.message); }} accessibilityRole="button" hitSlop={8}>
                      <Text style={[type.label, styles.muted]}>취소</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 친구 목록 */}
          <View style={styles.section}>
            <View style={styles.headRow}>
              <Text style={[type.label, styles.secondary, styles.flex]}>
                친구 {friends.length}명 <Text style={styles.muted}>(최대 {FRIEND_LIMIT}명)</Text>
              </Text>
              <Chip label="최근 활동순" selected={sort === 'active'} onPress={() => setSort('active')} />
              <Chip label="이름순" selected={sort === 'name'} onPress={() => setSort('name')} />
            </View>
            {!loaded ? (
              <Text style={[type.caption, styles.muted]}>친구를 불러오는 중이에요</Text>
            ) : sorted.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[type.headline, styles.ink]}>아직 친구가 없어요</Text>
                <Text style={[type.body, styles.secondary]}>위의 코드를 보내 친구를 불러 보세요. 그룹원에게는 그룹 화면에서 바로 신청할 수 있어요.</Text>
              </View>
            ) : (
              <View style={styles.friendList}>
                {sorted.map((f) => {
                  const line = activityLine(f, today);
                  return (
                    <Pressable
                      key={f.userId}
                      onPress={() => router.push({ pathname: '/friend/[id]', params: { id: f.userId } })}
                      accessibilityRole="button"
                      style={styles.friendRow}>
                      <NameplateBorder plate={f.nameplate} radius={PLATE_RADIUS} />
                      <View style={styles.who}>
                        <View style={styles.plateName}>
                          <Text style={[type.label, styles.ink, nameplateNameStyle(f.nameplate)]}>{f.name}</Text>
                          <NameplateStamp plate={f.nameplate} />
                        </View>
                        <Text style={[type.caption, { color: TONE[line.tone] }]}>{line.text}</Text>
                      </View>
                      <Text style={[type.headline, styles.muted]}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={rotating}
        title="친구 코드를 바꿀까요?"
        message="바꾸면 예전 코드로는 신청할 수 없어요. 이미 친구인 사람은 그대로예요."
        confirmLabel="바꾸기"
        onConfirm={async () => {
          setRotating(false);
          const r = await rotateCode();
          say(r.ok, r.ok ? '친구 코드를 바꿨어요' : r.message);
        }}
        onCancel={() => setRotating(false)}
      />
    </SafeAreaView>
  );
}

const PLATE_RADIUS = 16;

const styles = themed(() => ({
  safe: layout.screen,
  flex: { flex: 1 },
  content: layout.content,
  section: layout.section,
  card: { ...layout.card, padding: 16, gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeBox: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  code: { letterSpacing: 4 },
  center: { alignSelf: 'center', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  headRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  codeInput: {
    flex: 1,
    // 웹의 입력칸은 글자 수만큼 넓어지려 해서 버튼을 밀어낸다
    minWidth: 0,
    flexBasis: 0,
    backgroundColor: color.bgSurface,
    borderWidth: stroke.outline,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: color.textPrimary,
    letterSpacing: 4,
  },
  askButton: { width: 92 },
  list: layout.list,
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  // 친구 목록은 순위표처럼 줄마다 떨어진 카드. 이름표는 테두리로 보인다
  friendList: { gap: 6 },
  plateName: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: color.bgSurface, borderRadius: PLATE_RADIUS, borderWidth: 1, borderColor: color.borderDefault },
  rowBorder: { borderTopWidth: stroke.hairline, borderTopColor: color.borderDefault },
  who: { flex: 1, gap: 2 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: color.brandPrimary },
  empty: { ...layout.panel, gap: 8, padding: 20 },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
  brand: { color: color.brandPrimary },
  onBrand: { color: color.textOnPrimary },
  error: { color: color.debtFg },
  errorBox: { padding: 12, borderRadius: radius.md, backgroundColor: color.debtBg },
  banner: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.brandSoft },
}));
