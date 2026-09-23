import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * Drizzle's generic sync SQLite database with our schema. It is satisfied by
 * both the `expo-sqlite` driver (app) and `better-sqlite3` (tests), and by the
 * `tx` handed to `db.transaction`.
 */
export type Db = BaseSQLiteDatabase<'sync', any, typeof schema>;

export type Exercise = typeof schema.exercises.$inferSelect;
export type Routine = typeof schema.routines.$inferSelect;
export type Workout = typeof schema.workouts.$inferSelect;
export type WorkoutExercise = typeof schema.workoutExercises.$inferSelect;
export type Session = typeof schema.sessions.$inferSelect;
export type SessionExercise = typeof schema.sessionExercises.$inferSelect;
export type SessionSet = typeof schema.sessionSets.$inferSelect;
