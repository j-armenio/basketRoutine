import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useMemo } from 'react';
import { db } from './client';
import migrations from './migrations/migrations';
import { seedExercises } from './seed/seed';

type SeedState = 'pending' | 'done' | Error;

/** Applies the migrations, then seeds the exercise catalog. */
export function useDatabaseSetup(): { ready: boolean; error: Error | null } {
  const { success, error: migrationError } = useMigrations(db, migrations);

  // The seed is synchronous and idempotent, so running it once the migrations
  // are applied is safe even if React re-runs the memo.
  const seed = useMemo<SeedState>(() => {
    if (!success) return 'pending';
    try {
      seedExercises(db);
      return 'done';
    } catch (e) {
      return e instanceof Error ? e : new Error(String(e));
    }
  }, [success]);

  return {
    ready: seed === 'done',
    error: migrationError ?? (seed instanceof Error ? seed : null),
  };
}
