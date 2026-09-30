import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { fgTone } from '@/components/fgTone';
import { Icon } from '@/components/Icon';
import { StatTile } from '@/components/StatTile';
import { fgBand } from '@/domain/fg';
import { formatDuration, formatFgPct } from '@/domain/format';
import { TREND_WINDOW, trendLabel, type ProfileStats } from '@/features/history/historyList';
import { colors } from '@/theme/colors';
import { radius, size, spacing } from '@/theme/spacing';
import { tabularNums } from '@/theme/typography';
import { StyleSheet, View } from 'react-native';

/**
 * "Your stats" on the Profile tab, over every finished workout: how many, the FG% (Σmakes /
 * Σattempts), the shots, the time trained, and the FG% trend of the latest workouts.
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
      <TrendRow points={stats.trend} />
    </Card>
  );
}

const TREND_STYLE = {
  up: { icon: 'arrow_upward', color: colors.success, tone: 'success', word: 'Up' },
  down: { icon: 'arrow_downward', color: colors.error, tone: 'error', word: 'Down' },
  flat: { icon: undefined, color: colors.neutralStat, tone: 'neutral', word: '' },
} as const;

/**
 * How the FG% of the last few workouts compares with the few before: an arrow and the points, in
 * green up or red down (the arrow and the word say it too), or "—" until there are enough.
 */
function TrendRow({ points }: { points: number | null }) {
  const label = points === null ? undefined : trendLabel(points);
  const style = label && TREND_STYLE[label.direction];
  const caption =
    points === null
      ? `After ${2 * TREND_WINDOW} workouts with shots`
      : `Last ${TREND_WINDOW} vs previous ${TREND_WINDOW} workouts`;
  const spoken = !label
    ? 'not enough workouts yet'
    : label.direction === 'flat'
      ? 'no change'
      : `${style!.word.toLowerCase()} ${label.text.replace('pt', 'point')}`;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`FG% trend, ${spoken}. ${caption}`}
      style={styles.trend}
    >
      <View style={styles.trendTexts}>
        <AppText variant="label" tone="secondary">
          FG% trend
        </AppText>
        <AppText variant="caption" tone="secondary">
          {caption}
        </AppText>
      </View>
      <View style={styles.trendValue}>
        {style?.icon && <Icon name={style.icon} size={size.icon} color={style.color} />}
        <AppText
          testID="stat-trend"
          variant="headline"
          tone={style ? style.tone : 'secondary'}
          style={tabularNums}
        >
          {label ? label.text : '—'}
        </AppText>
      </View>
    </View>
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
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceRaised,
  },
  trendTexts: {
    flex: 1,
    gap: spacing.xxs,
  },
  trendValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
