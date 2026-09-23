import { DomainError } from '@/domain/errors';
import type { TargetMode } from '@/domain/types';
import { validateExerciseConfig, validateTargetValue } from '@/domain/validation';
import { and, asc, eq, isNull, max } from 'drizzle-orm';
import { templateSets, workoutExercises, workouts } from '../schema';
import type { Db, Workout, WorkoutExercise } from '../types';
import { assertValid, nextPosition, requireName } from './common';
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
export function createWorkout(db: Db, routineId: number, name: string): Workout {
  const trimmed = requireName(name);
  return db.transaction((tx) => {
    requireActiveRoutine(tx, routineId);
    const last = tx
      .select({ value: max(workouts.position) })
      .from(workouts)
      .where(eq(workouts.routineId, routineId))
      .get();
    return tx
      .insert(workouts)
      .values({ routineId, name: trimmed, position: nextPosition(last?.value) })
      .returning()
      .get();
  });
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

export function addWorkoutExercise(
  db: Db,
  workoutId: number,
  exerciseId: number,
  input: WorkoutExerciseInput,
): WorkoutExercise {
  return db.transaction((tx) => {
    requireActiveWorkout(tx, workoutId);
    const exercise = requireActiveExercise(tx, exerciseId);
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

    const last = tx
      .select({ value: max(workoutExercises.position) })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId))
      .get();
    const workoutExercise = tx
      .insert(workoutExercises)
      .values({
        workoutId,
        exerciseId,
        position: nextPosition(last?.value),
        targetMode,
      })
      .returning()
      .get();
    tx.insert(templateSets)
      .values(
        input.targetValues.map((targetValue, position) => ({
          workoutExerciseId: workoutExercise.id,
          position,
          targetValue,
        })),
      )
      .run();
    return workoutExercise;
  });
}
