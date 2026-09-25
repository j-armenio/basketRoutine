/** @jest-environment node */
import { DomainError } from '@/domain/errors';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../test-utils';
import { exercises } from '../schema';
import { seedExercises } from '../seed/seed';
import {
  archiveRoutine,
  createRoutine,
  getRoutine,
  listRoutines,
  listRoutinesWithWorkouts,
  renameRoutine,
  reorderRoutines,
} from './routines';
import {
  addWorkoutExercise,
  archiveWorkout,
  createWorkout,
  getWorkout,
  listWorkouts,
} from './workouts';

describe('routines', () => {
  test('are appended at the end and listed by position', () => {
    const db = createTestDb();
    createRoutine(db, 'Push');
    createRoutine(db, ' Pull ');
    expect(listRoutines(db).map((r) => [r.name, r.position])).toEqual([
      ['Push', 0],
      ['Pull', 1],
    ]);
  });

  test('can be renamed', () => {
    const db = createTestDb();
    const routine = createRoutine(db, 'Old');
    expect(renameRoutine(db, routine.id, 'New').name).toBe('New');
    expect(() => renameRoutine(db, routine.id, ' ')).toThrow(DomainError);
  });

  test('archiving hides the routine and its workouts, but keeps the rows', () => {
    const db = createTestDb();
    const keep = createRoutine(db, 'Keep');
    const routine = createRoutine(db, 'Gone');
    const workout = createWorkout(db, routine.id, 'W1');
    const other = createWorkout(db, keep.id, 'W2');

    archiveRoutine(db, routine.id);

    expect(listRoutines(db).map((r) => r.id)).toEqual([keep.id]);
    expect(listWorkouts(db, routine.id)).toEqual([]);
    expect(listWorkouts(db, keep.id).map((w) => w.id)).toEqual([other.id]);
    expect(getRoutine(db, routine.id)?.archivedAt).toBeInstanceOf(Date);
    expect(getWorkout(db, workout.id)?.archivedAt).toBeInstanceOf(Date);
  });

  test('a new routine after archiving does not reuse positions', () => {
    const db = createTestDb();
    const a = createRoutine(db, 'A');
    archiveRoutine(db, a.id);
    expect(createRoutine(db, 'B').position).toBe(1);
  });

  test('archived routines cannot be changed or receive workouts', () => {
    const db = createTestDb();
    const routine = createRoutine(db, 'A');
    archiveRoutine(db, routine.id);
    expect(() => renameRoutine(db, routine.id, 'B')).toThrow(DomainError);
    expect(() => createWorkout(db, routine.id, 'W')).toThrow(DomainError);
  });
});

const reasonOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.reason;
    throw e;
  }
  return undefined;
};

describe('reorderRoutines', () => {
  test('applies the given order', () => {
    const db = createTestDb();
    const [a, b, c] = ['A', 'B', 'C'].map((name) => createRoutine(db, name));

    reorderRoutines(db, [c.id, a.id, b.id]);

    expect(listRoutines(db).map((r) => [r.name, r.position])).toEqual([
      ['C', 0],
      ['A', 1],
      ['B', 2],
    ]);
  });

  test('rejects missing, extra and repeated ids, and moves nothing', () => {
    const db = createTestDb();
    const [a, b, c] = ['A', 'B', 'C'].map((name) => createRoutine(db, name));
    const reject = (ids: number[]) => reasonOf(() => reorderRoutines(db, ids));

    expect(reject([a.id, b.id])).toBe('invalid_order');
    expect(reject([a.id, b.id, c.id, c.id])).toBe('invalid_order');
    expect(reject([c.id, c.id, a.id])).toBe('invalid_order');
    expect(reject([a.id, b.id, 999])).toBe('invalid_order');
    expect(listRoutines(db).map((r) => r.name)).toEqual(['A', 'B', 'C']);
  });

  test('archived routines stay out of the order, and asking for one is rejected', () => {
    const db = createTestDb();
    const [a, b, c] = ['A', 'B', 'C'].map((name) => createRoutine(db, name));
    archiveRoutine(db, b.id);

    reorderRoutines(db, [c.id, a.id]);

    expect(listRoutines(db).map((r) => r.name)).toEqual(['C', 'A']);
    expect(getRoutine(db, b.id)?.position).toBe(1);
    expect(reasonOf(() => reorderRoutines(db, [c.id, a.id, b.id]))).toBe('invalid_order');
  });
});

describe('listRoutinesWithWorkouts', () => {
  test('lists active routines and workouts in order, with each workout exercise names', () => {
    const db = createTestDb();
    seedExercises(db);
    const id = (seedKey: string) =>
      db.select().from(exercises).where(eq(exercises.seedKey, seedKey)).get()!.id;
    const push = createRoutine(db, 'Push');
    const gone = createRoutine(db, 'Gone');
    const pull = createRoutine(db, 'Pull');
    const w1 = createWorkout(db, push.id, 'One');
    const w2 = createWorkout(db, push.id, 'Two');
    const hidden = createWorkout(db, push.id, 'Hidden');
    createWorkout(db, gone.id, 'Of a gone routine');
    addWorkoutExercise(db, w1.id, id('free_throws'), {
      targetMode: 'attempts',
      targetValues: [10],
    });
    addWorkoutExercise(db, w1.id, id('figure_8'), { targetValues: [null] });
    archiveWorkout(db, hidden.id);
    archiveRoutine(db, gone.id);

    const list = listRoutinesWithWorkouts(db);

    expect(list.map((r) => r.name)).toEqual(['Push', 'Pull']);
    expect(list[0].workouts.map((w) => w.name)).toEqual(['One', 'Two']);
    expect(list[0].workouts[0].exercises.map((e) => e.exercise.name)).toEqual([
      'Free Throws',
      'Figure 8',
    ]);
    expect(list[0].workouts[1]).toMatchObject({ id: w2.id, exercises: [] });
    expect(list[1]).toMatchObject({ id: pull.id, workouts: [] });
  });
});
