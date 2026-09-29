import { db } from '@/db/client';
import { getExercise } from '@/db/repositories/exercises';
import { getRoutine } from '@/db/repositories/routines';
import { getWorkout, getWorkoutWithExercises } from '@/db/repositories/workouts';
import { TARGET_MODES, type TargetMode } from '@/domain/types';
import { addExercise, draftFromWorkout, emptyDraft, type TemplateDraft } from './templateDraft';

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

/**
 * `draft` with the exercise Add to Routine asked for appended (`?addExerciseId=` and, for a
 * shooting drill, `?targetMode=`). Unchanged when there is nothing to add or the request is stale:
 * an unknown or deleted exercise, or a shooting drill with no valid mode.
 */
export function withRequestedExercise(
  draft: TemplateDraft,
  params: { exerciseId?: number; targetMode?: string },
): TemplateDraft {
  if (params.exerciseId === undefined) return draft;
  const exercise = getExercise(db, params.exerciseId);
  if (!exercise || exercise.archivedAt) return draft;
  if (exercise.trackingType === 'check') return addExercise(draft, exercise, null);
  const mode = TARGET_MODES.find((value) => value === params.targetMode) as TargetMode | undefined;
  return mode ? addExercise(draft, exercise, mode) : draft;
}
