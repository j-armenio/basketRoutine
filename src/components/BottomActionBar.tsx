import { colors } from '@/theme/colors';
import { border, spacing } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';

type BottomActionBarProps = {
  label: string;
  icon?: AndroidSymbol;
  onPress: () => void;
};

/**
 * The screen's main action, fixed at the bottom within the thumb's reach: a full-width primary
 * button on `backgroundDeep`. Goes in `Screen`'s `footer`.
 */
export function BottomActionBar({ label, icon, onPress }: BottomActionBarProps) {
  return (
    // The bottom inset is added to the padding.
    <SafeAreaView edges={['bottom']} style={styles.bar}>
      <Button label={label} icon={icon} fullWidth onPress={onPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
    borderTopWidth: border.hairline,
    borderTopColor: colors.divider,
    backgroundColor: colors.backgroundDeep,
  },
});
