import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import type { RoutineWithWorkouts } from '@/db/repositories/routines';
import { moveItem } from '@/domain/order';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  /** Holding the name to drag the section and reorder it: on activation, on every following move
   * (the finger's translation from there), and on release. See `DraggableRoutineList`. */
  onDragStart: () => void;
  onDragMove: (translationY: number) => void;
  onDragEnd: () => void;
};

/**
 * A routine on the Workout tab: its name and menu, its workout cards (or a line saying there is
 * none) and "New Workout".
 */
export function RoutineSection({
  routine,
  index,
  count,
  onRename,
  onMove,
  onNewWorkout,
  onEditWorkout,
  onStartWorkout,
  onDragStart,
  onDragMove,
  onDragEnd,
}: RoutineSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const workoutIds = routine.workouts.map((workout) => workout.id);
  const n = workoutIds.length;

  // Holding the name starts a drag (the menu button beside it stays a plain tap); `runOnJS`
  // because the move only ever touches plain JS state.
  const drag = Gesture.Pan()
    .activateAfterLongPress(400)
    .runOnJS(true)
    .onStart(onDragStart)
    .onUpdate((event) => onDragMove(event.translationY))
    .onFinalize(onDragEnd);

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
    <Card style={styles.section}>
      <View style={styles.header}>
        <GestureDetector gesture={drag}>
          <View style={styles.name}>
            <AppText variant="sectionTitle" accessibilityRole="header" numberOfLines={1}>
              {routine.name}
            </AppText>
          </View>
        </GestureDetector>
        <IconButton
          icon="more_vert"
          color={colors.iconMuted}
          accessibilityLabel={`${routine.name} menu`}
          onPress={() => setMenuOpen(true)}
        />
      </View>
      {n === 0 && (
        <AppText variant="bodySmall" tone="secondary" style={styles.empty}>
          No workouts in this routine yet.
        </AppText>
      )}
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
        variant="dashed"
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
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.smPlus,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  name: {
    flex: 1,
  },
  empty: {
    paddingHorizontal: spacing.sm,
  },
});
