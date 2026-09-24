import { DEFAULT_TARGET_VALUE } from '@/domain/defaults';
import { DomainError } from '@/domain/errors';
import { summarizeSession } from '@/domain/summary';
import type { SessionSummary } from '@/domain/summary';
import type { TargetMode } from '@/domain/types';
import { validateExerciseConfig, validateSet } from '@/domain/validation';
import { asc, count, desc, eq, max } from 'drizzle-orm';
import { sessionExercises, sessionSets, sessions } from '../schema';
import type { Db, Session, SessionExercise, SessionSet } from '../types';
import { assertValid, nextPosition, requireName } from './common';
import { requireActiveExercise } from './exercises';
import { getWorkoutWithExercises, requireActiveWorkout } from './workouts';

export function getInProgressSession(db: Db): Session | undefined {
  return db.select().from(sessions).where(eq(sessions.status, 'in_progress')).get();
}

function assertNoSessionInProgress(db: Db): void {
  if (getInProgressSession(db)) {
    throw new DomainError('session_in_progress_exists');
  }
}

function requireInProgressSession(db: Db, id: number): Session {
  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) throw new DomainError('not_found');
  if (session.status !== 'in_progress') {
    throw new DomainError('session_not_in_progress');
  }
  return session;
}

/** A session exercise of an in-progress session (the only editable kind). */
function requireEditableExercise(db: Db, id: number): SessionExercise {
  const exercise = db.select().from(sessionExercises).where(eq(sessionExercises.id, id)).get();
  if (!exercise) throw new DomainError('not_found');
  requireInProgressSession(db, exercise.sessionId);
  return exercise;
}

/** A session set, with its exercise, of an in-progress session. */
function requireEditableSet(db: Db, id: number): { set: SessionSet; exercise: SessionExercise } {
  const set = db.select().from(sessionSets).where(eq(sessionSets.id, id)).get();
  if (!set) throw new DomainError('not_found');
  return { set, exercise: requireEditableExercise(db, set.sessionExerciseId) };
}

export function startEmptySession(db: Db, name: string): Session {
  const trimmed = requireName(name);
  return db.transaction((tx) => {
    assertNoSessionInProgress(tx);
    return tx
      .insert(sessions)
      .values({ name: trimmed, status: 'in_progress', startedAt: new Date() })
      .returning()
      .get();
  });
}

/**
 * Copies the workout into a new session: its name, and for each exercise the
 * catalog name/category/trackingType plus the targetMode and template sets
 * (with no logged value). Never writes to the template.
 */
export function startSessionFromWorkout(db: Db, workoutId: number): Session {
  return db.transaction((tx) => {
    assertNoSessionInProgress(tx);
    const workout = requireActiveWorkout(tx, workoutId);
    const template = getWorkoutWithExercises(tx, workoutId);

    const session = tx
      .insert(sessions)
      .values({
        workoutId,
        name: workout.name,
        status: 'in_progress',
        startedAt: new Date(),
      })
      .returning()
      .get();

    for (const item of template?.exercises ?? []) {
      const exercise = tx
        .insert(sessionExercises)
        .values({
          sessionId: session.id,
          exerciseId: item.exerciseId,
          position: item.position,
          name: item.exercise.name,
          category: item.exercise.category,
          trackingType: item.exercise.trackingType,
          targetMode: item.targetMode,
        })
        .returning()
        .get();
      if (item.sets.length > 0) {
        tx.insert(sessionSets)
          .values(
            item.sets.map((set) => ({
              sessionExerciseId: exercise.id,
              position: set.position,
              targetValue: set.targetValue,
            })),
          )
          .run();
      }
    }
    return session;
  });
}

/** The session with its exercises and sets, both ordered. */
export function getSessionDetail(db: Db, id: number) {
  return db.query.sessions
    .findFirst({
      where: eq(sessions.id, id),
      with: {
        exercises: {
          orderBy: [asc(sessionExercises.position), asc(sessionExercises.id)],
          with: {
            sets: { orderBy: [asc(sessionSets.position), asc(sessionSets.id)] },
          },
        },
      },
    })
    .sync();
}

/**
 * Adds an exercise at the end, with its first set so a new card is never empty: a shooting
 * drill's set gets the default target for its mode, a `check` set carries no values.
 */
export function addSessionExercise(
  db: Db,
  sessionId: number,
  exerciseId: number,
  targetMode?: TargetMode | null,
): SessionExercise {
  return db.transaction((tx) => {
    requireInProgressSession(tx, sessionId);
    const exercise = requireActiveExercise(tx, exerciseId);
    const mode = targetMode ?? null;
    assertValid(validateExerciseConfig(exercise.trackingType, mode));

    const last = tx
      .select({ value: max(sessionExercises.position) })
      .from(sessionExercises)
      .where(eq(sessionExercises.sessionId, sessionId))
      .get();
    const added = tx
      .insert(sessionExercises)
      .values({
        sessionId,
        exerciseId,
        position: nextPosition(last?.value),
        name: exercise.name,
        category: exercise.category,
        trackingType: exercise.trackingType,
        targetMode: mode,
      })
      .returning()
      .get();
    tx.insert(sessionSets)
      .values({
        sessionExerciseId: added.id,
        position: 0,
        targetValue: mode === null ? null : DEFAULT_TARGET_VALUE[mode],
      })
      .run();
    return added;
  });
}

