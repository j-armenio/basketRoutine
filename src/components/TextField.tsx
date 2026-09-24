import { colors } from '@/theme/colors';
import { radius, spacing, touch } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

type TextFieldProps = Omit<TextInputProps, 'style' | 'accessibilityLabel'> & {
  /** Required: a placeholder disappears once there is text. */
  accessibilityLabel: string;
  /** Multiline only: grows up to this many lines, then scrolls inside. */
  maxLines?: number;
};

/** A single- or multi-line text input on the surface color. */
export function TextField({ multiline, maxLines, accessibilityLabel, ...props }: TextFieldProps) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      multiline={multiline}
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[
        styles.base,
        multiline && styles.multiline,
        multiline &&
          maxLines !== undefined && {
            maxHeight: maxLines * typography.body.lineHeight + 2 * spacing.sm,
          },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  multiline: {
    textAlignVertical: 'top',
  },
});
