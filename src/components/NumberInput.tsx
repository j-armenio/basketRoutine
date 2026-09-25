import { colors } from '@/theme/colors';
import { input, radius, spacing, touch } from '@/theme/spacing';
import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TargetedEvent,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

type NumberInputProps = Omit<
  TextInputProps,
  'style' | 'keyboardType' | 'returnKeyType' | 'selectTextOnFocus' | 'accessibilityLabel'
> & {
  /** Required: the field has no visible label of its own (e.g. "Set 2 makes"). */
  accessibilityLabel: string;
  size?: 'large' | 'compact';
  /** Red border, set by the owner once an invalid entry was rolled back. */
  invalid?: boolean;
  style?: StyleProp<TextStyle>;
};

/**
 * A whole-number field: number pad, "done" key, and the value selected on focus so typing
 * replaces it. Pure presentation: drafts and validation live in the owner.
 *
 * Until it is focused, a transparent layer covers the field and focuses it on a tap. On Android the
 * native field would take the whole touch, so dragging a `SwipeToDelete` row that starts on it
 * wouldn't move; and gesture-handler's own `TextInput`, which lets the drag through, mistakes
 * the drag for a tap (the field moves with the finger) and focuses it once the row is deleted.
 */
export function NumberInput({
  size = 'large',
  invalid = false,
  style,
  accessibilityLabel,
  onFocus,
  onBlur,
  ...props
}: NumberInputProps) {
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleFocus = (event: NativeSyntheticEvent<TargetedEvent>) => {
    setFocused(true);
    onFocus?.(event);
  };
  const handleBlur = (event: NativeSyntheticEvent<TargetedEvent>) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <View>
      <TextInput
        ref={ref}
        accessibilityLabel={accessibilityLabel}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        placeholderTextColor={colors.textDisabled}
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.base,
          size === 'large' ? styles.large : styles.compact,
          invalid && styles.invalid,
          style,
        ]}
      />
      {!focused && (
        <Pressable
          testID={`${accessibilityLabel} tap area`}
          // Screen readers reach the field itself, which handles its own activation.
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={() => ref.current?.focus()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  large: {
    height: input.height,
    fontSize: input.fontSize,
  },
  compact: {
    minHeight: touch.min,
    fontSize: 18,
  },
  invalid: {
    borderColor: colors.danger,
  },
});
