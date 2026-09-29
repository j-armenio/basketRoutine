import { colors } from '@/theme/colors';
import type { FontWeight } from '@/theme/fonts';
import { border, opacity, radius, size, spacing } from '@/theme/spacing';
import type { TypographyVariant } from '@/theme/typography';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';

type Variant =
  /** Main actions: Start, Finish, Save, Done. */
  | 'primary'
  /** A plain action on the background (Add Exercise). */
  | 'secondary'
  /** A text action inside a card (Add Set). */
  | 'ghost'
  /** A destructive action (Discard Workout). */
  | 'danger'
  /** The green pill (New Routine). */
  | 'tonal'
  /** The dashed green outline (New Workout). */
  | 'dashed'
  /** The green outline (Choose media). */
  | 'outline';

type VariantStyle = {
  container: ViewStyle;
  textColor: string;
  text: TypographyVariant;
  weight?: FontWeight;
  iconSize: number;
};

const variants: Record<Variant, VariantStyle> = {
  primary: {
    container: {
      minHeight: size.buttonPrimaryHeight,
      borderRadius: radius.button,
      backgroundColor: colors.primary,
      gap: spacing.smPlus,
    },
    textColor: colors.onPrimary,
    text: 'button',
    iconSize: size.iconButtonGlyph,
  },
  secondary: {
    container: {
      minHeight: size.buttonPrimaryHeight,
      borderRadius: radius.button,
      backgroundColor: colors.surface,
      gap: spacing.smPlus,
    },
    textColor: colors.textPrimary,
    text: 'body',
    weight: 'bold',
    iconSize: size.iconButtonGlyph,
  },
  ghost: {
    container: { minHeight: size.minTouchTarget, borderRadius: radius.input },
    textColor: colors.primary,
    text: 'bodySmall',
    weight: 'bold',
    iconSize: size.iconButtonGlyph,
  },
  danger: {
    container: {
      minHeight: size.buttonPrimaryHeight,
      borderRadius: radius.button,
      backgroundColor: colors.surface,
    },
    textColor: colors.error,
    text: 'body',
    weight: 'bold',
    iconSize: size.iconButtonGlyph,
  },
  tonal: {
    container: {
      minHeight: size.minTouchTarget,
      paddingHorizontal: spacing.lg + spacing.xxs,
      borderRadius: radius.chip,
      backgroundColor: colors.secondary,
    },
    textColor: colors.onSecondary,
    text: 'buttonCompact',
    iconSize: size.iconSmall,
  },
  dashed: {
    container: {
      minHeight: size.inputHeight,
      borderRadius: radius.button,
      borderWidth: border.outline,
      borderStyle: 'dashed',
      borderColor: colors.secondaryOutline,
    },
    textColor: colors.secondaryText,
    text: 'buttonCompact',
    iconSize: size.iconSmall,
  },
  outline: {
    container: {
      minHeight: size.inputHeight,
      paddingLeft: spacing.lg,
      paddingRight: spacing.xl,
      borderRadius: radius.input,
      borderWidth: border.outline,
      borderColor: colors.secondaryOutline,
      gap: spacing.smPlus,
    },
    textColor: colors.textPrimary,
    text: 'bodySmall',
    weight: 'bold',
    iconSize: size.iconButtonGlyph,
  },
};

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  icon?: AndroidSymbol;
  fullWidth?: boolean;
  /** The label in capitals, as on the Workout tab (the text itself doesn't change). */
  caps?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  icon,
  fullWidth = false,
  caps = false,
  disabled: disabledProp,
  ...props
}: ButtonProps) {
  const disabled = !!disabledProp;
  const config = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        config.container,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon && <Icon name={icon} size={config.iconSize} color={config.textColor} />}
      <AppText
        variant={caps ? 'buttonCaps' : config.text}
        weight={caps ? undefined : config.weight}
        style={{ color: config.textColor }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: opacity.pressed,
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
