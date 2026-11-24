import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { OptionRow } from '@/components/OptionRow';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { CAPTION_MAX, PHOTO_LONG_EDGE, PHOTO_QUALITY, proofBonus, proofHint } from '@/domain/groups';
import { josa } from '@/domain/korean';
import { feedback } from '@/lib/feedback';
import { useGroups } from '@/store/groups';
import { useOpenProofs } from '@/store/openProofs';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, radius, stroke, themed, type } from '@/theme/tokens';

/** 처음 인증을 올리기 전에 한 번 동의받는다 (FR-083) */
const RULES = [
  '할 일을 끝낸 모습이 보이는 사진을 올려요.',
  '다른 사람이 불쾌할 사진, 얼굴이나 개인정보가 드러나는 사진은 올리지 않아요.',
  '신고가 두 번 들어오면 인증이 숨겨지고, 운영자가 확인해요.',
  '사진과 메모는 같은 그룹 사람만 볼 수 있어요.',
];

type Photo = { uri: string; base64: string };

/** TI-SCR-17 인증 올리기. 상환 직후에 뜬다 (FR-078). 피그마 53:1754 */
export default function ProofScreen() {
  const { repaymentId } = useLocalSearchParams<{ repaymentId: string }>();
  const { repayments, flush } = useTodos();
  const { groups: allGroups, rulesAgreed, agreeRules, postProof } = useGroups();
  const repayment = repayments.find((r) => r.id === repaymentId);
  // 이미 인증을 올린 그룹은 빼고 보여준다. 상환 내역에서 다시 들어온 경우다
  const openIds = useOpenProofs().get(repaymentId ?? '');
  const groups = openIds ? allGroups.filter((g) => openIds.includes(g.id)) : allGroups;
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [caption, setCaption] = useState('');
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기본은 모든 그룹에 올린다
  const selected = picked ?? new Set(groups.map((g) => g.id));
  // 올릴 그룹들의 테마가 같으면 그 테마에 맞게, 다르면 일반 안내
  const themes = [...new Set(groups.filter((g) => selected.has(g.id)).map((g) => g.theme))];
  const hint = proofHint(themes.length === 1 ? themes[0] : 'etc');
  const onTime = repayment ? repayment.overdueDays === 0 : false;
  const bonus = repayment ? proofBonus(repayment.principal, onTime) : 0;

  const close = () => router.back();

  const pick = async (from: 'camera' | 'library') => {
    setError(null);
    try {
      if (from === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('카메라를 쓸 수 없어요. 기기 설정에서 카메라 권한을 켜 주세요.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
      const result = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      // 긴 변을 1080px로 줄이고 품질 70%로 저장한다(장당 약 150KB)
      const ctx = ImageManipulator.manipulate(asset.uri);
      const longEdge = Math.max(asset.width, asset.height);
      if (longEdge > PHOTO_LONG_EDGE) ctx.resize(asset.width >= asset.height ? { width: PHOTO_LONG_EDGE } : { height: PHOTO_LONG_EDGE });
      const image = await ctx.renderAsync();
      const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG, base64: true });
      if (!saved.base64) throw new Error('base64 없음');
      setPhoto({ uri: saved.uri, base64: saved.base64 });
    } catch (e) {
      console.warn('사진을 고르지 못했어요', e);
      setError('사진을 불러오지 못했어요. 다른 사진으로 다시 해 주세요.');
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const submit = async () => {
    if (!repaymentId || !photo || busy) return;
    if (selected.size === 0) {
      setError('올릴 그룹을 하나 이상 골라 주세요.');
      return;
    }
    if (!rulesAgreed && !agree) {
      setError('이용 수칙에 동의해야 올릴 수 있어요.');
      return;
    }
    setBusy(true);
    setError(null);
    if (!rulesAgreed) {
      const a = await agreeRules();
      if (!a.ok) {
        setBusy(false);
        setError(a.message);
        return;
      }
    }
    const r = await postProof({ repaymentId, groupIds: [...selected], caption, photoBase64: photo.base64, flush });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      feedback.deny();
      return;
    }
    feedback.buy();
    close();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar lead="close" title="인증 올리기" onLead={close} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[type.title, styles.ink]}>완납! 그룹에 인증할까요?</Text>
          <Text style={[type.body, styles.secondary]}>
            {repayment ? `"${repayment.title}"` : '방금 끝낸 할 일'}, {josa(hint, '을', '를')} 사진으로 보여 주세요.{' '}
            {bonus > 0
              ? `친구가 인정하면 ${bonus.toLocaleString('ko-KR')}냥을 더 받고 그룹 순위에 들어가요.`
              : '친구가 인정하면 그룹 순위에 들어가요. 늦게 갚은 할 일은 보너스가 없어요.'}
          </Text>

          {photo ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" accessibilityLabel="고른 사진" />
              <Pressable onPress={() => setPhoto(null)} accessibilityRole="button" hitSlop={8} style={styles.retake}>
                <Text style={[type.label, styles.brand]}>다시 고르기</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.pickRow}>
              <Pressable onPress={() => pick('camera')} accessibilityRole="button" style={({ pressed }) => [styles.pick, pressed && styles.pressed]}>
                <Text style={[type.headline, styles.ink]}>사진 찍기</Text>
              </Pressable>
              <Pressable onPress={() => pick('library')} accessibilityRole="button" style={({ pressed }) => [styles.pick, pressed && styles.pressed]}>
                <Text style={[type.headline, styles.ink]}>앨범에서 고르기</Text>
              </Pressable>
            </View>
          )}

          <TextField label="한 줄 메모 (안 적어도 돼요)" value={caption} onChangeText={setCaption} maxLength={CAPTION_MAX} placeholder="예: 단어 50개 외움" />

          {groups.length > 1 ? (
            <View style={styles.field}>
              <Text style={[type.label, styles.secondary]}>올릴 그룹</Text>
              {groups.map((g) => (
                <OptionRow key={g.id} label={g.name} selected={selected.has(g.id)} onPress={() => toggle(g.id)} />
              ))}
            </View>
          ) : null}

          {!rulesAgreed ? (
            <View style={styles.rules}>
              <Text style={[type.headline, styles.ink]}>인증 이용 수칙</Text>
              {RULES.map((line) => (
                <Text key={line} style={[type.caption, styles.secondary]}>
                  {'· '}
                  {line}
                </Text>
              ))}
              <OptionRow label="이용 수칙을 읽었고 지킬게요" selected={agree} onPress={() => setAgree(!agree)} />
            </View>
          ) : null}

          {error ? (
            <Text style={[type.label, styles.error]} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label="건너뛰기" variant="secondary" onPress={close} />
            </View>
            <View style={styles.flex}>
              <Button label={busy ? '올리는 중' : '인증 올리기'} disabled={!photo || busy} onPress={submit} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  flex: { flex: 1 },
  content: layout.content,
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  brand: { color: color.brandPrimary },
  error: { color: color.debtFg },
  field: { gap: 8 },
  pickRow: { flexDirection: 'row', gap: 12 },
  pick: {
    flex: 1,
    aspectRatio: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.inkOutline,
    backgroundColor: color.bgSurface,
  },
  pressed: { backgroundColor: color.bgSunken },
  photoWrap: { gap: 8 },
  photo: { aspectRatio: 4 / 3, borderRadius: radius.lg, borderWidth: stroke.outline, borderColor: color.inkOutline },
  retake: { alignSelf: 'flex-end' },
  rules: { gap: 8, padding: 16, borderRadius: radius.lg, backgroundColor: color.mascotCream, borderWidth: stroke.hairline, borderColor: color.borderDefault },
  footer: layout.footer,
  actions: { flexDirection: 'row', gap: 10 },
}));
