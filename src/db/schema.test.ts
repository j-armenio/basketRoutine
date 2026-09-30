/** @jest-environment node */
import { sql } from 'drizzle-orm';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { exercises, sessions } from './schema';
import { createTestDb } from './test-utils';

/** Runs a migration file's raw SQL (its statements, split the way drizzle writes them) on `db`. */
function runMigrationFile(db: Database.Database, fileName: string): void {
  const text = fs.readFileSync(path.join(__dirname, 'migrations', fileName), 'utf8');
  for (const statement of text.split('--> statement-breakpoint')) {
    // Drop full-line comments (drizzle-kit's own header on a custom migration), then run
    // whatever SQL is left.
    const sqlOnly = statement
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    if (sqlOnly !== '') db.exec(sqlOnly);
  }
}

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

  test('migration 0001 adds a nullable tactical_board to both exercise tables', () => {
    const db = createTestDb();
    for (const table of ['workout_exercises', 'session_exercises']) {
      const columns = db.all<{ name: string; type: string; notnull: number; dflt_value: unknown }>(
        sql`select * from pragma_table_info(${table})`,
      );
      expect(columns.find((c) => c.name === 'tactical_board')).toMatchObject({
        type: 'TEXT',
        notnull: 0,
        dflt_value: null,
      });
    }
  });

  test('migration 0002 clears an empty tactical board left over on either table, and leaves the rest', () => {
    const raw = new Database(':memory:');
    raw.pragma('foreign_keys = OFF'); // only this table's own column matters here
    runMigrationFile(raw, '0000_true_deadpool.sql');
    runMigrationFile(raw, '0001_neat_excalibur.sql');
    const empty = JSON.stringify({ version: 1, elements: [] });
    const withMark = JSON.stringify({ version: 1, elements: [{ type: 'x', at: [0.5, 0.5] }] });
    raw
      .prepare(
        `insert into workout_exercises (workout_id, exercise_id, position, tactical_board)
         values (1, 1, 0, ?), (1, 1, 1, ?), (1, 1, 2, null)`,
      )
      .run(empty, withMark);
    raw
      .prepare(
        `insert into session_exercises (session_id, exercise_id, position, name, category, tracking_type, tactical_board)
         values (1, 1, 0, 'X', 'shooting', 'check', ?)`,
      )
      .run(empty);

    runMigrationFile(raw, '0002_clear_empty_tactical_boards.sql');

    expect(
      raw
        .prepare('select tactical_board from workout_exercises order by position')
        .all()
        .map((r) => (r as { tactical_board: unknown }).tactical_board),
    ).toEqual([null, withMark, null]);
    expect(raw.prepare('select tactical_board from session_exercises').get()).toMatchObject({
      tactical_board: null,
    });
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
