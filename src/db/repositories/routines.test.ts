/** @jest-environment node */
import { DomainError } from '@/domain/errors';
import { createTestDb } from '../test-utils';
import { archiveRoutine, createRoutine, getRoutine, listRoutines, renameRoutine } from './routines';
import { createWorkout, getWorkout, listWorkouts } from './workouts';

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
