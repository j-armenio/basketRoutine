import { db } from '@/db/client';
import { getExercise, listExercises, type ExerciseFilter } from '@/db/repositories/exercises';
import { useMemo } from 'react';
import { useDataVersion } from '../dataStore';
import { groupByCategory } from './catalogList';

// Sync repository reads redone when the data store's version changes, like `history/hooks.ts`.
// The catalog is a few dozen rows, so no focus gate is needed.

/** The active exercises matching the filter, grouped by category, for the Exercises tab and the picker. */
export function useExercises({ search, category, customOnly }: ExerciseFilter = {}) {
  const version = useDataVersion();
  return useMemo(() => {
    void version; // re-read after any write
    return groupByCategory(listExercises(db, { search, category, customOnly }));
  }, [version, search, category, customOnly]);
}

/** How many active exercises the whole catalog has, whatever the filter. */
export function useExerciseCount() {
  const version = useDataVersion();
  return useMemo(() => {
    void version; // re-read after any write
    return listExercises(db).length;
  }, [version]);
}

/** An active exercise, or `undefined` (unknown or deleted). */
export function useExercise(id: number | undefined) {
  const version = useDataVersion();
  return useMemo(() => {
    void version; // re-read after any write
    if (id === undefined) return undefined;
    const exercise = getExercise(db, id);
    return exercise && !exercise.archivedAt ? exercise : undefined;
  }, [id, version]);
}
