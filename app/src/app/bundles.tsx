import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { addDays } from '@/domain/dates';
import {
  BUNDLE_BANK_STAGE,
  BUNDLE_ERROR_TEXT,
  BUNDLE_ITEM_MAX,
  BUNDLE_MAX,
  BUNDLE_NAME_MAX,
  bundleInputs,
  bundlePrincipal,
  validateBundle,
  type Bundle,
  type BundleItem,
} from '@/domain/bundles';
import { formatAmount, type Importance } from '@/domain/interest';
import { TITLE_MAX } from '@/domain/records';
import { feedback } from '@/lib/feedback';
import { track } from '@/lib/events';
import { goBack } from '@/lib/navigation';
import { useProfile } from '@/store/profile';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { color, inputType, radius, stroke, themed, type } from '@/theme/tokens';

/**
 * 할 일 묶음 (FR-111, 시장 지점 혜택). 자주 같이 하는 할 일을 묶어 두고 오늘·내일 기한으로 한 번에 넣는다.
 */
export default function BundlesScreen() {
  const { profile, update } = useProfile();
  const { add, today, account } = useTodos();
  const bundles = profile?.todoBundles ?? [];
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const locked = account.bankStage < BUNDLE_BANK_STAGE;

  const save = (b: Bundle) => {
    const next = bundles.some((x) => x.id === b.id) ? bundles.map((x) => (x.id === b.id ? b : x)) : [...bundles, b];
    update({ todoBundles: next });
    setEditing(null);
  };

  const remove = (id: string) => {
    update({ todoBundles: bundles.filter((x) => x.id !== id) });
    setEditing(null);
  };

  const put = (b: Bundle, offset: number) => {
    const due = addDays(today, offset);
    for (const input of bundleInputs(b, due)) add(input, null);
    feedback.buy();
    track('bundle_add', { count: b.items.length });
    setNote(`"${b.name}" 할 일 ${b.items.length}개를 ${offset === 0 ? '오늘' : '내일'} 기한으로 넣었어요`);
  };

  if (editing) return <BundleEditor initial={editing} onSave={save} onCancel={() => setEditing(null)} onDelete={bundles.some((x) => x.id === editing.id) ? () => remove(editing.id) : undefined} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="할 일 묶음" onLead={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.body, styles.secondary]}>자주 같이 하는 할 일을 묶어 두고 한 번에 넣어요. 넣으면 할 일마다 원금이 걸려요.</Text>
        {locked ? (
          <View style={styles.lock}>
            <Text style={[type.label, styles.ink]}>🔒 시장 지점을 열면 쓸 수 있어요</Text>
            <Text style={[type.caption, styles.secondary]}>상점에서 은행을 키워 보세요.</Text>
          </View>
        ) : (
          <>
            {note ? <Text style={[type.label, styles.ok]}>{note}</Text> : null}
            {bundles.length === 0 ? <Text style={[type.caption, styles.muted]}>아직 묶음이 없어요. 예: 아침 루틴 (물 마시기, 스트레칭, 영어 단어)</Text> : null}
            {bundles.map((b) => (
              <View key={b.id} style={styles.card}>
                <Pressable onPress={() => setEditing(b)} accessibilityRole="button" accessibilityLabel={`${b.name} 고치기`} style={styles.cardHead}>
                  <Text style={[type.headline, styles.ink, styles.flex]} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={[type.caption, styles.secondary]}>고치기 ›</Text>
                </Pressable>
                <Text style={[type.caption, styles.secondary]} numberOfLines={2}>
                  {b.items.map((i) => i.title).join(', ')}
                </Text>
                <Text style={[type.caption, styles.muted]}>
                  {b.items.length}개 · 원금 {formatAmount(bundlePrincipal(b))}냥
                </Text>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Button label="오늘 넣기" variant="secondary" onPress={() => put(b, 0)} />
                  </View>
                  <View style={styles.flex}>
                    <Button label="내일 넣기" onPress={() => put(b, 1)} />
                  </View>
                </View>
              </View>
            ))}
            {bundles.length < BUNDLE_MAX ? (
              <Button label="+ 새 묶음" variant="secondary" onPress={() => setEditing({ id: Crypto.randomUUID(), name: '', items: [{ title: '', importance: 1 }] })} />
            ) : (
              <Text style={[type.caption, styles.muted]}>묶음은 {BUNDLE_MAX}개까지 만들 수 있어요.</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BundleEditor({ initial, onSave, onCancel, onDelete }: { initial: Bundle; onSave: (b: Bundle) => void; onCancel: () => void; onDelete?: () => void }) {
  const [name, setName] = useState(initial.name);
  const [items, setItems] = useState<BundleItem[]>(initial.items);
  const [tried, setTried] = useState(false);
  const errors = validateBundle(name, items);
  const setItem = (i: number, patch: Partial<BundleItem>) => setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar
        lead="close"
        title={onDelete ? '묶음 고치기' : '새 묶음'}
        onLead={onCancel}
        action="저장"
        onAction={() => {
          setTried(true);
          if (errors.length === 0) onSave({ id: initial.id, name: name.trim(), items: items.map((i) => ({ ...i, title: i.title.trim() })) });
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="묶음 이름" value={name} onChangeText={setName} maxLength={BUNDLE_NAME_MAX} placeholder="예: 아침 루틴" />
        <View style={styles.items}>
          <Text style={[type.label, styles.ink]}>할 일 ({items.length}/{BUNDLE_ITEM_MAX})</Text>
          {items.map((it, i) => (
            <View key={i} style={styles.item}>
              <View style={styles.row}>
                <TextInput
                  value={it.title}
                  onChangeText={(v) => setItem(i, { title: v })}
                  maxLength={TITLE_MAX}
                  placeholder={`할 일 ${i + 1}`}
                  placeholderTextColor={color.textTertiary}
                  accessibilityLabel={`할 일 ${i + 1} 이름`}
                  style={[inputType.body, styles.input]}
                />
                {items.length > 1 ? (
                  <Pressable onPress={() => setItems(items.filter((_, k) => k !== i))} accessibilityRole="button" accessibilityLabel={`할 일 ${i + 1} 빼기`} hitSlop={8}>
                    <Text style={[type.headline, styles.muted]}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="중요도">
                {([1, 2, 3, 4, 5] as Importance[]).map((n) => (
                  <Chip key={n} label={String(n)} a11yLabel={`중요도 ${n}`} selected={it.importance === n} onPress={() => setItem(i, { importance: n })} grow />
                ))}
              </View>
            </View>
          ))}
          {items.length < BUNDLE_ITEM_MAX ? (
            <Button label="+ 할 일 더하기" variant="secondary" onPress={() => setItems([...items, { title: '', importance: 1 }])} />
          ) : null}
        </View>
        {tried && errors.length > 0 ? <Text style={[type.label, styles.bad]}>{BUNDLE_ERROR_TEXT[errors[0]]}</Text> : null}
        {onDelete ? <Button label="묶음 지우기" variant="danger" onPress={onDelete} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  content: layout.content,
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { ...layout.card, padding: 16, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lock: { ...layout.panel, padding: 16, gap: 4 },
  items: { gap: 12 },
  item: { ...layout.panel, padding: 12, gap: 10 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: stroke.hairline || 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgPage,
    color: color.textPrimary,
  },
  ink: { color: color.textPrimary },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
  ok: { color: color.okFg },
  bad: { color: color.debtFg },
}));
