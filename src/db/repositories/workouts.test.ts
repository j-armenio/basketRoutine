/** @jest-environment node */
import { DomainError } from '@/domain/errors';
import { count, eq } from 'drizzle-orm';
import { exercises, templateSets, workouts } from '../schema';
import { seedExercises } from '../seed/seed';
import { createTestDb } from '../test-utils';
import { archiveCustomExercise, createCustomExercise } from './exercises';
import { createRoutine } from './routines';
import {
  addWorkoutExercise,
  archiveWorkout,
  createWorkout,
  getWorkoutWithExercises,
  listWorkouts,
  renameWorkout,
  reorderWorkouts,
  replaceWorkoutExercises,
  saveWorkout,
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

describe('reorderWorkouts', () => {
  test('applies the given order within the routine', () => {
    const { db, routine, workout } = setup();
    const second = createWorkout(db, routine.id, 'Second');
    const third = createWorkout(db, routine.id, 'Third');

    reorderWorkouts(db, routine.id, [third.id, workout.id, second.id]);

    expect(listWorkouts(db, routine.id).map((w) => w.name)).toEqual(['Third', 'W', 'Second']);
  });

  test('rejects missing, extra, repeated and foreign ids, and moves nothing', () => {
    const { db, routine, workout } = setup();
    const second = createWorkout(db, routine.id, 'Second');
    const other = createWorkout(db, createRoutine(db, 'Other').id, 'Elsewhere');
    const reject = (ids: number[]) => reasonOf(() => reorderWorkouts(db, routine.id, ids));

    expect(reject([workout.id])).toBe('invalid_order');
    expect(reject([workout.id, second.id, second.id])).toBe('invalid_order');
    expect(reject([workout.id, other.id])).toBe('invalid_order');
    expect(reject([workout.id, second.id, 999])).toBe('invalid_order');
    expect(listWorkouts(db, routine.id).map((w) => w.name)).toEqual(['W', 'Second']);
    expect(reasonOf(() => reorderWorkouts(db, 999, []))).toBe('not_found');
  });

  test('archived workouts stay out of the order', () => {
    const { db, routine, workout } = setup();
    const second = createWorkout(db, routine.id, 'Second');
    const third = createWorkout(db, routine.id, 'Third');
    archiveWorkout(db, second.id);

    reorderWorkouts(db, routine.id, [third.id, workout.id]);

    expect(listWorkouts(db, routine.id).map((w) => w.name)).toEqual(['Third', 'W']);
    expect(reasonOf(() => reorderWorkouts(db, routine.id, [third.id, workout.id, second.id]))).toBe(
      'invalid_order',
    );
  });
});

describe('saveWorkout', () => {
  const freeThrows = (db: Db, targetValues = [10, 10]) => ({
    exerciseId: exerciseId(db, 'free_throws'),
    targetMode: 'attempts' as const,
    targetValues,
  });
  const figure8 = (db: Db) => ({
    exerciseId: exerciseId(db, 'figure_8'),
    targetMode: null,
    targetValues: [null],
  });
  const setCount = (db: Db) => db.select({ n: count() }).from(templateSets).get()!.n;
  const workoutCount = (db: Db) => db.select({ n: count() }).from(workouts).get()!.n;

  test('creates a workout at the end of the routine with its exercises and sets', () => {
    const { db, routine } = setup();

    const saved = saveWorkout(db, {
      routineId: routine.id,
      name: '  New one ',
      exercises: [freeThrows(db, [20, 20]), figure8(db)],
    });

    expect(saved).toMatchObject({ name: 'New one', routineId: routine.id, position: 1 });
    const detail = getWorkoutWithExercises(db, saved.id)!;
    expect(detail.exercises.map((e) => e.exercise.name)).toEqual(['Free Throws', 'Figure 8']);
    expect(detail.exercises[0].sets.map((s) => s.targetValue)).toEqual([20, 20]);
    expect(detail.exercises[1].sets.map((s) => s.targetValue)).toEqual([null]);
  });

  test('saving again replaces the exercises and sets, and renames', () => {
    const { db, routine, workout } = setup();
    saveWorkout(db, {
      workoutId: workout.id,
      routineId: routine.id,
      name: 'W',
      exercises: [freeThrows(db)],
    });
    expect(setCount(db)).toBe(2);

    const saved = saveWorkout(db, {
      workoutId: workout.id,
      routineId: routine.id,
      name: 'Renamed',
      exercises: [figure8(db), freeThrows(db, [7])],
    });

    expect(saved.id).toBe(workout.id);
    const detail = getWorkoutWithExercises(db, workout.id)!;
    expect(detail.name).toBe('Renamed');
    expect(detail.exercises.map((e) => e.exercise.name)).toEqual(['Figure 8', 'Free Throws']);
    expect(detail.exercises.map((e) => e.position)).toEqual([0, 1]);
    // the old sets are gone, not orphaned
    expect(setCount(db)).toBe(2);
    expect(listWorkouts(db, routine.id)).toHaveLength(1);
  });

  test('the routine is ignored when editing', () => {
    const { db, workout } = setup();
    const other = createRoutine(db, 'Other');

    saveWorkout(db, {
      workoutId: workout.id,
      routineId: other.id,
      name: 'W',
      exercises: [figure8(db)],
    });

    expect(getWorkoutWithExercises(db, workout.id)!.routineId).toBe(workout.routineId);
  });

  test('an invalid exercise rolls a new workout back completely', () => {
    const { db, routine } = setup();
    const before = workoutCount(db);

    const reason = reasonOf(() =>
      saveWorkout(db, {
        routineId: routine.id,
        name: 'Half',
        exercises: [freeThrows(db), freeThrows(db, [10, 0])],
      }),
    );

    expect(reason).toBe('invalid_target_value');
    expect(workoutCount(db)).toBe(before);
    expect(setCount(db)).toBe(0);
  });

  test('an invalid exercise leaves an edited template as it was', () => {
    const { db, routine, workout } = setup();
    saveWorkout(db, {
      workoutId: workout.id,
      routineId: routine.id,
      name: 'W',
      exercises: [freeThrows(db)],
    });
    const before = getWorkoutWithExercises(db, workout.id);

    const reason = reasonOf(() =>
      saveWorkout(db, {
        workoutId: workout.id,
        routineId: routine.id,
        name: 'Changed',
        exercises: [figure8(db), { ...freeThrows(db), targetMode: null }],
      }),
    );

    expect(reason).toBe('target_mode_required');
    expect(getWorkoutWithExercises(db, workout.id)).toEqual(before);
  });

  test('needs a name, at least one exercise, and an existing routine or workout', () => {
    const { db, routine, workout } = setup();
    const save = (input: Partial<Parameters<typeof saveWorkout>[1]>) =>
      reasonOf(() =>
        saveWorkout(db, { routineId: routine.id, name: 'X', exercises: [figure8(db)], ...input }),
      );

    expect(save({ name: '  ' })).toBe('empty_name');
    expect(save({ exercises: [] })).toBe('empty_workout');
    expect(save({ routineId: 999 })).toBe('not_found');
    expect(save({ workoutId: 999 })).toBe('not_found');
    archiveWorkout(db, workout.id);
    expect(save({ workoutId: workout.id })).toBe('not_found');
    expect(workoutCount(db)).toBe(1);
  });

  test('an archived exercise is refused', () => {
    const { db, routine } = setup();
    const custom = createCustomExercise(db, {
      name: 'Mine',
      category: 'shooting',
      trackingType: 'check',
    });
    archiveCustomExercise(db, custom.id);

    const reason = reasonOf(() =>
      saveWorkout(db, {
        routineId: routine.id,
        name: 'X',
        exercises: [{ exerciseId: custom.id, targetMode: null, targetValues: [null] }],
      }),
    );

    expect(reason).toBe('exercise_archived');
  });
});

test('replaceWorkoutExercises needs at least one exercise', () => {
  const { db, workout } = setup();
  expect(reasonOf(() => replaceWorkoutExercises(db, workout.id, []))).toBe('empty_workout');
});
