import { db } from '@/db/client';
import { getRoutine } from '@/db/repositories/routines';
import { getWorkout, getWorkoutWithExercises } from '@/db/repositories/workouts';
import { draftFromWorkout, emptyDraft, type TemplateDraft } from './templateDraft';

/**
 * The draft the editor starts from: the workout's own (`workoutId`), or an empty one for a new
 * workout in the routine (`routineId`). `null` for a stale link: an unknown or archived workout
 * or routine.
 */
export function loadDraft(params: {
  workoutId?: number;
  routineId?: number;
}): TemplateDraft | null {
  if (params.workoutId !== undefined) {
    const workout = getWorkout(db, params.workoutId);
    if (!workout || workout.archivedAt) return null;
    const detail = getWorkoutWithExercises(db, workout.id);
    return detail ? draftFromWorkout(detail) : null;
  }
  if (params.routineId === undefined) return null;
  const routine = getRoutine(db, params.routineId);
  return routine && !routine.archivedAt ? emptyDraft(routine.id) : null;
}
