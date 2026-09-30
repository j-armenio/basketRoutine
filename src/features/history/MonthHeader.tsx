import { AppText } from '@/components/AppText';
import { spacing } from '@/theme/spacing';
import { StyleSheet } from 'react-native';

/** A month over its sessions ("September 2026"), on the Profile tab and the full History. */
export function MonthHeader({ title }: { title: string }) {
  return (
    <AppText
      variant="sectionHeader"
      tone="secondary"
      accessibilityRole="header"
      style={styles.header}
    >
      {title}
    </AppText>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xs,
  },
});
