import { colors } from '@/theme/colors';
import { elevation, opacity, radius, size, spacing } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';

type FabProps = {
  label: string;
  icon: AndroidSymbol;
  /** Defaults to the label. */
  accessibilityLabel?: string;
  onPress: () => void;
};

/**
 * An extended floating action button, in the bottom right corner of its parent (which must let it
 * sit on top: give the list under it room at the bottom).
 */
export function Fab({ label, icon, accessibilityLabel = label, onPress }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Icon name={icon} size={size.iconButtonGlyph} color={colors.onPrimary} />
      <AppText variant="button" style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** The room a list needs at its bottom so its last row can scroll out from under the FAB. */
export const FAB_CLEARANCE = size.buttonPrimaryHeight + 2 * spacing.lg;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.screenPadding,
    bottom: spacing.lg,
    minHeight: size.buttonPrimaryHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg + spacing.xxs,
    paddingRight: spacing.xl + spacing.xxs,
    borderRadius: radius.fab,
    backgroundColor: colors.primary,
    boxShadow: elevation.fab,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  label: {
    color: colors.onPrimary,
  },
});
