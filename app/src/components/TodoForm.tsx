import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addDays, diffDays, formatKoreanDate } from '@/domain/dates';
import { principalOf, type Importance, type Todo } from '@/domain/interest';
import { inputRuleHint } from '@/domain/messages';
import { canChangeDueDate, TITLE_MAX, validateInput, type TodoInput } from '@/domain/records';
import { groupBonus } from '@/domain/savings';
import { rewardFor } from '@/domain/wallet';
import { useGroups } from '@/store/groups';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, inputType, radius, stroke, themed, type } from '@/theme/tokens';

import { Amount } from './Amount';
import { Chip } from './Chip';
import { CoinMeter } from './CoinMeter';
import { ConfirmSheet } from './ConfirmSheet';
import { SpeechBubble } from './SpeechBubble';
import { TopBar } from './TopBar';
import { goBack } from '@/lib/navigation';
import { REPEAT_BANK_STAGE, REPEAT_LABEL, type Repeat } from '@/domain/repeat';
import type { StoredTodo } from '@/domain/sync';
import { BUNDLE_BANK_STAGE } from '@/domain/bundles';

const LEVELS: Importance[] = [1, 2, 3, 4, 5];
const QUICK = [
  { label: '오늘', offset: 0 },
  { label: '내일', offset: 1 },
  { label: '일주일 뒤', offset: 7 },
] as const;

/**
 * TI-SCR-04 할 일 입력. original이 있으면 수정이다. (FR-010, 011, 020)
 * 등록하면 원금을 건다. 그룹에 들어가 있으면 보증금을 걸 그룹을 고른다(기본 첫 그룹). 피그마 71:421
 * 수정에서 기한을 미루면 연장 수수료를 확인받는다 (시간적금기획서 4.3, 피그마 71:600)
 */
