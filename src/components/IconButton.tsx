import { colors } from '@/theme/colors';
import { radius, touch } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, type ColorValue, type PressableProps } from 'react-native';
import { Icon } from './Icon';

type IconButtonProps = Omit<PressableProps, 'children' | 'style' | 'accessibilityLabel'> & {
  icon: AndroidSymbol;
  /** Required: the button has no visible text. */
  accessibilityLabel: string;
  color?: ColorValue;
};

export function IconButton({
  icon,
  accessibilityLabel,
  color = colors.text,
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...props}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <Icon name={icon} color={disabled ? colors.textDisabled : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  pressed: {
    backgroundColor: colors.surfaceElevated,
  },
});
