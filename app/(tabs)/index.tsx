import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { NameDialog } from '@/components/NameDialog';
import { Screen } from '@/components/Screen';
import type { RoutineWithWorkouts } from '@/db/repositories/routines';
import { reasonMessage } from '@/domain/messages';
import { moveItem } from '@/domain/order';
import { spacing } from '@/theme/spacing';
import { createRoutine, moveRoutine, renameRoutine } from '@/features/routines/actions';
import { useRoutines } from '@/features/routines/hooks';
import { RoutineSection } from '@/features/routines/RoutineSection';
import {
  discardAndStartFromTemplate,
  startEmptyWorkout,
  startWorkoutFromTemplate,
} from '@/features/workout/actions';
import { useInProgressSession } from '@/features/workout/hooks';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

type Dialog = { kind: 'new' } | { kind: 'rename'; routine: RoutineWithWorkouts };

export default function WorkoutScreen() {
  const router = useRouter();
  const session = useInProgressSession();
  const routines = useRoutines();
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const startOrResume = () => {
    if (session || startEmptyWorkout().ok) router.push('/active-workout');
  };

  const openActiveWorkout = (started: { ok: boolean }) => {
    if (started.ok) router.push('/active-workout');
  };
  const showFailure = (reason: Parameters<typeof reasonMessage>[0]) =>
    Alert.alert("Couldn't start workout", reasonMessage(reason));

  const startTemplate = (workoutId: number, workoutName: string) => {
    if (!session) {
      const result = startWorkoutFromTemplate(workoutId);
      if (result.ok) openActiveWorkout(result);
      else showFailure(result.reason);
      return;
    }
    Alert.alert(
      'Workout in progress',
      `"${session.name}" is still going. Start "${workoutName}" instead?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume', onPress: () => router.push('/active-workout') },
        {
          text: 'Discard and start',
          style: 'destructive',
          onPress: () => {
            const result = discardAndStartFromTemplate(workoutId);
            if (result.ok) openActiveWorkout(result);
            else showFailure(result.reason);
          },
        },
      ],
    );
  };

  const confirmDialog = (name: string) => {
    const current = dialog;
    setDialog(null);
    const result =
      current?.kind === 'rename' ? renameRoutine(current.routine.id, name) : createRoutine(name);
    if (!result.ok) Alert.alert("Couldn't save routine", reasonMessage(result.reason));
  };

  const routineIds = routines.map((routine) => routine.id);

  return (
    <Screen title="Workout">
      <Card>
        <AppText variant="heading">Quick Start</AppText>
        <Button
          label={session ? 'Resume Workout' : 'Start Empty Workout'}
          icon={session ? 'play_arrow' : 'add'}
          fullWidth
          onPress={startOrResume}
        />
      </Card>
      <View style={styles.heading}>
        <AppText variant="heading" style={styles.headingText}>
          Routines
        </AppText>
        {routines.length > 0 && (
          <Button
            variant="ghost"
            icon="add"
            label="New Routine"
            onPress={() => setDialog({ kind: 'new' })}
          />
        )}
      </View>
      {routines.length === 0 ? (
        <EmptyState
          icon="sports_basketball"
          title="No routines yet"
          message="Create a routine to plan your training."
          action={{ label: 'New Routine', onPress: () => setDialog({ kind: 'new' }) }}
        />
      ) : (
        routines.map((routine, index) => (
          <RoutineSection
            key={routine.id}
            routine={routine}
            index={index}
            count={routines.length}
            onRename={() => setDialog({ kind: 'rename', routine })}
            onMove={(delta) => moveRoutine(moveItem(routineIds, index, delta))}
            onNewWorkout={() =>
              router.push({ pathname: '/edit-workout', params: { routineId: routine.id } })
            }
            onEditWorkout={(workoutId) =>
              router.push({ pathname: '/edit-workout', params: { workoutId } })
            }
            onStartWorkout={(workoutId) =>
              startTemplate(
                workoutId,
                routine.workouts.find((workout) => workout.id === workoutId)?.name ?? '',
              )
            }
          />
        ))
      )}
      <NameDialog
        visible={dialog !== null}
        title={dialog?.kind === 'rename' ? 'Rename Routine' : 'New Routine'}
        initialName={dialog?.kind === 'rename' ? dialog.routine.name : ''}
        confirmLabel={dialog?.kind === 'rename' ? 'Save' : 'Create'}
        onConfirm={confirmDialog}
        onClose={() => setDialog(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headingText: {
    flex: 1,
  },
});
