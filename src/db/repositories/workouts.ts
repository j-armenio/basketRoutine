import { DomainError } from '@/domain/errors';
import type { TargetMode } from '@/domain/types';
import { validateExerciseConfig, validateTargetValue } from '@/domain/validation';
import { and, asc, eq, isNull, max } from 'drizzle-orm';
import { templateSets, workoutExercises, workouts } from '../schema';
import type { Db, Workout, WorkoutExercise } from '../types';
import { assertSameIds, assertValid, nextPosition, requireName } from './common';
import { requireActiveExercise } from './exercises';
import { requireActiveRoutine } from './routines';

export function listWorkouts(db: Db, routineId: number): Workout[] {
  return db
    .select()
    .from(workouts)
    .where(and(eq(workouts.routineId, routineId), isNull(workouts.archivedAt)))
    .orderBy(asc(workouts.position), asc(workouts.id))
    .all();
}

export function getWorkout(db: Db, id: number): Workout | undefined {
  return db.select().from(workouts).where(eq(workouts.id, id)).get();
}

/** An active workout, or `not_found`. */
export function requireActiveWorkout(db: Db, id: number): Workout {
  const workout = getWorkout(db, id);
  if (!workout || workout.archivedAt) throw new DomainError('not_found');
  return workout;
}

/** Appended at the end of the routine's workouts. */
function insertWorkout(db: Db, routineId: number, name: string): Workout {
  requireActiveRoutine(db, routineId);
  const last = db
    .select({ value: max(workouts.position) })
    .from(workouts)
    .where(eq(workouts.routineId, routineId))
    .get();
  return db
    .insert(workouts)
    .values({ routineId, name, position: nextPosition(last?.value) })
    .returning()
    .get();
}

/** Appended at the end of the routine's workouts. */
export function createWorkout(db: Db, routineId: number, name: string): Workout {
  const trimmed = requireName(name);
  return db.transaction((tx) => insertWorkout(tx, routineId, trimmed));
}

export function renameWorkout(db: Db, id: number, name: string): Workout {
  const trimmed = requireName(name);
  requireActiveWorkout(db, id);
  return db.update(workouts).set({ name: trimmed }).where(eq(workouts.id, id)).returning().get();
}

export function archiveWorkout(db: Db, id: number): void {
  requireActiveWorkout(db, id);
  db.update(workouts).set({ archivedAt: new Date() }).where(eq(workouts.id, id)).run();
}

/** The workout with its exercises and template sets, both ordered. */
export function getWorkoutWithExercises(db: Db, id: number) {
  return db.query.workouts
    .findFirst({
      where: eq(workouts.id, id),
      with: {
        exercises: {
          orderBy: [asc(workoutExercises.position), asc(workoutExercises.id)],
          with: {
            exercise: true,
            sets: { orderBy: [asc(templateSets.position), asc(templateSets.id)] },
          },
        },
      },
    })
    .sync();
}

export interface WorkoutExerciseInput {
  /** Required for `makes_attempts` exercises, absent for `check` ones. */
  targetMode?: TargetMode | null;
  /** One entry per template set: integers >= 1, or all `null` for `check`. */
  targetValues: (number | null)[];
}

/** Appends the exercise and its sets after validating them. No transaction of its own. */
function insertWorkoutExercise(
  db: Db,
  workoutId: number,
  exerciseId: number,
  input: WorkoutExerciseInput,
): WorkoutExercise {
  const exercise = requireActiveExercise(db, exerciseId);
  const targetMode = input.targetMode ?? null;
  assertValid(validateExerciseConfig(exercise.trackingType, targetMode));

  if (input.targetValues.length === 0) throw new DomainError('invalid_set_count');
  for (const value of input.targetValues) {
    if (exercise.trackingType === 'check') {
      if (value !== null) throw new DomainError('value_not_allowed');
    } else if (value === null) {
      throw new DomainError('invalid_target_value');
    } else {
      assertValid(validateTargetValue(value));
    }
  }

  const last = db
    .select({ value: max(workoutExercises.position) })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .get();
  const workoutExercise = db
    .insert(workoutExercises)
    .values({
      workoutId,
      exerciseId,
      position: nextPosition(last?.value),
      targetMode,
    })
    .returning()
    .get();
  db.insert(templateSets)
    .values(
      input.targetValues.map((targetValue, position) => ({
        workoutExerciseId: workoutExercise.id,
        position,
        targetValue,
      })),
    )
    .run();
  return workoutExercise;
}

export function addWorkoutExercise(
  db: Db,
  workoutId: number,
  exerciseId: number,
  input: WorkoutExerciseInput,
): WorkoutExercise {
  return db.transaction((tx) => {
    requireActiveWorkout(tx, workoutId);
    return insertWorkoutExercise(tx, workoutId, exerciseId, input);
  });
}

export interface WorkoutExerciseItem extends WorkoutExerciseInput {
  exerciseId: number;
}

/**
 * Replaces the workout's exercises and template sets with `items` (at least one). Nothing refers
 * to those rows (sessions keep their own snapshot), so deleting them is safe for history. Meant
 * to run inside a transaction, so a failed item leaves the old template in place.
 */
export function replaceWorkoutExercises(db: Db, workoutId: number, items: WorkoutExerciseItem[]) {
  if (items.length === 0) throw new DomainError('empty_workout');
  db.delete(workoutExercises).where(eq(workoutExercises.workoutId, workoutId)).run(); // sets cascade
  for (const item of items) insertWorkoutExercise(db, workoutId, item.exerciseId, item);
  db.update(workouts).set({ updatedAt: new Date() }).where(eq(workouts.id, workoutId)).run();
}

/** `orderedIds` must be exactly the routine's active workout ids, each once. */
export function reorderWorkouts(db: Db, routineId: number, orderedIds: number[]): void {
  db.transaction((tx) => {
    requireActiveRoutine(tx, routineId);
    assertSameIds(
      listWorkouts(tx, routineId).map((workout) => workout.id),
      orderedIds,
    );
    orderedIds.forEach((id, position) => {
      tx.update(workouts).set({ position }).where(eq(workouts.id, id)).run();
    });
  });
}

export interface SaveWorkoutInput {
  /** Edits this workout. Absent: creates one in `routineId`. */
  workoutId?: number;
  /** Ignored when editing: moving a workout is out of scope. */
  routineId: number;
  name: string;
  exercises: WorkoutExerciseItem[];
}

/**
 * Creates or edits a whole template in one transaction: the workout (or its name), then its
 * exercises replaced by `exercises`. A failed rule rolls everything back, so a new workout is
 * never left half-created.
 */
export function saveWorkout(db: Db, input: SaveWorkoutInput): Workout {
  const name = requireName(input.name);
  return db.transaction((tx) => {
    let workout: Workout;
    if (input.workoutId === undefined) {
      workout = insertWorkout(tx, input.routineId, name);
    } else {
      requireActiveWorkout(tx, input.workoutId);
      workout = tx
        .update(workouts)
        .set({ name })
        .where(eq(workouts.id, input.workoutId))
        .returning()
        .get();
    }
    replaceWorkoutExercises(tx, workout.id, input.exercises);
    return workout;
  });
}
