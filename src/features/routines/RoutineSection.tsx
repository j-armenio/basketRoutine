import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import type { RoutineWithWorkouts } from '@/db/repositories/routines';
import { moveItem } from '@/domain/order';
import { spacing } from '@/theme/spacing';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { deleteRoutine, moveWorkout } from './actions';
import { WorkoutCard } from './WorkoutCard';

type RoutineSectionProps = {
  routine: RoutineWithWorkouts;
  index: number;
  count: number;
  onRename: () => void;
  onMove: (delta: -1 | 1) => void;
  onNewWorkout: () => void;
  onEditWorkout: (workoutId: number) => void;
  onStartWorkout: (workoutId: number) => void;
};

/** A routine on the Workout tab: its name and menu, its workout cards and "New Workout". */
export function RoutineSection({
  routine,
  index,
  count,
  onRename,
  onMove,
  onNewWorkout,
  onEditWorkout,
  onStartWorkout,
}: RoutineSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const workoutIds = routine.workouts.map((workout) => workout.id);
  const n = workoutIds.length;

  const confirmDelete = () =>
    Alert.alert(
      `Delete "${routine.name}"?`,
      n === 0
        ? 'Your history stays.'
        : `Its ${n} ${n === 1 ? 'workout' : 'workouts'} will be deleted too. Your history stays.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine(routine.id) },
      ],
    );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="heading" numberOfLines={1} style={styles.name}>
          {routine.name}
        </AppText>
        <IconButton
          icon="more_vert"
          accessibilityLabel={`${routine.name} menu`}
          onPress={() => setMenuOpen(true)}
        />
      </View>
      {routine.workouts.map((workout, position) => (
        <WorkoutCard
          key={workout.id}
          workout={workout}
          index={position}
          count={n}
          onStart={() => onStartWorkout(workout.id)}
          onEdit={() => onEditWorkout(workout.id)}
          onMove={(delta) => moveWorkout(routine.id, moveItem(workoutIds, position, delta))}
        />
      ))}
      <Button
        variant="ghost"
        icon="add"
        label="New Workout"
        accessibilityLabel={`New workout in ${routine.name}`}
        fullWidth
        onPress={onNewWorkout}
      />
      <ActionSheet
        visible={menuOpen}
        title={routine.name}
        options={[
          { label: 'Rename', icon: 'edit', onPress: onRename },
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
          { label: 'Delete', icon: 'delete', destructive: true, onPress: confirmDelete },
        ]}
        onClose={() => setMenuOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
});
