import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { fgTone } from '@/components/fgTone';
import { StatTile } from '@/components/StatTile';
import type { ExerciseSessionResult } from '@/domain/exerciseStats';
import { fgBand } from '@/domain/fg';
import { formatDayDate, formatFgPct } from '@/domain/format';
import type { TrackingType } from '@/domain/types';
import { colors } from '@/theme/colors';
import { border, size, spacing } from '@/theme/spacing';
import { tabularNums } from '@/theme/typography';
import { StyleSheet, View } from 'react-native';
import { useExerciseStats } from './hooks';

/**
 * "Your stats" on the exercise detail, from the real history. A shooting drill: its best session,
 * its overall FG% (Σmakes / Σattempts) and how many sessions; a check drill: the sessions and the
 * done sets. Then the latest sessions.
 */
export function ExerciseStatsCard({
  exerciseId,
  trackingType,
}: {
  exerciseId: number;
  trackingType: TrackingType;
}) {
  const stats = useExerciseStats(exerciseId);
  const shooting = trackingType === 'makes_attempts';

  return (
    <Card style={styles.card}>
      <AppText variant="sectionTitle" accessibilityRole="header">
        Your stats
      </AppText>
      {stats.sessions === 0 ? (
        <AppText variant="bodySmall" tone="secondary">
          No sessions yet.
        </AppText>
      ) : (
        <>
          <View style={styles.tiles}>
            {shooting ? (
              <>
                <StatTile
                  label="Best FG%"
                  value={formatFgPct(stats.best)}
                  tone={fgTone(fgBand(stats.best))}
                />
                <StatTile
                  label="Average"
                  value={formatFgPct(stats.shooting.fgPct)}
                  tone={fgTone(fgBand(stats.shooting.fgPct))}
                />
              </>
            ) : (
              <StatTile label="Done" value={`${stats.check.completed} / ${stats.check.total}`} />
            )}
            <StatTile label="Sessions" value={String(stats.sessions)} />
          </View>
          <View>
            <AppText variant="sectionHeader" tone="secondary" style={styles.recentTitle}>
              Recent sessions
            </AppText>
            {stats.recent.map((result, index) => (
              <RecentRow
                key={result.sessionId}
                result={result}
                shooting={shooting}
                last={index === stats.recent.length - 1}
              />
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

function RecentRow({
  result,
  shooting,
  last,
}: {
  result: ExerciseSessionResult;
  shooting: boolean;
  last: boolean;
}) {
  const logged = result.shooting.attempts > 0;
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <AppText variant="bodySmall" style={styles.date}>
        {formatDayDate(result.startedAt)}
      </AppText>
      {shooting ? (
        <>
          <AppText variant="bodySmall" tone="secondary" style={tabularNums}>
            {logged ? `${result.shooting.makes} / ${result.shooting.attempts}` : '—'}
          </AppText>
          <AppText
            variant="bodySmall"
            weight="bold"
            tone={fgTone(fgBand(result.shooting.fgPct))}
            style={[styles.fg, tabularNums]}
          >
            {formatFgPct(result.shooting.fgPct)}
          </AppText>
        </>
      ) : (
        <AppText variant="bodySmall" tone="secondary" style={tabularNums}>
          {`${result.check.completed} / ${result.check.total} done`}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recentTitle: {
    marginBottom: spacing.xs,
  },
  row: {
    minHeight: size.minTouchTarget - spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  divider: {
    borderBottomWidth: border.hairline,
    borderBottomColor: colors.outline,
  },
  date: {
    flex: 1,
  },
  fg: {
    width: size.setFgColumn,
    textAlign: 'right',
  },
});
