import { colors } from '@/theme/colors';
import { input, radius, spacing, touch } from '@/theme/spacing';
import {
  StyleSheet,
  TextInput,
  type StyleProp,
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
 */
export function NumberInput({
  size = 'large',
  invalid = false,
  style,
  accessibilityLabel,
  ...props
}: NumberInputProps) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      keyboardType="number-pad"
      returnKeyType="done"
      selectTextOnFocus
      placeholderTextColor={colors.textDisabled}
      {...props}
      style={[
        styles.base,
        size === 'large' ? styles.large : styles.compact,
        invalid && styles.invalid,
        style,
      ]}
    />
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
