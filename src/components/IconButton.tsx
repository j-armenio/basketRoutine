import { colors } from '@/theme/colors';
import { border, opacity, size } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View, type ColorValue, type PressableProps } from 'react-native';
import { Icon } from './Icon';

type IconButtonProps = Omit<PressableProps, 'children' | 'style' | 'accessibilityLabel'> & {
  icon: AndroidSymbol;
  /** Required: the button has no visible text. */
  accessibilityLabel: string;
  /** Back, close and minimize are `textPrimary` (the default); menus and trash are `iconMuted`. */
  color?: ColorValue;
  /**
   * `play`: the 52 dp round button that starts a workout (`primary` on `primaryContainer`).
   * `outlined`: a 36 dp dashed green ring around a green icon (the border of New Workout's
   * button), inside the 48 dp target (New exercise); `color` doesn't apply.
   * Otherwise a plain 48 dp button.
   */
  variant?: 'plain' | 'play' | 'outlined';
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
      {variant === 'outlined' ? (
        <View testID="icon-button-ring" style={styles.ring}>
          <Icon name={icon} size={size.iconButtonGlyph} color={colors.secondaryOutline} />
        </View>
      ) : (
        <Icon
          name={icon}
          size={play ? size.iconButtonGlyph : size.icon}
          color={play ? colors.primary : color}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: size.iconButton,
    height: size.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: size.iconButton / 2,
  },
  play: {
    width: size.playButton,
    height: size.playButton,
    borderRadius: size.playButton / 2,
    backgroundColor: colors.primaryContainer,
  },
  ring: {
    width: size.iconButtonRing,
    height: size.iconButtonRing,
    alignItems: 'center',
    justifyContent: 'center',
    // New Workout's dashed green border.
    borderRadius: size.iconButtonRing / 2,
    borderWidth: border.outline,
    borderStyle: 'dashed',
    borderColor: colors.secondaryOutline,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
