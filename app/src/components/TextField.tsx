import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { color, inputType, radius, stroke, themed, type } from '@/theme/tokens';

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  maxLength: number;
  placeholder?: string;
  hint?: string;
  error?: string | null;
} & Pick<TextInputProps, 'autoCapitalize' | 'autoCorrect' | 'returnKeyType' | 'onSubmitEditing' | 'style'>;

/** 이름표가 붙은 한 줄 입력. 그룹 이름, 별명, 인증 메모에 쓴다. */
export function TextField({ label, value, onChangeText, maxLength, placeholder, hint, error, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[type.label, styles.label]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={color.textTertiary}
        maxLength={maxLength}
        accessibilityLabel={label}
        style={[
          inputType.body,
          styles.input,
          { borderColor: error ? color.debtFg : focused ? color.brandPrimary : value ? color.inkOutline : color.borderDefault },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={[type.caption, styles.error]} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[type.caption, styles.hint]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = themed(() => ({
  field: { gap: 8 },
  label: { color: color.textSecondary },
  input: {
    backgroundColor: color.bgSurface,
    borderWidth: stroke.outline,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: color.textPrimary,
  },
  hint: { color: color.textTertiary },
  error: { color: color.debtFg },
}));
