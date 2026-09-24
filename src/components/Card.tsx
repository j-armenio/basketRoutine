import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

type CardProps = {
  children: ReactNode;
  onPress?: PressableProps['onPress'];
  accessibilityLabel?: string;
};

export function Card({ children, onPress, accessibilityLabel }: CardProps) {
  if (!onPress) {
    return (
      <View style={styles.card} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.surfaceElevated,
  },
});
