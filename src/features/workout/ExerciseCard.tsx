import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { fgTone } from '@/components/fgTone';
import { IconButton } from '@/components/IconButton';
import { fgBand } from '@/domain/fg';
import { formatFgPct } from '@/domain/format';
import { summarizeExercise } from '@/domain/summary';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { addSet, removeExercise } from './actions';
import { CheckSetRow } from './CheckSetRow';
import { ExerciseNote } from './ExerciseNote';
import type { SessionExerciseDetail } from './hooks';
import { SetTableHeader, modeSubtitle } from './SetTableHeader';
import { ShootingSetRow } from './ShootingSetRow';

type ExerciseCardProps = {
  exercise: SessionExerciseDetail;
  index: number;
  count: number;
  onMove: (delta: -1 | 1) => void;
};

export function ExerciseCard({ exercise, index, count, onMove }: ExerciseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { targetMode } = exercise;
  const summary = summarizeExercise(exercise);

  const confirmRemove = () =>
    Alert.alert('Remove exercise?', `${exercise.name} and its sets will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeExercise(exercise.id) },
    ]);

  return (
    <Card variant="compact" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <AppText variant="cardTitle">{exercise.name}</AppText>
          <AppText variant="caption" tone="secondary">
            {modeSubtitle(targetMode)}
          </AppText>
        </View>
        <IconButton
          color={colors.iconMuted}
          icon="more_vert"
          accessibilityLabel={`${exercise.name} menu`}
          onPress={() => setMenuOpen(true)}
        />
      </View>
      <View style={styles.table}>
        <SetTableHeader targetMode={targetMode} />
        {exercise.sets.map((set, position) =>
          targetMode ? (
            <ShootingSetRow
              key={set.id}
              set={set}
              number={position + 1}
              targetMode={targetMode}
              deletable={exercise.sets.length > 1}
            />
          ) : (
            <CheckSetRow
              key={set.id}
              set={set}
              number={position + 1}
              deletable={exercise.sets.length > 1}
            />
          ),
        )}
      </View>
      {summary.trackingType === 'makes_attempts' && summary.attempts > 0 && (
        <AppText variant="bodySmall" tone="secondary" style={styles.total}>
          Total: {summary.makes} makes / {summary.attempts} attempts ·{' '}
          <AppText variant="bodySmall" weight="bold" tone={fgTone(fgBand(summary.fgPct))}>
            {formatFgPct(summary.fgPct)}
          </AppText>
        </AppText>
      )}
      <Button
        variant="ghost"
        icon="add"
        label="Add Set"
        fullWidth
        onPress={() => addSet(exercise.id)}
      />
      <ExerciseNote exerciseId={exercise.id} name={exercise.name} note={exercise.note} />
      <ActionSheet
        visible={menuOpen}
        title={exercise.name}
        options={[
          {
            label: 'Move up',
            icon: 'arrow_upward',
            disabled: index === 0,
            onPress: () => onMove(-1),
          },
          {
            label: 'Move down',
            icon: 'arrow_downward',
            disabled: index === count - 1,
            onPress: () => onMove(1),
          },
          { label: 'Remove exercise', icon: 'delete', destructive: true, onPress: confirmRemove },
        ]}
        onClose={() => setMenuOpen(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  // The ⋮ button's own padding lines its icon up with the table's right edge.
  card: {
    paddingRight: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titles: {
    flex: 1,
    gap: spacing.xxs,
    paddingTop: spacing.xs,
  },
  table: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  total: {
    paddingTop: spacing.xs,
  },
});
