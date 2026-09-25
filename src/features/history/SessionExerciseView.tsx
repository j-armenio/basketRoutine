import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { setFgPct } from '@/domain/fg';
import { formatFgPct } from '@/domain/format';
import { summarizeExercise } from '@/domain/summary';
import { spacing } from '@/theme/spacing';
import { StyleSheet, View } from 'react-native';
import type { SessionExerciseDetail, SessionSetDetail } from '../workout/hooks';
import { setTable } from '../workout/setTable';
import { SetTableHeader, modeSubtitle } from '../workout/SetTableHeader';

const EMPTY = '—';

/**
 * A finished session's exercise, read-only: the sets as they were stored (an empty set shows
 * `—`), the exercise total and the note when there is one. Nothing in it is editable.
 */
export function SessionExerciseView({ exercise }: { exercise: SessionExerciseDetail }) {
  const { targetMode } = exercise;
  const summary = summarizeExercise(exercise);

  return (
    <Card>
      <View>
        <AppText variant="heading">{exercise.name}</AppText>
        <AppText variant="caption" tone="muted">
          {modeSubtitle(targetMode)}
        </AppText>
      </View>
      <View style={styles.table}>
        <SetTableHeader targetMode={targetMode} />
        {exercise.sets.map((set, position) =>
          targetMode ? (
            <ShootingRow key={set.id} set={set} number={position + 1} targetMode={targetMode} />
          ) : (
            <CheckRow key={set.id} set={set} number={position + 1} />
          ),
        )}
      </View>
      {summary.trackingType === 'makes_attempts' && summary.attempts > 0 && (
        <AppText tone="muted">
          Total: {summary.makes} makes / {summary.attempts} attempts · {formatFgPct(summary.fgPct)}
        </AppText>
      )}
      {exercise.note !== '' && (
        <AppText accessibilityLabel={`${exercise.name} note`}>{exercise.note}</AppText>
      )}
    </Card>
  );
}

function NumberCell({ number }: { number: number }) {
  return (
    <View style={setTable.numberColumn}>
      <AppText variant="label" tone="muted">
        {number}
      </AppText>
    </View>
  );
}

function ShootingRow({
  set,
  number,
  targetMode,
}: {
  set: SessionSetDetail;
  number: number;
  targetMode: 'attempts' | 'makes';
}) {
  const targetName = targetMode;
  const loggedName = targetMode === 'attempts' ? 'makes' : 'attempts';
  const fg =
    set.targetValue === null
      ? null
      : setFgPct({ targetMode, targetValue: set.targetValue, loggedValue: set.loggedValue });

  return (
    <View style={setTable.row}>
      <NumberCell number={number} />
      <View style={setTable.targetColumn}>
        <AppText style={styles.centered} accessibilityLabel={`Set ${number} ${targetName}`}>
          {set.targetValue ?? EMPTY}
        </AppText>
      </View>
      <View style={setTable.loggedColumn}>
        <AppText style={styles.centered} accessibilityLabel={`Set ${number} ${loggedName}`}>
          {set.loggedValue ?? EMPTY}
        </AppText>
      </View>
      <View style={setTable.fgColumn}>
        <AppText variant="label" tone="muted" accessibilityLabel={`Set ${number} FG%`}>
          {formatFgPct(fg)}
        </AppText>
      </View>
    </View>
  );
}

function CheckRow({ set, number }: { set: SessionSetDetail; number: number }) {
  return (
    <View style={setTable.row}>
      <NumberCell number={number} />
      <View style={styles.checkColumn}>
        <AppText
          style={styles.centered}
          accessibilityLabel={`Set ${number} ${set.completed ? 'done' : 'not done'}`}
        >
          {set.completed ? '✓' : EMPTY}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    gap: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  // Under the header's DONE label.
  checkColumn: {
    width: 56,
    marginLeft: spacing.sm,
  },
});