export function TodoForm({ original }: { original?: Todo }) {
  const { today, add, update, account, extendFeeFor } = useTodos();
  const { groups } = useGroups();
  // 그룹이 있으면 보증금으로 거는 것이 기본이다. null이면 혼자 한다
  const [stake, setStake] = useState<string | null | undefined>(undefined);
  const stakeGroupId = stake === undefined ? (groups[0]?.id ?? null) : stake;
  const [askFee, setAskFee] = useState<number | null>(null);
  const [title, setTitle] = useState(original?.title ?? '');
  const [importance, setImportance] = useState<Importance>(original?.importance ?? 3);
  const [dueDate, setDueDate] = useState(original?.dueDate ?? addDays(today, 1));
  const [repeat, setRepeat] = useState<Repeat | null>((original as StoredTodo | undefined)?.repeat ?? null);
  // 반복은 시장 지점부터 (FR-111)
  const canRepeat = account.bankStage >= REPEAT_BANK_STAGE;
  const canBundle = account.bankStage >= BUNDLE_BANK_STAGE;
  const [focused, setFocused] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);

  const dueLocked = original ? !canChangeDueDate(original, today) : false;
  const input: TodoInput = { title, importance, dueDate, repeat };
  const errors = validateInput(input, today, original);
  const principal = principalOf(importance);
  const dirty = original
    ? title !== original.title || importance !== original.importance || dueDate !== original.dueDate || repeat !== ((original as StoredTodo).repeat ?? null)
    : title.trim().length > 0;
  const offset = diffDays(today, dueDate);

  const fee = original ? extendFeeFor(original.id, input) : 0;
  const extendDays = original ? diffDays(original.dueDate, dueDate) : 0;
  const back = principal + rewardFor(principal) + (stakeGroupId ? groupBonus(principal) : 0);

  const commit = () => {
    if (original) update(original.id, input);
    else add(input, stakeGroupId);
    goBack();
  };

  const save = () => {
    if (errors.length) return;
    // 기한을 미루면 수수료를 먼저 확인받는다
    if (fee > 0) {
      setAskFee(fee);
      return;
    }
    commit();
  };

  const close = () => {
    if (dirty) setAskDiscard(true);
    else goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar
        lead="close"
        title={original ? '할 일 수정' : '할 일 추가'}
        onLead={close}
        action={original ? '저장' : '걸기'}
        onAction={save}
        actionDisabled={errors.length > 0}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={[type.headline, styles.question]}>무슨 일인가요?</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="예: 세금 신고 자료 정리"
              placeholderTextColor={color.textTertiary}
              maxLength={TITLE_MAX}
              // 웹에서는 화면이 넘어오는 도중에 초점이 가면 화면이 옆으로 밀리므로 자동 초점을 쓰지 않는다
              autoFocus={!original && Platform.OS !== 'web'}
              returnKeyType="done"
              accessibilityLabel="할 일 제목"
              style={[
                inputType.body,
                styles.input,
                { borderColor: focused ? color.brandPrimary : title ? color.inkOutline : color.borderDefault },
              ]}
            />
            {title.length >= TITLE_MAX - 20 ? (
              <Text style={[type.caption, styles.count]}>
                {title.length}/{TITLE_MAX}
              </Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={[type.headline, styles.question]}>얼마나 중요한가요?</Text>
            <View style={styles.row} accessibilityRole="radiogroup">
              {LEVELS.map((lv) => (
                <Chip
                  key={lv}
                  label={String(lv)}
                  a11yLabel={`중요도 ${lv}, 원금 ${principalOf(lv)}냥`}
                  selected={importance === lv}
                  onPress={() => setImportance(lv)}
                  grow
                />
              ))}
            </View>
            <View style={styles.principal}>
              <CoinMeter level={importance} />
              <View style={styles.principalRight}>
                <Text style={[type.label, styles.muted]}>원금</Text>
                <Amount value={principal} size="L" />
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[type.headline, styles.question]}>언제까지 할까요?</Text>
            {dueLocked ? (
              <Text style={[type.label, styles.locked]}>연체된 할 일은 기한을 바꿀 수 없어요.</Text>
            ) : (
              <View style={styles.rowWrap} accessibilityRole="radiogroup">
                {QUICK.map((q) => (
                  <Chip key={q.label} label={q.label} selected={offset === q.offset} onPress={() => setDueDate(addDays(today, q.offset))} />
                ))}
              </View>
            )}
            <View style={styles.dateRow}>
              <Stepper
                label="하루 앞으로"
                glyph="‹"
                disabled={dueLocked || offset <= 0}
                onPress={() => setDueDate(addDays(dueDate, -1))}
              />
              <Text style={[type.headline, styles.dateText]} accessibilityLabel={`기한 ${formatKoreanDate(dueDate)}`}>
                {formatKoreanDate(dueDate)}
              </Text>
              <Stepper label="하루 뒤로" glyph="›" disabled={dueLocked} onPress={() => setDueDate(addDays(dueDate, 1))} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[type.headline, styles.question]}>반복할까요?</Text>
            <View style={styles.rowWrap} accessibilityRole="radiogroup">
              <Chip label="한 번만" selected={repeat === null} onPress={() => setRepeat(null)} />
              {(['daily', 'weekly'] as const).map((k) => (
                <View key={k} style={!canRepeat && styles.lockedChip} accessibilityState={{ disabled: !canRepeat }}>
                  <Chip label={REPEAT_LABEL[k]} selected={repeat === k} onPress={() => canRepeat && setRepeat(k)} />
                </View>
              ))}
            </View>
            <Text style={[type.caption, styles.muted]}>
              {!canRepeat
                ? '🔒 시장 지점을 열면 반복할 수 있어요'
                : repeat
                  ? `끝내면 ${repeat === 'daily' ? '다음 날' : '일주일 뒤'} 할 일이 같은 원금으로 새로 생겨요.`
                  : '한 번 끝내면 끝나요.'}
            </Text>
          </View>

          {!original && groups.length > 0 ? (
            <View style={styles.field}>
              <Text style={[type.headline, styles.question]}>그룹에 걸까요?</Text>
              <View style={styles.rowWrap} accessibilityRole="radiogroup">
                {groups.map((g) => (
                  <Chip key={g.id} label={g.name} a11yLabel={`${g.name}에 보증금으로 걸기`} selected={stakeGroupId === g.id} onPress={() => setStake(g.id)} />
                ))}
                <Chip label="혼자 하기" selected={stakeGroupId === null} onPress={() => setStake(null)} />
              </View>
              <Text style={[type.caption, styles.muted]}>
                {stakeGroupId
                  ? `친구가 인정하면 ${back.toLocaleString('ko-KR')}냥을 돌려받아요. 인정을 못 받으면 보증금은 그룹 금고로 가요.`
                  : `기한 안에 끝내면 ${back.toLocaleString('ko-KR')}냥을 돌려받아요.`}
              </Text>
            </View>
          ) : null}

          {original && fee > 0 ? (
            <Text style={[type.label, styles.locked]}>
              기한을 {extendDays}일 미루면 연장 수수료 {fee.toLocaleString('ko-KR')}냥이 통장에서 빠져요.
            </Text>
          ) : null}

          {!original ? (

            <Pressable onPress={() => router.push('/bundles')} accessibilityRole="button" style={styles.bundleLink}>

              <Text style={[type.label, styles.bundleText]}>{canBundle ? '할 일 묶음으로 한 번에 넣기 ›' : '🔒 할 일 묶음 (시장 지점을 열면)'}</Text>

            </Pressable>

          ) : null}


          <SpeechBubble text={inputRuleHint(principal, original ? Number.MAX_SAFE_INTEGER : account.cash)} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={askFee !== null}
        title={`기한을 ${extendDays}일 미룰까요?`}
        message={`연장 수수료 ${(askFee ?? 0).toLocaleString('ko-KR')}냥이 통장에서 빠져요. 미룬 하루마다 원금의 5%예요. 그냥 늦게 끝내면 원금이 하루 10%씩 깎여요.`}
        confirmLabel={`${(askFee ?? 0).toLocaleString('ko-KR')}냥 내고 미루기`}
        onConfirm={() => {
          setAskFee(null);
          commit();
        }}
        onCancel={() => setAskFee(null)}
      />

      <ConfirmSheet
        visible={askDiscard}
        title="작성 중인 내용을 버릴까요?"
        message="저장하지 않고 나가면 입력한 내용이 사라져요."
        confirmLabel="버리고 나가기"
        danger
        onConfirm={() => {
          setAskDiscard(false);
          goBack();
        }}
        onCancel={() => setAskDiscard(false)}
      />
    </SafeAreaView>
  );
}

