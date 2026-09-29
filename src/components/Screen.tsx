import { colors } from '@/theme/colors';
import { size, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useKeyboardVisible } from './useKeyboardVisible';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /**
   * The title's size: `display` on the tabs and the summary (the default), `titleLarge` on a
   * detail, `title` on the active workout and the forms.
   */
  titleVariant?: 'display' | 'titleLarge' | 'title';
  /** Before the title (a back, close or minimize button). */
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
  /**
   * Fixed under the content, outside the scroll view: a `BottomActionBar`. It pads the bottom safe
   * area itself, and hides while the keyboard is open.
   */
  footer?: ReactNode;
  children: ReactNode;
};

export function Screen({
  title,
  subtitle,
  titleVariant = 'display',
  left,
  right,
  scroll = true,
  bottomInset = false,
  keyboardAvoiding = false,
  footer,
  children,
}: ScreenProps) {
  const keyboardVisible = useKeyboardVisible();
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
    <SafeAreaView
      edges={bottomInset && !footer ? ['top', 'bottom'] : ['top']}
      style={styles.safeArea}
    >
      <View style={[styles.header, left !== undefined && styles.headerWithLeft]}>
        {left}
        {/* A one-line title sits level with the 48 dp buttons beside it; a longer one grows down. */}
        <View
          style={[
            styles.titles,
            (left !== undefined || right !== undefined) && {
              paddingTop: Math.max(
                0,
                (size.minTouchTarget - typography[titleVariant].lineHeight) / 2,
              ),
            },
          ]}
        >
          <AppText variant={titleVariant} accessibilityRole="header">
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="bodySmall" tone="secondary">
              {subtitle}
            </AppText>
          )}
        </View>
        {right !== undefined && <View style={styles.side}>{right}</View>}
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
      {footer && !keyboardVisible && footer}
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
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.screenPadding + spacing.xs,
  },
  // A 48 dp button before the title: its icon lines up with the content's edge.
  headerWithLeft: {
    paddingLeft: spacing.xs,
    paddingRight: spacing.screenPadding,
  },
  titles: {
    flex: 1,
    gap: spacing.xxs,
  },
  side: {
    minHeight: size.minTouchTarget,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.sectionGap,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.mdPlus,
  },
});
