import { colors } from '@/theme/colors';
import { opacity, radius, spacing } from '@/theme/spacing';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type CardProps = {
  children: ReactNode;
  onPress?: PressableProps['onPress'];
  accessibilityLabel?: string;
  /**
   * `default`: a card on the screen (`surface`, radius 20, padding 20). `compact`: the same with
   * padding 16 (the active workout's exercise cards). `raised`: an item inside a card
   * (`surfaceRaised`, radius 16).
   */
  variant?: 'default' | 'compact' | 'raised';
  /** Layout only (padding, gap, direction), with tokens. */
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  onPress,
  accessibilityLabel,
  variant = 'default',
  style,
}: CardProps) {
  const cardStyle = [styles.card, styles[variant], style];
  if (!onPress) {
    return (
      <View style={cardStyle} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  default: {
    padding: spacing.cardPadding,
  },
  compact: {
    padding: spacing.cardPaddingCompact,
  },
  raised: {
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
