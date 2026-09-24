import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './AppText';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Before the title (a minimize or close button). */
  left?: ReactNode;
  right?: ReactNode;
  scroll?: boolean;
  /** Pads the bottom safe area, for screens outside the tabs (which have a tab bar for that). */
  bottomInset?: boolean;
  /**
   * Lifts the content above the keyboard. The app is edge-to-edge, so Android's own resize can't
   * be relied on. The wrapper goes around the scroll view: inside it, it would do nothing.
   */
  keyboardAvoiding?: boolean;
  children: ReactNode;
};

export function Screen({
  title,
  subtitle,
  left,
  right,
  scroll = true,
  bottomInset = false,
  keyboardAvoiding = false,
  children,
}: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      testID="screen-scroll"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  return (
    <SafeAreaView edges={bottomInset ? ['top', 'bottom'] : ['top']} style={styles.safeArea}>
      <View style={styles.header}>
        {left}
        <View style={styles.titles}>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle && <AppText tone="muted">{subtitle}</AppText>}
        </View>
        {right}
      </View>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          testID="screen-keyboard-avoiding"
          behavior="padding"
          style={styles.flex}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  titles: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
});
