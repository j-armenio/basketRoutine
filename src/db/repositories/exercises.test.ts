/** @jest-environment node */
import { DomainError } from '@/domain/errors';
import { seedExercises } from '../seed/seed';
import { createTestDb } from '../test-utils';
import {
  archiveCustomExercise,
  createCustomExercise,
  getExercise,
  listExercises,
  updateCustomExercise,
} from './exercises';

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
