import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
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
            <AppText tone="muted" style={styles.title}>
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

function Row({ label, icon, destructive, disabled, onPress }: RowProps) {
  const color = disabled ? colors.textDisabled : destructive ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon && <Icon name={icon} color={color} />}
      <AppText variant="label" style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  title: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.surfaceElevated,
  },
});
