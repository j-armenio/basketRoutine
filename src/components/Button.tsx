import { colors } from '@/theme/colors';
import { radius, spacing, touch } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants = {
  primary: {
    background: colors.accent,
    pressedBackground: colors.accentPressed,
    textColor: colors.onAccent,
    height: touch.primary,
  },
  secondary: {
    background: colors.surface,
    pressedBackground: colors.surfaceElevated,
    textColor: colors.text,
    height: touch.min,
  },
  ghost: {
    background: 'transparent',
    pressedBackground: colors.surfaceElevated,
    textColor: colors.accent,
    height: touch.min,
  },
  danger: {
    background: colors.surface,
    pressedBackground: colors.surfaceElevated,
    textColor: colors.danger,
    height: touch.min,
  },
} as const;

const disabledStyle = { background: colors.surface, textColor: colors.textDisabled };

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  icon?: AndroidSymbol;
  fullWidth?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  icon,
  fullWidth = false,
  disabled: disabledProp,
  ...props
}: ButtonProps) {
  const disabled = !!disabledProp;
  const config = variants[variant];
  const textColor = disabled ? disabledStyle.textColor : config.textColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        { minHeight: config.height },
        fullWidth && styles.fullWidth,
        {
          backgroundColor: disabled
            ? disabledStyle.background
            : pressed
              ? config.pressedBackground
              : config.background,
        },
      ]}
    >
      {icon && <Icon name={icon} size={20} color={textColor} />}
      <AppText variant="label" style={{ color: textColor }}>
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
    borderRadius: radius.md,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
