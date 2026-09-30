import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { fgTone } from '@/components/fgTone';
import { Icon } from '@/components/Icon';
import { fgBand } from '@/domain/fg';
import { formatFgPct } from '@/domain/format';
import { colors } from '@/theme/colors';
import { opacity, size, spacing } from '@/theme/spacing';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FgChart } from './FgChart';
import {
  CHART_RANGES,
  chartRangeLabel,
  chartRangeShortLabel,
  type ChartRange,
  type FgPoint,
} from './historyList';

type FgEvolutionCardProps = {
  points: FgPoint[];
  /** How many sessions the chart shows, picked from the card's menu. */
  range: ChartRange;
  onChangeRange: (range: ChartRange) => void;
};

/** The top of History: the latest session's FG% and the chart of the last few (or all). */
export function FgEvolutionCard({ points, range, onChangeRange }: FgEvolutionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const latest = points.at(-1);
  if (!latest) return null;
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppText variant="sectionTitle" accessibilityRole="header">
          FG% evolution
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chart range, ${chartRangeLabel(range).toLowerCase()}`}
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [styles.rangeButton, pressed && styles.pressed]}
        >
          <AppText variant="caption" weight="bold" tone="secondary">
            {chartRangeShortLabel(range)}
          </AppText>
          <Icon name="keyboard_arrow_down" size={size.iconSmall} color={colors.iconMuted} />
        </Pressable>
      </View>
      <View style={styles.latest}>
        <AppText variant="statMedium" tone={fgTone(fgBand(latest.fgPct))}>
          {formatFgPct(latest.fgPct)}
        </AppText>
        <AppText variant="subtitle" tone="secondary">
          latest workout
        </AppText>
      </View>
      <FgChart points={points} all={range === 'all'} />
      <ActionSheet
        visible={menuOpen}
        title="Show in the chart"
        options={CHART_RANGES.map((option) => ({
          label: chartRangeLabel(option),
          selected: option === range,
          onPress: () => onChangeRange(option),
        }))}
        onClose={() => setMenuOpen(false)}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  // 48 dp tall to be pressable, pulled into the header's line so the card doesn't grow.
  rangeButton: {
    minHeight: size.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: -spacing.md,
    marginRight: -spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  latest: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
