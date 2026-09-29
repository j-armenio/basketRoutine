import { colors } from '@/theme/colors';
import { radius, size, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { AndroidSymbol } from 'expo-symbols';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Icon } from './Icon';

type TextFieldProps = Omit<TextInputProps, 'style' | 'accessibilityLabel'> & {
  /** Required: a placeholder disappears once there is text. */
  accessibilityLabel: string;
  /** Multiline only: grows up to this many lines, then scrolls inside. */
  maxLines?: number;
  /** An icon inside the field, before the text (search). */
  icon?: AndroidSymbol;
  /** `raised`: a field inside a card (`surfaceRaised`, 48 dp). Otherwise on the screen (`surface`, 52 dp). */
  variant?: 'default' | 'raised';
};

/** A single- or multi-line text input. */
export function TextField({
  multiline,
  maxLines,
  accessibilityLabel,
  icon,
  variant = 'default',
  ...props
}: TextFieldProps) {
  const raised = variant === 'raised';
  const input = (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      multiline={multiline}
      placeholderTextColor={colors.textSecondary}
      {...props}
      style={[
        styles.base,
        raised && styles.raised,
        icon && styles.withIcon,
        multiline && styles.multiline,
        multiline && !raised && styles.multilineTall,
        multiline &&
          maxLines !== undefined && {
            maxHeight: maxLines * typography.body.lineHeight + 2 * spacing.mdPlus,
          },
      ]}
    />
  );
  if (!icon) return input;
  return (
    <View>
      {input}
      <View style={styles.icon} pointerEvents="none">
        <Icon name={icon} size={size.icon} color={colors.textSecondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...typography.body,
    minHeight: size.inputHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  raised: {
    ...typography.bodySmall,
    minHeight: size.minTouchTarget,
    borderRadius: radius.cell,
    backgroundColor: colors.surfaceRaised,
  },
  withIcon: {
    paddingLeft: spacing.lg + size.icon + spacing.smPlus,
    borderRadius: radius.button,
  },
  multiline: {
    paddingVertical: spacing.mdPlus,
    textAlignVertical: 'top',
  },
  multilineTall: {
    minHeight: size.textArea,
  },
  icon: {
    position: 'absolute',
    left: spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
