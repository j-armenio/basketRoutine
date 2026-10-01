import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { fgTone } from '@/components/fgTone';
import { StatTile } from '@/components/StatTile';
import { fgBand } from '@/domain/fg';
import { formatDuration, formatFgPct } from '@/domain/format';
import type { ProfileStats } from '@/features/history/historyList';
import { spacing } from '@/theme/spacing';
import { StyleSheet, View } from 'react-native';

/**
 * "Your stats" on the Profile tab, over every finished workout: how many, the FG% (Σmakes /
 * Σattempts), the shots, and the time trained.
 */
export function ProfileStatsCard({ stats }: { stats: ProfileStats }) {
  const { shooting } = stats;
  return (
    <Card style={styles.card}>
      <AppText variant="sectionTitle" accessibilityRole="header">
        Your stats
      </AppText>
      <View style={styles.tiles}>
        <StatTile testID="stat-sessions" label="Sessions" value={String(stats.sessions)} large />
        <StatTile
          testID="avg-fg"
          label="Avg FG%"
          value={formatFgPct(shooting.fgPct)}
          tone={fgTone(fgBand(shooting.fgPct))}
          large
        />
      </View>
      <View style={styles.tiles}>
        <StatTile
          testID="stat-shots"
          label="Shots made"
          value={shooting.attempts > 0 ? `${shooting.makes} / ${shooting.attempts}` : '—'}
        />
        <StatTile
          testID="stat-time"
          label="Time trained"
          value={formatDuration(stats.durationMs)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.mdPlus,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
