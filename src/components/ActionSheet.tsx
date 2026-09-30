import { colors } from '@/theme/colors';
import { opacity, radius, size, spacing } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type ActionSheetOption = {
  label: string;
  icon?: AndroidSymbol;
  destructive?: boolean;
  disabled?: boolean;
  /** The current choice, in a menu that picks one: a check at the end of the row. */
  selected?: boolean;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onClose: () => void;
};

/**
 * A menu that slides up from the bottom. Used instead of `Alert`, which holds three buttons at
 * most. The backdrop and the Android back button close it. An option runs, then closes it.
 */
export function ActionSheet({ visible, title, options, onClose }: ActionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          {title && (
            <AppText variant="subtitle" weight="bold" tone="secondary" style={styles.title}>
              {title}
            </AppText>
          )}
          {options.map((option) => (
            <Row
              key={option.label}
              label={option.label}
              icon={option.icon}
              destructive={option.destructive}
              disabled={option.disabled}
              selected={option.selected}
              onPress={() => {
                option.onPress();
                onClose();
              }}
            />
          ))}
          <Row label="Cancel" onPress={onClose} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

type RowProps = Omit<ActionSheetOption, 'onPress'> & { onPress: () => void };

function Row({ label, icon, destructive, disabled, selected, onPress }: RowProps) {
  const textColor = destructive ? colors.error : colors.textPrimary;
  const iconColor = destructive ? colors.error : colors.iconMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon && <Icon name={icon} size={size.icon} color={iconColor} />}
      <AppText weight="semiBold" style={[styles.label, { color: textColor }]}>
        {label}
      </AppText>
      {selected && <Icon name="check" size={size.icon} color={colors.secondaryText} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: colors.scrim,
  },
  sheet: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    backgroundColor: colors.surface,
  },
  title: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  row: {
    minHeight: size.buttonPrimaryHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  label: {
    flex: 1,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
