import { db } from '@/db/client';
import {
  addSessionExercise,
  addSessionSet,
  deleteSessionSet,
  discardSession,
  finishSession,
  removeSessionExercise,
  reorderSessionExercises,
  startEmptySession,
  updateSessionExerciseNote,
  updateSessionSet,
  type SessionSetPatch,
} from '@/db/repositories/sessions';
import { defaultWorkoutName } from '@/domain/defaults';
import { DomainError, type DomainErrorReason } from '@/domain/errors';
import type { TargetMode } from '@/domain/types';
import { notifySessionChanged } from './sessionStore';

export type ActionResult<T> = { ok: true; value: T } | { ok: false; reason: DomainErrorReason };

/**
 * Every session write goes through here: it calls the repository, tells the store, and turns a
 * `DomainError` into a reason the screen can show. Any other error is rethrown, so a real bug
 * still shows up. A failed write doesn't notify: nothing changed.
 */
function run<T>(write: () => T): ActionResult<T> {
  let value: T;
  try {
    value = write();
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, reason: error.reason };
    throw error;
  }
  notifySessionChanged();
  return { ok: true, value };
}

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
