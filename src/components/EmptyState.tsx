import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

type EmptyStateProps = {
  icon: AndroidSymbol;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={48} color={colors.textMuted} />
      <AppText variant="heading">{title}</AppText>
      {message && (
        <AppText tone="muted" style={styles.message}>
          {message}
        </AppText>
      )}
      {action && <Button variant="secondary" label={action.label} onPress={action.onPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  message: {
    textAlign: 'center',
  },
});
