import { formatElapsed } from '@/domain/format';
import { colors } from '@/theme/colors';
import { size, spacing } from '@/theme/spacing';
import { tabularNums } from '@/theme/typography';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';

const TICK_MS = 1000;

/** Milliseconds since `start`, re-rendered every second. */
export function useElapsed(start: Date): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now - start.getTime();
}

/**
 * The time since `start`, counting, in a green pill. Read from the clock every second, so it stays
 * right after the screen or the app was away.
 */
export function ElapsedTimer({ start }: { start: Date }) {
  const text = formatElapsed(useElapsed(start));
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`Elapsed time ${text}`}
      style={styles.pill}
    >
      <Icon name="timer" size={size.iconSmall} color={colors.onSecondary} />
      <AppText variant="bodySmall" weight="bold" style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: size.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xsPlus,
    paddingLeft: spacing.md,
    paddingRight: spacing.mdPlus,
    borderRadius: size.pill / 2,
    backgroundColor: colors.secondary,
  },
  text: {
    ...tabularNums,
    color: colors.onSecondary,
  },
});
