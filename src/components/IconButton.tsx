import { colors } from '@/theme/colors';
import { opacity, radius, size } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, type ColorValue, type PressableProps } from 'react-native';
import { Icon } from './Icon';

type IconButtonProps = Omit<PressableProps, 'children' | 'style' | 'accessibilityLabel'> & {
  icon: AndroidSymbol;
  /** Required: the button has no visible text. */
  accessibilityLabel: string;
  /** Back, close and minimize are `textPrimary` (the default); menus and trash are `iconMuted`. */
  color?: ColorValue;
  /**
   * `play`: the 52 dp round button that starts a workout (`primary` on `primaryContainer`).
   * Otherwise a plain 48 dp button.
   */
  variant?: 'plain' | 'play';
};

export function IconButton({
  icon,
  accessibilityLabel,
  color = colors.textPrimary,
  variant = 'plain',
  disabled,
  ...props
}: IconButtonProps) {
  const play = variant === 'play';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        play && styles.play,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon
        name={icon}
        size={play ? size.iconButtonGlyph : size.icon}
        color={play ? colors.primary : color}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: size.iconButton,
    height: size.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  play: {
    width: size.playButton,
    height: size.playButton,
    backgroundColor: colors.primaryContainer,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
