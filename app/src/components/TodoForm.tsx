import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addDays, diffDays, formatKoreanDate } from '@/domain/dates';
import { principalOf, type Importance, type Todo } from '@/domain/interest';
import { inputRuleHint } from '@/domain/messages';
import { canChangeDueDate, TITLE_MAX, validateInput, type TodoInput } from '@/domain/records';
import { useTodos } from '@/store/todos';
import { color, radius, stroke, type } from '@/theme/tokens';

import { Amount } from './Amount';
import { Chip } from './Chip';
import { CoinMeter } from './CoinMeter';
import { ConfirmSheet } from './ConfirmSheet';
import { SpeechBubble } from './SpeechBubble';
import { TopBar } from './TopBar';

const LEVELS: Importance[] = [1, 2, 3, 4, 5];
const QUICK = [
  { label: '오늘', offset: 0 },
  { label: '내일', offset: 1 },
  { label: '일주일 뒤', offset: 7 },
] as const;

/** TI-SCR-04 할 일 입력. original이 있으면 수정이다. (FR-010, 011, 020) */
export function TodoForm({ original }: { original?: Todo }) {
  const { today, add, update } = useTodos();
  const [title, setTitle] = useState(original?.title ?? '');
  const [importance, setImportance] = useState<Importance>(original?.importance ?? 3);
  const [dueDate, setDueDate] = useState(original?.dueDate ?? addDays(today, 1));
  const [focused, setFocused] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);

  const dueLocked = original ? !canChangeDueDate(original, today) : false;
  const input: TodoInput = { title, importance, dueDate };
  const errors = validateInput(input, today, original);
  const principal = principalOf(importance);
  const dirty = original
    ? title !== original.title || importance !== original.importance || dueDate !== original.dueDate
    : title.trim().length > 0;
  const offset = diffDays(today, dueDate);

  const save = () => {
    if (errors.length) return;
    if (original) update(original.id, input);
    else add(input);
    router.back();
  };

  const close = () => {
    if (dirty) setAskDiscard(true);
    else router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar
        lead="close"
        title={original ? '할 일 수정' : '할 일 추가'}
        onLead={close}
        action="저장"
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
                type.body,
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

          <SpeechBubble text={inputRuleHint(principal)} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={askDiscard}
        title="작성 중인 내용을 버릴까요?"
        message="저장하지 않고 나가면 입력한 내용이 사라져요."
        confirmLabel="버리고 나가기"
        danger
        onConfirm={() => {
          setAskDiscard(false);
          router.back();
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bgPage },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, gap: 24 },
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
  stepperGlyph: { fontSize: 24, lineHeight: 28, color: color.inkOutline, fontFamily: type.body.fontFamily },
});
