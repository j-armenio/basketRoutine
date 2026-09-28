/** @jest-environment node */
import { DomainError } from '@/domain/errors';
import { exercises } from '../schema';
import { seedExercises } from '../seed/seed';
import { createTestDb } from '../test-utils';
import {
  archiveCustomExercise,
  archivedExerciseIds,
  countWorkoutsUsingExercise,
  createCustomExercise,
  getExercise,
  listExercises,
  updateCustomExercise,
} from './exercises';
import { createRoutine, archiveRoutine } from './routines';
import { addWorkoutExercise, createWorkout } from './workouts';

const reasonOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.reason;
    throw e;
  }
  return undefined;
};

describe('exercises', () => {
  test('lists active exercises by name, filtered by category and search', () => {
    const db = createTestDb();
    seedExercises(db);

    const all = listExercises(db);
    expect(all).toHaveLength(38);
    const names = all.map((e) => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    const shooting = listExercises(db, { category: 'shooting' });
    expect(shooting).toHaveLength(9);
    expect(shooting.every((e) => e.category === 'shooting')).toBe(true);

    expect(listExercises(db, { search: 'free THROW' }).map((e) => e.name)).toEqual(['Free Throws']);
    expect(listExercises(db, { search: '100%' })).toEqual([]);
    expect(listExercises(db, { search: 'layups', category: 'shooting' })).toEqual([]);
  });

  test('customOnly lists only custom exercises, and combines with search and category', () => {
    const db = createTestDb();
    seedExercises(db);
    const input = { trackingType: 'check' } as const;
    createCustomExercise(db, { ...input, name: 'My Layups', category: 'finishing' });
    createCustomExercise(db, { ...input, name: 'My Slalom', category: 'footwork' });
    const gone = createCustomExercise(db, { ...input, name: 'My Gone', category: 'footwork' });
    archiveCustomExercise(db, gone.id);

    const names = (filter: Parameters<typeof listExercises>[1]) =>
      listExercises(db, filter).map((e) => e.name);
    expect(names({ customOnly: true })).toEqual(['My Layups', 'My Slalom']);
    expect(names({ customOnly: true, search: 'layups' })).toEqual(['My Layups']);
    expect(names({ customOnly: true, category: 'footwork' })).toEqual(['My Slalom']);
    expect(names({ search: 'layups' })).toContain('Right-Hand Layups');
  });

  test('predefined exercises are read-only', () => {
    const db = createTestDb();
    seedExercises(db);
    const [seeded] = listExercises(db);
    expect(reasonOf(() => updateCustomExercise(db, seeded.id, { name: 'X' }))).toBe(
      'exercise_read_only',
    );
    expect(reasonOf(() => archiveCustomExercise(db, seeded.id))).toBe('exercise_read_only');
    expect(getExercise(db, seeded.id)?.archivedAt).toBeNull();
  });

  test('custom exercises can be created, updated and archived', () => {
    const db = createTestDb();
    const created = createCustomExercise(db, {
      name: '  Deep threes ',
      category: 'shooting',
      trackingType: 'makes_attempts',
    });
    expect(created).toMatchObject({
      name: 'Deep threes',
      isCustom: true,
      seedKey: null,
      description: '',
    });

    const updated = updateCustomExercise(db, created.id, {
      name: 'Logo threes',
      description: 'Far',
    });
    expect(updated).toMatchObject({
      name: 'Logo threes',
      description: 'Far',
      category: 'shooting',
      trackingType: 'makes_attempts',
    });

    archiveCustomExercise(db, created.id);
    expect(listExercises(db)).toEqual([]);
    expect(getExercise(db, created.id)?.archivedAt).toBeInstanceOf(Date);
  });

  test('rejects empty names and unknown ids', () => {
    const db = createTestDb();
    expect(
      reasonOf(() =>
        createCustomExercise(db, {
          name: '   ',
          category: 'shooting',
          trackingType: 'check',
        }),
      ),
    ).toBe('empty_name');
    expect(reasonOf(() => updateCustomExercise(db, 99, { name: 'X' }))).toBe('not_found');
  });
});

describe('media', () => {
  const input = { name: 'Drill', category: 'shooting', trackingType: 'check' } as const;
  const gif = 'file:///docs/exercise-media/a.gif';
  const mp4 = 'file:///docs/exercise-media/b.mp4';

  test('is trimmed on create, and blank or missing means none', () => {
    const db = createTestDb();
    expect(createCustomExercise(db, { ...input, mediaUrl: `  ${gif} ` }).mediaUrl).toBe(gif);
    expect(createCustomExercise(db, { ...input, mediaUrl: '   ' }).mediaUrl).toBeNull();
    expect(createCustomExercise(db, input).mediaUrl).toBeNull();
  });

  test('a web link or an unsupported file is refused and nothing is written', () => {
    const db = createTestDb();
    for (const mediaUrl of ['https://x.com/a.gif', 'file:///a/b.pdf', '/a/b.gif']) {
      expect(reasonOf(() => createCustomExercise(db, { ...input, mediaUrl }))).toBe(
        'invalid_media',
      );
    }
    expect(db.select().from(exercises).all()).toEqual([]);
  });

  test('update changes, clears or keeps it, and a bad value changes nothing', () => {
    const db = createTestDb();
    const created = createCustomExercise(db, { ...input, mediaUrl: gif });

    expect(updateCustomExercise(db, created.id, { name: 'Renamed' }).mediaUrl).toBe(gif);
    expect(updateCustomExercise(db, created.id, { mediaUrl: mp4 }).mediaUrl).toBe(mp4);
    expect(
      reasonOf(() =>
        updateCustomExercise(db, created.id, { name: 'Other', mediaUrl: 'https://y.com/a.gif' }),
      ),
    ).toBe('invalid_media');
    expect(getExercise(db, created.id)).toMatchObject({ name: 'Renamed', mediaUrl: mp4 });
    expect(updateCustomExercise(db, created.id, { mediaUrl: '' }).mediaUrl).toBeNull();
  });
});

describe('countWorkoutsUsingExercise', () => {
  function setup() {
    const db = createTestDb();
    const routine = createRoutine(db, 'R');
    const custom = createCustomExercise(db, {
      name: 'Mine',
      category: 'footwork',
      trackingType: 'check',
    });
    const add = (workoutId: number) =>
      addWorkoutExercise(db, workoutId, custom.id, { targetValues: [null] });
    return { db, routine, custom, add };
  }

  test('counts active workouts, each once', () => {
    const { db, routine, custom, add } = setup();
    expect(countWorkoutsUsingExercise(db, custom.id)).toBe(0);

    const first = createWorkout(db, routine.id, 'One');
    add(first.id);
    expect(countWorkoutsUsingExercise(db, custom.id)).toBe(1);

    add(first.id); // twice in the same workout
    expect(countWorkoutsUsingExercise(db, custom.id)).toBe(1);

    add(createWorkout(db, routine.id, 'Two').id);
    expect(countWorkoutsUsingExercise(db, custom.id)).toBe(2);
    expect(countWorkoutsUsingExercise(db, 999)).toBe(0);
  });

  test('an archived workout, or one of an archived routine, does not count', () => {
    const { db, routine, custom, add } = setup();
    add(createWorkout(db, routine.id, 'Kept').id);
    const other = createRoutine(db, 'Other');
    add(createWorkout(db, other.id, 'Gone').id);
    expect(countWorkoutsUsingExercise(db, custom.id)).toBe(2);

    archiveRoutine(db, other.id);

    expect(countWorkoutsUsingExercise(db, custom.id)).toBe(1);
  });
});

describe('archivedExerciseIds', () => {
  test('returns only the archived ones among the ids', () => {
    const db = createTestDb();
    seedExercises(db);
    const [seeded] = listExercises(db);
    const custom = createCustomExercise(db, {
      name: 'Mine',
      category: 'footwork',
      trackingType: 'check',
    });
    archiveCustomExercise(db, custom.id);

    expect(archivedExerciseIds(db, [seeded.id, custom.id, 999])).toEqual(new Set([custom.id]));
    expect(archivedExerciseIds(db, [])).toEqual(new Set());
  });
});
