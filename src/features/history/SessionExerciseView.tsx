import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { fgTone } from '@/components/fgTone';
import { fgBand, setFgPct } from '@/domain/fg';
import { formatFgPct } from '@/domain/format';
import { summarizeExercise } from '@/domain/summary';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme/colors';
import { size, spacing } from '@/theme/spacing';
import { tabularNums } from '@/theme/typography';
import { StyleSheet, View } from 'react-native';
import { TacticalBoardSlot } from '../tacticalBoard/TacticalBoardSlot';
import type { SessionExerciseDetail, SessionSetDetail } from '../workout/hooks';
import { SetNumber } from '../workout/SetNumber';
import { columnRoles, setTable } from '../workout/setTable';
import { SetTableHeader, modeSubtitle } from '../workout/SetTableHeader';

const EMPTY = '—';

/**
 * A finished session's exercise, read-only: the sets as they were stored (an empty set shows
 * `—`), the exercise total, the note and the tactical board when there are some. Nothing in it is
 * editable.
 */
export function SessionExerciseView({ exercise }: { exercise: SessionExerciseDetail }) {
  const { targetMode } = exercise;
  const summary = summarizeExercise(exercise);

  return (
    <Card>
      <View style={styles.titles}>
        <AppText variant="cardTitle">{exercise.name}</AppText>
        <AppText variant="caption" tone="secondary">
          {modeSubtitle(targetMode)}
        </AppText>
      </View>
      <TacticalBoardSlot board={exercise.tacticalBoard} exerciseName={exercise.name} />
      <View style={styles.table}>
        <SetTableHeader targetMode={targetMode} readOnly />
        {exercise.sets.map((set, position) =>
          targetMode ? (
            <ShootingRow key={set.id} set={set} number={position + 1} targetMode={targetMode} />
          ) : (
            <CheckRow key={set.id} set={set} number={position + 1} />
          ),
        )}
      </View>
      {summary.trackingType === 'makes_attempts' && summary.attempts > 0 && (
        <AppText variant="bodySmall" tone="secondary">
          Total: {summary.makes} makes / {summary.attempts} attempts ·{' '}
          <AppText tone={fgTone(fgBand(summary.fgPct))}>{formatFgPct(summary.fgPct)}</AppText>
        </AppText>
      )}
      {exercise.note !== '' && (
        <AppText accessibilityLabel={`${exercise.name} note`}>{exercise.note}</AppText>
      )}
    </Card>
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
  const roles = columnRoles(targetMode);
  const fg =
    set.targetValue === null
      ? null
      : setFgPct({ targetMode, targetValue: set.targetValue, loggedValue: set.loggedValue });
  const value = (role: 'logged' | 'target') =>
    (role === 'logged' ? set.loggedValue : set.targetValue) ?? EMPTY;

  return (
    <View style={setTable.row}>
      <SetNumber number={number} />
      <View style={setTable.valueColumn}>
        <AppText weight="bold" style={tabularNums} accessibilityLabel={`Set ${number} makes`}>
          {value(roles.makes)}
        </AppText>
      </View>
      <View style={setTable.valueColumn}>
        <AppText weight="bold" style={tabularNums} accessibilityLabel={`Set ${number} attempts`}>
          {value(roles.attempts)}
        </AppText>
      </View>
      <View style={setTable.fgColumn}>
        <AppText
          variant="bodySmall"
          weight="bold"
          tone={fgTone(fgBand(fg))}
          style={tabularNums}
          accessibilityLabel={`Set ${number} FG%`}
        >
          {formatFgPct(fg)}
        </AppText>
      </View>
    </View>
  );
}

function CheckRow({ set, number }: { set: SessionSetDetail; number: number }) {
  return (
    <View style={setTable.row}>
      <SetNumber number={number} />
      <View
        style={setTable.doneColumn}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Set ${number} ${set.completed ? 'done' : 'not done'}`}
      >
        {set.completed ? (
          <Icon name="check" size={size.iconLarge} color={colors.success} />
        ) : (
          <AppText tone="secondary">{EMPTY}</AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titles: {
    gap: spacing.xxs,
  },
  table: {
    gap: spacing.sm,
  },
});
