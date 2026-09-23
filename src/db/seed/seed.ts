import { sql } from 'drizzle-orm';
import { exercises } from '../schema';
import type { Db } from '../types';
import { SEED_EXERCISES } from './exercises';

/**
 * Upserts the predefined exercises by `seedKey`, in one transaction. Only
 * name, category and description are overwritten: `trackingType` is set on
 * insert and never changed (it would leave existing templates with an invalid
 * `targetMode`). Entries removed from the list and custom exercises are left
 * untouched.
 */
export function seedExercises(db: Db): void {
  db.transaction((tx) => {
    for (const exercise of SEED_EXERCISES) {
      tx.insert(exercises)
        .values({ ...exercise, isCustom: false })
        .onConflictDoUpdate({
          target: exercises.seedKey,
          set: {
            name: exercise.name,
            category: exercise.category,
            description: exercise.description,
            updatedAt: sql`(unixepoch() * 1000)`,
          },
        })
        .run();
    }
  });
}
