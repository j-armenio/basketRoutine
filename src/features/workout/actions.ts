import { db } from '@/db/client';
import {
  addSessionExercise,
  addSessionSet,
  deleteSessionSet,
  discardAndStartFromWorkout,
  discardSession,
  finishSession,
  getSessionDetail,
  overwriteWorkoutFromSession,
  removeSessionExercise,
  reorderSessionExercises,
  startEmptySession,
  startSessionFromWorkout,
  updateSessionExerciseNote,
  updateSessionSet,
  type SessionSetPatch,
} from '@/db/repositories/sessions';
import { getWorkout, getWorkoutWithExercises } from '@/db/repositories/workouts';
import { defaultWorkoutName } from '@/domain/defaults';
import { sameStructure, structureFromSession, structureFromTemplate } from '@/domain/template';
import type { TargetMode } from '@/domain/types';
import { run } from '../dataStore';

export function startEmptyWorkout() {
  return run(() => startEmptySession(db, defaultWorkoutName(new Date())));
}

export function addExercise(sessionId: number, exerciseId: number, targetMode?: TargetMode | null) {
  return run(() => addSessionExercise(db, sessionId, exerciseId, targetMode));
}

export function removeExercise(sessionExerciseId: number) {
  return run(() => removeSessionExercise(db, sessionExerciseId));
}

export function moveExercise(sessionId: number, orderedIds: number[]) {
  return run(() => reorderSessionExercises(db, sessionId, orderedIds));
}

export function updateNote(sessionExerciseId: number, note: string) {
  return run(() => updateSessionExerciseNote(db, sessionExerciseId, note));
}

export function addSet(sessionExerciseId: number) {
  return run(() => addSessionSet(db, sessionExerciseId));
}

export function deleteSet(setId: number) {
  return run(() => deleteSessionSet(db, setId));
}

export function updateSet(setId: number, patch: SessionSetPatch) {
  return run(() => updateSessionSet(db, setId, patch));
}

export function finishWorkout(sessionId: number) {
  return run(() => finishSession(db, sessionId));
}

export function discardWorkout(sessionId: number) {
  return run(() => discardSession(db, sessionId));
}

/** Starts a session from a template. Fails with `session_in_progress_exists` if one is running. */
export function startWorkoutFromTemplate(workoutId: number) {
  return run(() => startSessionFromWorkout(db, workoutId));
}

/** Replaces the running session with one from the template, in one transaction. */
export function discardAndStartFromTemplate(workoutId: number) {
  return run(() => discardAndStartFromWorkout(db, workoutId));
}

/** Overwrites the template the finished session came from with the session's structure. */
export function updateTemplateFromSession(sessionId: number) {
  return run(() => overwriteWorkoutFromSession(db, sessionId));
}

/**
 * The template to offer to update after a Finish: the session's workout, if it is still active
 * and its structure differs from the session's. Reads by id, since after Finish the screen has no
 * in-progress session left. Doesn't notify.
 */
export function templateUpdateCandidate(sessionId: number) {
  const session = getSessionDetail(db, sessionId);
  if (!session || session.workoutId === null) return undefined;
  const workout = getWorkout(db, session.workoutId);
  if (!workout || workout.archivedAt) return undefined;
  const template = getWorkoutWithExercises(db, workout.id);
  if (!template) return undefined;
  return sameStructure(structureFromSession(session), structureFromTemplate(template))
    ? undefined
    : workout;
}