function Stepper({ label, glyph, disabled, onPress }: { label: string; glyph: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={[styles.stepper, disabled && styles.stepperOff]}>
      <Text style={styles.stepperGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = themed(() => ({
  bundleLink: { alignSelf: 'flex-start', paddingVertical: 4 },
  bundleText: { color: color.brandPrimary },
  lockedChip: { opacity: 0.45 },
  safe: layout.screen,
  flex: { flex: 1 },
  content: layout.content,
  field: { gap: 10 },
  question: { color: color.textPrimary },
  input: {
    backgroundColor: color.bgSurface,
    borderWidth: stroke.outline,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: color.textPrimary,
  },
  count: { color: color.textTertiary, alignSelf: 'flex-end' },
  row: { flexDirection: 'row', gap: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  principal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  principalRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muted: { color: color.textSecondary },
  locked: { color: color.debtFg },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.bgSurface,
    borderRadius: radius.lg,
    borderWidth: stroke.hairline,
    borderColor: color.borderDefault,
    padding: 8,
  },
  dateText: { flex: 1, textAlign: 'center', color: color.textPrimary },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bgSunken,
  },
  stepperOff: { opacity: 0.35 },
  stepperGlyph: { fontSize: 24, lineHeight: 28, color: color.textPrimary, fontFamily: type.body.fontFamily },
}));
