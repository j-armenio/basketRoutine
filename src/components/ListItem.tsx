import { colors } from '@/theme/colors';
import { spacing, touch } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';

type ListItemProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  subtitle?: string;
  rightIcon?: AndroidSymbol;
  /** Before the texts (a thumbnail). */
  left?: ReactNode;
};

/**
 * A 56 dp pressable row: an optional element on the left, a title, an optional subtitle and an
 * optional icon on the right.
 */
export function ListItem({ title, subtitle, rightIcon, left, ...props }: ListItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {left}
      <View style={styles.texts}>
        <AppText variant="label" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>
      {rightIcon && <Icon name={rightIcon} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceElevated,
  },
  texts: {
    flex: 1,
  },
});
