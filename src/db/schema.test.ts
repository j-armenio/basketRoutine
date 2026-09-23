/** @jest-environment node */
import { sql } from 'drizzle-orm';
import { exercises, sessions } from './schema';
import { createTestDb } from './test-utils';

describe('schema and migrations', () => {
  test('migrations apply to an empty DB', () => {
    const db = createTestDb();
    const tables = db.all<{ name: string }>(
      sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name != '__drizzle_migrations'`,
    );
    expect(tables.map((t) => t.name).sort()).toEqual([
      'exercises',
      'routines',
      'session_exercises',
      'session_sets',
      'sessions',
      'template_sets',
      'workout_exercises',
      'workouts',
    ]);
  });

  test('partial unique index rejects a second in_progress session', () => {
    const db = createTestDb();
    db.insert(sessions).values({ name: 'A', status: 'in_progress', startedAt: new Date() }).run();
    expect(() =>
      db.insert(sessions).values({ name: 'B', status: 'in_progress', startedAt: new Date() }).run(),
    ).toThrow(/UNIQUE/);
    // finished sessions are unrestricted
    db.insert(sessions).values({ name: 'C', status: 'finished', startedAt: new Date() }).run();
    db.insert(sessions).values({ name: 'D', status: 'finished', startedAt: new Date() }).run();
  });

  test('check constraints reject unknown enum values', () => {
    const db = createTestDb();
    expect(() =>
      db
        .insert(exercises)
        .values({
          name: 'X',
          category: 'nope' as 'finishing',
          trackingType: 'check',
        })
        .run(),
    ).toThrow(/CHECK/);
  });

  test('foreign keys are enforced', () => {
    const db = createTestDb();
    expect(() =>
      db
        .insert(sessions)
        .values({
          workoutId: 999,
          name: 'A',
          status: 'finished',
          startedAt: new Date(),
        })
        .run(),
    ).toThrow(/FOREIGN KEY/);
  });
});
