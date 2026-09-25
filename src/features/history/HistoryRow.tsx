import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { formatDuration, formatExerciseList, formatWorkoutDate } from '@/domain/format';
import { spacing } from '@/theme/spacing';
import { StyleSheet, View } from 'react-native';
import { sessionResult, type HistoryItem } from './historyList';

type HistoryRowProps = {
  item: HistoryItem;
  onPress: () => void;
};

/** A finished session in the History list: what it was, when, and its result on the right. */
export function HistoryRow({ item, onPress }: HistoryRowProps) {
  const date = formatWorkoutDate(item.startedAt);
  const { fgPct, checks } = sessionResult(item.summary);

  return (
    // The name alone isn't enough: names repeat ("Morning Workout").
    <Card onPress={onPress} accessibilityLabel={`${item.name}, ${date}`}>
      <View style={styles.row}>
        <View style={styles.texts}>
          <AppText variant="heading" numberOfLines={1}>
            {item.name}
          </AppText>
          <AppText tone="muted">{`${date} · ${formatDuration(item.durationMs)}`}</AppText>
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {formatExerciseList(item.exerciseNames)}
          </AppText>
        </View>
        <View style={styles.result}>
          {fgPct === null && checks === null && <AppText variant="number">—</AppText>}
          {fgPct !== null && <AppText variant="number">{fgPct}</AppText>}
          {checks !== null && (
            <AppText variant="caption" tone="muted">
              {checks}
            </AppText>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  texts: {
    flex: 1,
  },
  result: {
    alignItems: 'flex-end',
  },
});
