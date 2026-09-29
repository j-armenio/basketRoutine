import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { fgTone } from '@/components/fgTone';
import { fgBand } from '@/domain/fg';
import { formatFgPct } from '@/domain/format';
import { spacing } from '@/theme/spacing';
import { StyleSheet, View } from 'react-native';
import { FgChart } from './FgChart';
import type { FgPoint } from './historyList';

/** The top of History: the latest session's FG% and the chart of the last few. */
export function FgEvolutionCard({ points }: { points: FgPoint[] }) {
  const latest = points.at(-1);
  if (!latest) return null;
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppText variant="sectionTitle" accessibilityRole="header">
          FG% evolution
        </AppText>
        <AppText variant="caption" tone="secondary">
          {points.length === 1 ? 'Last workout' : `Last ${points.length} workouts`}
        </AppText>
      </View>
      <View style={styles.latest}>
        <AppText variant="statMedium" tone={fgTone(fgBand(latest.fgPct))}>
          {formatFgPct(latest.fgPct)}
        </AppText>
        <AppText variant="subtitle" tone="secondary">
          latest workout
        </AppText>
      </View>
      <FgChart points={points} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingBottom: spacing.mdPlus,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  latest: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
