import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { formatFgPct } from '@/domain/format';
import { summarizeExercise } from '@/domain/summary';
import { spacing } from '@/theme/spacing';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { addSet, removeExercise } from './actions';
import { CheckSetRow } from './CheckSetRow';
import { ExerciseNote } from './ExerciseNote';
import type { SessionExerciseDetail } from './hooks';
import { ShootingSetRow } from './ShootingSetRow';
import { setTable } from './setTable';

type ExerciseCardProps = {
  exercise: SessionExerciseDetail;
  index: number;
  count: number;
  onMove: (delta: -1 | 1) => void;
};

const MODE_SUBTITLE = {
  attempts: 'Fixed attempts · log makes',
  makes: 'Fixed makes · log attempts',
} as const;

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
    <Card>
      <View style={styles.header}>
        <View style={styles.titles}>
          <AppText variant="heading">{exercise.name}</AppText>
          <AppText variant="caption" tone="muted">
            {targetMode ? MODE_SUBTITLE[targetMode] : 'Check when done'}
          </AppText>
        </View>
        <IconButton
          icon="more_vert"
          accessibilityLabel={`${exercise.name} menu`}
          onPress={() => setMenuOpen(true)}
        />
      </View>
      <View style={styles.table}>
        {targetMode ? <ShootingHeader targetMode={targetMode} /> : <CheckHeader />}
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
        <AppText tone="muted">
          Total: {summary.makes} makes / {summary.attempts} attempts · {formatFgPct(summary.fgPct)}
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

function ShootingHeader({ targetMode }: { targetMode: 'makes' | 'attempts' }) {
  const target = targetMode === 'attempts' ? 'ATTEMPTS' : 'MAKES';
  const logged = targetMode === 'attempts' ? 'MAKES' : 'ATTEMPTS';
  return (
    <View style={setTable.row}>
      <View style={setTable.numberColumn}>
        <HeaderLabel>SET</HeaderLabel>
      </View>
      <View style={setTable.targetColumn}>
        <HeaderLabel>{target}</HeaderLabel>
      </View>
      <View style={setTable.loggedColumn}>
        <HeaderLabel>{logged}</HeaderLabel>
      </View>
      <View style={setTable.fgColumn}>
        <HeaderLabel>FG%</HeaderLabel>
      </View>
    </View>
  );
}

function CheckHeader() {
  return (
    <View style={setTable.row}>
      <View style={setTable.numberColumn}>
        <HeaderLabel>SET</HeaderLabel>
      </View>
      <View style={styles.checkHeader}>
        <HeaderLabel>DONE</HeaderLabel>
      </View>
    </View>
  );
}

function HeaderLabel({ children }: { children: string }) {
  return (
    <AppText variant="caption" tone="muted" style={styles.headerLabel}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titles: {
    flex: 1,
  },
  table: {
    gap: spacing.sm,
  },
  headerLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  checkHeader: {
    width: 56,
    marginLeft: spacing.sm,
  },
});
