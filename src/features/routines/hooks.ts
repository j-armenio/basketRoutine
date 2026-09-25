import { db } from '@/db/client';
import { listRoutinesWithWorkouts } from '@/db/repositories/routines';
import { getWorkout, getWorkoutWithExercises } from '@/db/repositories/workouts';
import { useMemo } from 'react';
import { useDataVersion } from '../dataStore';

// Sync repository reads redone when the data store's version changes, like `workout/hooks.ts`.

/** The active routines with their active workouts, for the Workout tab. */
export function useRoutines() {
  const version = useDataVersion();
  return useMemo(() => {
    void version; // re-read after any write
    return listRoutinesWithWorkouts(db);
  }, [version]);
}

/** An active workout with its exercises and sets, or `undefined` (unknown or archived). */
export function useWorkoutTemplate(id: number | undefined) {
  const version = useDataVersion();
  return useMemo(() => {
    void version; // re-read after any write
    if (id === undefined) return undefined;
    const workout = getWorkout(db, id);
    return workout && !workout.archivedAt ? getWorkoutWithExercises(db, id) : undefined;
  }, [id, version]);
}

export type WorkoutTemplate = NonNullable<ReturnType<typeof useWorkoutTemplate>>;
