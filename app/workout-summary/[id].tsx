import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { formatDuration, formatFgPct, formatWorkoutDate } from '@/domain/format';
import { summarizeExercise, summarizeSession } from '@/domain/summary';
import { SessionTotals } from '@/features/history/SessionTotals';
import { useSessionDetail } from '@/features/workout/hooks';
import { spacing } from '@/theme/spacing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useSessionDetail(Number(id));
  const done = () => router.dismissTo('/');

  if (!detail || detail.status !== 'finished') {
    return (
      <Screen title="Summary" bottomInset>
        <EmptyState
          icon="history"
          title="Workout not found"
          message="This workout doesn't exist or isn't finished."
          action={{ label: 'Back to Workout', onPress: done }}
        />
      </Screen>
    );
  }

  const summary = summarizeSession(detail.exercises);
  const duration = detail.finishedAt ? detail.finishedAt.getTime() - detail.startedAt.getTime() : 0;

  return (
    <Screen
      title={detail.name}
      subtitle={`${formatWorkoutDate(detail.startedAt)} · ${formatDuration(duration)}`}
      bottomInset
    >
      <SessionTotals summary={summary} />
      <Card>
        <AppText variant="heading">Exercises</AppText>
        {detail.exercises.length === 0 && <AppText tone="muted">No exercises.</AppText>}
        {detail.exercises.map((exercise) => {
          const result = summarizeExercise(exercise);
          return (
            <View key={exercise.id} style={styles.line}>
              <AppText style={styles.name} numberOfLines={1}>
                {exercise.name}
              </AppText>
              <AppText tone="muted">
                {result.trackingType === 'check'
                  ? `${result.completed} / ${result.total} done`
                  : result.attempts > 0
                    ? `${result.makes} / ${result.attempts} · ${formatFgPct(result.fgPct)}`
                    : '—'}
              </AppText>
            </View>
          );
        })}
      </Card>
      <Button label="Done" fullWidth onPress={done} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  name: {
    flex: 1,
  },
});
