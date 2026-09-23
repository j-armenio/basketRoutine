/** @jest-environment node */
import { count, eq } from 'drizzle-orm';
import { createTestDb } from '../test-utils';
import { exercises } from '../schema';
import { SEED_EXERCISES } from './exercises';
import { seedExercises } from './seed';

const total = (db: ReturnType<typeof createTestDb>) =>
  db.select({ n: count() }).from(exercises).get()!.n;

describe('seedExercises', () => {
  test('inserts the whole catalog', () => {
    const db = createTestDb();
    seedExercises(db);
    expect(total(db)).toBe(38);
    expect(new Set(SEED_EXERCISES.map((e) => e.seedKey)).size).toBe(38);
  });

  test('is idempotent', () => {
    const db = createTestDb();
    seedExercises(db);
    seedExercises(db);
    expect(total(db)).toBe(38);
  });

  test('updates a changed description without touching custom exercises', () => {
    const db = createTestDb();
    seedExercises(db);
    db.insert(exercises)
      .values({
        name: 'My drill',
        category: 'shooting',
        trackingType: 'check',
        description: 'mine',
        isCustom: true,
      })
      .run();
    db.update(exercises)
      .set({ description: 'stale', name: 'Old name' })
      .where(eq(exercises.seedKey, 'free_throws'))
      .run();

    seedExercises(db);

    const seeded = db.select().from(exercises).where(eq(exercises.seedKey, 'free_throws')).get()!;
    const expected = SEED_EXERCISES.find((e) => e.seedKey === 'free_throws')!;
    expect(seeded.description).toBe(expected.description);
    expect(seeded.name).toBe(expected.name);

    const custom = db.select().from(exercises).where(eq(exercises.isCustom, true)).all();
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({ name: 'My drill', description: 'mine' });
    expect(total(db)).toBe(39);
  });

  test('never changes trackingType of an existing exercise', () => {
    const db = createTestDb();
    seedExercises(db);
    db.update(exercises)
      .set({ trackingType: 'check' })
      .where(eq(exercises.seedKey, 'free_throws'))
      .run();
    seedExercises(db);
    const row = db.select().from(exercises).where(eq(exercises.seedKey, 'free_throws')).get()!;
    expect(row.trackingType).toBe('check');
  });
});
