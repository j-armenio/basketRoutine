/** @jest-environment node */
import { getExercise, listExercises } from '@/db/repositories/exercises';
import { createRoutine } from '@/db/repositories/routines';
import { addWorkoutExercise, createWorkout } from '@/db/repositories/workouts';
import type { Db } from '@/db/types';
import { subscribe, type ActionResult } from '../dataStore';
import { createExercise, deleteExercise, exerciseUsage, updateExercise } from './actions';

jest.mock('@/db/client', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { createTestDb } = require('@/db/test-utils');
  const { seedExercises } = require('@/db/seed/seed');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const db = createTestDb();
  seedExercises(db);
  return { db };
});

const { db } = jest.requireMock('@/db/client') as { db: Db };

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(`unexpected failure: ${result.reason}`);
  return result.value;
}

let notifications = 0;
subscribe(() => {
  notifications += 1;
});

beforeEach(() => {
  notifications = 0;
});

const input = {
  name: 'Deep threes',
  category: 'shooting',
  trackingType: 'makes_attempts',
} as const;

test('create, update and delete each notify once', () => {
  const created = unwrap(createExercise(input));
  expect(notifications).toBe(1);
  expect(getExercise(db, created.id)).toMatchObject({ name: 'Deep threes', isCustom: true });

  const updated = unwrap(updateExercise(created.id, { name: 'Logo threes' }));
  expect(notifications).toBe(2);
  expect(updated).toMatchObject({ name: 'Logo threes', mediaUrl: null });

  unwrap(deleteExercise(created.id));
  expect(notifications).toBe(3);
  expect(listExercises(db).some((e) => e.id === created.id)).toBe(false);
});

test('a rule violation comes back as a reason and does not notify', () => {
  const [seeded] = listExercises(db);

  expect(createExercise({ ...input, name: ' ' })).toEqual({ ok: false, reason: 'empty_name' });
  expect(updateExercise(seeded.id, { name: 'X' })).toEqual({
    ok: false,
    reason: 'exercise_read_only',
  });
  expect(deleteExercise(seeded.id)).toEqual({ ok: false, reason: 'exercise_read_only' });
  expect(deleteExercise(9999)).toEqual({ ok: false, reason: 'not_found' });
  expect(notifications).toBe(0);
});

test('exerciseUsage counts the workouts that use the exercise and does not notify', () => {
  const custom = unwrap(createExercise({ ...input, trackingType: 'check' }));
  const routine = createRoutine(db, 'R');
  addWorkoutExercise(db, createWorkout(db, routine.id, 'A').id, custom.id, {
    targetValues: [null],
  });
  addWorkoutExercise(db, createWorkout(db, routine.id, 'B').id, custom.id, {
    targetValues: [null],
  });
  notifications = 0;

  expect(exerciseUsage(custom.id)).toBe(2);
  expect(notifications).toBe(0);
});

describe('media files', () => {
  const files = (jest.requireMock('expo-file-system') as { __files: Set<string> }).__files;
  const gif = { uri: 'file:///cache/picked/a', extension: 'gif', kind: 'gif' } as const;
  const mp4 = { uri: 'file:///cache/picked/b', extension: 'mp4', kind: 'video' } as const;
  const stored = () => [...files];

  beforeEach(() => files.clear());

  test('create copies the picked file into the app folder and stores its URI', () => {
    const created = unwrap(createExercise(input, gif));

    expect(created.mediaUrl).toMatch(/^file:\/\/\/docs\/exercise-media\/.+\.gif$/);
    expect(stored()).toEqual([created.mediaUrl]);
  });

  test('a failed create deletes the copy it made', () => {
    expect(createExercise({ ...input, name: ' ' }, gif)).toEqual({
      ok: false,
      reason: 'empty_name',
    });
    expect(stored()).toEqual([]);
  });

  test('a failed copy comes back as media_not_saved and writes nothing', () => {
    const { File } = jest.requireMock('expo-file-system') as {
      File: { prototype: { copySync: () => void } };
    };
    jest.spyOn(File.prototype, 'copySync').mockImplementationOnce(() => {
      throw new Error('disk full');
    });

    expect(createExercise({ ...input, name: 'Never' }, gif)).toEqual({
      ok: false,
      reason: 'media_not_saved',
    });
    expect(listExercises(db).some((e) => e.name === 'Never')).toBe(false);
    expect(notifications).toBe(0);
  });

  test('replace and remove delete the old file once the update succeeded; keep leaves it', () => {
    const created = unwrap(createExercise(input, gif));

    unwrap(updateExercise(created.id, { name: 'Renamed' }));
    expect(stored()).toEqual([created.mediaUrl]);

    const replaced = unwrap(updateExercise(created.id, {}, { type: 'replace', media: mp4 }));
    expect(replaced.mediaUrl).toMatch(/\.mp4$/);
    expect(stored()).toEqual([replaced.mediaUrl]);

    // a failed update keeps the old file and drops the new copy
    expect(updateExercise(created.id, { name: '' }, { type: 'replace', media: gif })).toEqual({
      ok: false,
      reason: 'empty_name',
    });
    expect(stored()).toEqual([replaced.mediaUrl]);

    const removed = unwrap(updateExercise(created.id, {}, { type: 'remove' }));
    expect(removed.mediaUrl).toBeNull();
    expect(stored()).toEqual([]);
  });

  test('deleting the exercise deletes its file; a refused delete keeps everything', () => {
    const created = unwrap(createExercise(input, gif));

    unwrap(deleteExercise(created.id));

    expect(stored()).toEqual([]);
    expect(getExercise(db, created.id)?.mediaUrl).toBe(created.mediaUrl);
  });
});
