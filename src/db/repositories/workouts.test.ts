/** @jest-environment node */
import { DomainError } from '@/domain/errors';
import { eq } from 'drizzle-orm';
import { exercises } from '../schema';
import { seedExercises } from '../seed/seed';
import { createTestDb } from '../test-utils';
import { createRoutine } from './routines';
import {
  addWorkoutExercise,
  archiveWorkout,
  createWorkout,
  getWorkoutWithExercises,
  listWorkouts,
  renameWorkout,
} from './workouts';
import type { Db } from '../types';

const exerciseId = (db: Db, seedKey: string) =>
  db.select().from(exercises).where(eq(exercises.seedKey, seedKey)).get()!.id;

const reasonOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.reason;
    throw e;
  }
  return undefined;
};

function setup() {
  const db = createTestDb();
  seedExercises(db);
  const routine = createRoutine(db, 'R');
  const workout = createWorkout(db, routine.id, 'W');
  return { db, routine, workout };
}

describe('workouts', () => {
  test('are created, renamed, ordered and archived', () => {
    const { db, routine, workout } = setup();
    const second = createWorkout(db, routine.id, 'Second');
    expect(listWorkouts(db, routine.id).map((w) => w.position)).toEqual([0, 1]);
    expect(renameWorkout(db, workout.id, 'First').name).toBe('First');
    archiveWorkout(db, workout.id);
    expect(listWorkouts(db, routine.id).map((w) => w.id)).toEqual([second.id]);
    expect(reasonOf(() => renameWorkout(db, workout.id, 'x'))).toBe('not_found');
  });

  test('a workout needs an existing routine', () => {
    const { db } = setup();
    expect(reasonOf(() => createWorkout(db, 999, 'W'))).toBe('not_found');
  });

  test('addWorkoutExercise stores the exercise with its ordered sets', () => {
    const { db, workout } = setup();
    addWorkoutExercise(db, workout.id, exerciseId(db, 'free_throws'), {
      targetMode: 'attempts',
      targetValues: [10, 10, 5],
    });
    addWorkoutExercise(db, workout.id, exerciseId(db, 'figure_8'), {
      targetValues: [null, null],
    });

    const detail = getWorkoutWithExercises(db, workout.id)!;
    expect(detail.exercises.map((e) => e.exercise.name)).toEqual(['Free Throws', 'Figure 8']);
    expect(detail.exercises[0].targetMode).toBe('attempts');
    expect(detail.exercises[0].sets.map((s) => s.targetValue)).toEqual([10, 10, 5]);
    expect(detail.exercises[1].targetMode).toBeNull();
    expect(detail.exercises[1].sets.map((s) => s.position)).toEqual([0, 1]);
  });

  test('addWorkoutExercise validates against the exercise tracking type', () => {
    const { db, workout } = setup();
    const shooting = exerciseId(db, 'free_throws');
    const check = exerciseId(db, 'figure_8');
    const add = (id: number, targetMode: 'makes' | null, values: (number | null)[]) =>
      reasonOf(() => addWorkoutExercise(db, workout.id, id, { targetMode, targetValues: values }));

    expect(add(shooting, null, [10])).toBe('target_mode_required');
    expect(add(check, 'makes', [null])).toBe('target_mode_not_allowed');
    expect(add(shooting, 'makes', [])).toBe('invalid_set_count');
    expect(add(shooting, 'makes', [0])).toBe('invalid_target_value');
    expect(add(shooting, 'makes', [null])).toBe('invalid_target_value');
    expect(add(check, null, [3])).toBe('value_not_allowed');
    expect(getWorkoutWithExercises(db, workout.id)!.exercises).toEqual([]);
  });

  test('a bad set in the middle rolls the whole exercise back', () => {
    const { db, workout } = setup();
    expect(
      reasonOf(() =>
        addWorkoutExercise(db, workout.id, exerciseId(db, 'free_throws'), {
          targetMode: 'makes',
          targetValues: [5, 0],
        }),
      ),
    ).toBe('invalid_target_value');
    expect(getWorkoutWithExercises(db, workout.id)!.exercises).toEqual([]);
  });
});