export function removeSessionExercise(db: Db, sessionExerciseId: number): void {
  requireEditableExercise(db, sessionExerciseId);
  db.delete(sessionExercises).where(eq(sessionExercises.id, sessionExerciseId)).run();
}

/** `orderedIds` must be exactly the session's exercise ids, each once. */
export function reorderSessionExercises(db: Db, sessionId: number, orderedIds: number[]): void {
  db.transaction((tx) => {
    requireInProgressSession(tx, sessionId);
    const current = tx
      .select({ id: sessionExercises.id })
      .from(sessionExercises)
      .where(eq(sessionExercises.sessionId, sessionId))
      .all()
      .map((row) => row.id);
    const unique = new Set(orderedIds);
    if (
      unique.size !== orderedIds.length ||
      orderedIds.length !== current.length ||
      !current.every((id) => unique.has(id))
    ) {
      throw new DomainError('invalid_exercise_order');
    }
    orderedIds.forEach((id, position) => {
      tx.update(sessionExercises).set({ position }).where(eq(sessionExercises.id, id)).run();
    });
  });
}

export function updateSessionExerciseNote(
  db: Db,
  sessionExerciseId: number,
  note: string,
): SessionExercise {
  requireEditableExercise(db, sessionExerciseId);
  return db
    .update(sessionExercises)
    .set({ note })
    .where(eq(sessionExercises.id, sessionExerciseId))
    .returning()
    .get();
}

/**
 * Appends a set. For `makes_attempts` exercises the target defaults to the
 * last set's target, or to the mode's default target when there is no set
 * (not reachable through the app, which keeps at least one set, but kept as a safety net);
 * `check` sets carry no values.
 */
export function addSessionSet(db: Db, sessionExerciseId: number, targetValue?: number): SessionSet {
  return db.transaction((tx) => {
    const exercise = requireEditableExercise(tx, sessionExerciseId);
    const last = tx
      .select()
      .from(sessionSets)
      .where(eq(sessionSets.sessionExerciseId, sessionExerciseId))
      .orderBy(desc(sessionSets.position), desc(sessionSets.id))
      .limit(1)
      .get();

    const target =
      exercise.trackingType === 'check'
        ? (targetValue ?? null)
        : (targetValue ??
          last?.targetValue ??
          (exercise.targetMode === null ? null : DEFAULT_TARGET_VALUE[exercise.targetMode]));
    assertValid(
      validateSet({
        trackingType: exercise.trackingType,
        targetMode: exercise.targetMode,
        targetValue: target,
        loggedValue: null,
      }),
    );
    return tx
      .insert(sessionSets)
      .values({
        sessionExerciseId,
        position: nextPosition(last?.position),
        targetValue: target,
      })
      .returning()
      .get();
  });
}

/** An exercise keeps at least one set: its last set can't be deleted (remove the exercise instead). */
export function deleteSessionSet(db: Db, setId: number): void {
  db.transaction((tx) => {
    const { set } = requireEditableSet(tx, setId);
    const sets = tx
      .select({ n: count() })
      .from(sessionSets)
      .where(eq(sessionSets.sessionExerciseId, set.sessionExerciseId))
      .get();
    if ((sets?.n ?? 0) <= 1) throw new DomainError('invalid_set_count');
    tx.delete(sessionSets).where(eq(sessionSets.id, setId)).run();
  });
}

export interface SessionSetPatch {
  targetValue?: number | null;
  /** `null` clears the logged value. */
  loggedValue?: number | null;
  completed?: boolean;
}

/** Validates the resulting set (makes can never exceed attempts) before writing. */
export function updateSessionSet(db: Db, setId: number, patch: SessionSetPatch): SessionSet {
  return db.transaction((tx) => {
    const { set, exercise } = requireEditableSet(tx, setId);
    const targetValue = patch.targetValue === undefined ? set.targetValue : patch.targetValue;
    const loggedValue = patch.loggedValue === undefined ? set.loggedValue : patch.loggedValue;
    assertValid(
      validateSet({
        trackingType: exercise.trackingType,
        targetMode: exercise.targetMode,
        targetValue,
        loggedValue,
      }),
    );
    return tx
      .update(sessionSets)
      .set({ targetValue, loggedValue, completed: patch.completed })
      .where(eq(sessionSets.id, setId))
      .returning()
      .get();
  });
}

/** Marks the session finished and returns its summary. */
export function finishSession(db: Db, id: number): SessionSummary {
  return db.transaction((tx) => {
    requireInProgressSession(tx, id);
    tx.update(sessions)
      .set({ status: 'finished', finishedAt: new Date() })
      .where(eq(sessions.id, id))
      .run();
    const detail = getSessionDetail(tx, id);
    return summarizeSession(detail?.exercises ?? []);
  });
}

/** Hard-deletes an in-progress session (its exercises and sets cascade). */
export function discardSession(db: Db, id: number): void {
  requireInProgressSession(db, id);
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

/** Newest first. */
export function listFinishedSessions(db: Db): Session[] {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.status, 'finished'))
    .orderBy(desc(sessions.finishedAt), desc(sessions.id))
    .all();
}
