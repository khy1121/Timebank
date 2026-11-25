import { forwardRef, type ComponentRef } from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';

/**
 * 시스템 글자 크기를 따르되 이 배율까지만 키운다 (NFR-007).
 * 아이폰 기본 글자 크기 최대(약 1.35배)에서는 화면이 깨지지 않음을 확인했다.
 * 접근성 큰 글자(최대 약 3.1배)는 이 값에서 멈춘다.
 */
export const MAX_FONT_SCALE = 1.35;

export const Text = forwardRef<ComponentRef<typeof RNText>, TextProps>(function Text(props, ref) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} ref={ref} />;
});

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(function TextInput(props, ref) {
  return <RNTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} ref={ref} />;
});
