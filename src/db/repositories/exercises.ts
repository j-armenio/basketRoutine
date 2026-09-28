import { DomainError } from '@/domain/errors';
import type { Category, TrackingType } from '@/domain/types';
import { validateMediaUri } from '@/domain/validation';
import { and, asc, countDistinct, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { exercises, workoutExercises, workouts } from '../schema';
import type { Db, Exercise } from '../types';
import { assertValid, requireName } from './common';

export interface ExerciseFilter {
  category?: Category;
  search?: string;
  /** Only the user's own exercises. */
  customOnly?: boolean;
}

export interface CustomExerciseInput {
  name: string;
  category: Category;
  trackingType: TrackingType;
  description?: string;
  /** A `file://` URI in the app's storage, or blank for none. */
  mediaUrl?: string;
}

/** `trackingType` is fixed at creation: changing it would break templates. */
export type CustomExerciseUpdate = Partial<
  Pick<CustomExerciseInput, 'name' | 'category' | 'description' | 'mediaUrl'>
>;

const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

/** Active exercises, ordered by name. Search is case-insensitive on the name. */
export function listExercises(db: Db, filter: ExerciseFilter = {}): Exercise[] {
  const search = filter.search?.trim();
  return db
    .select()
    .from(exercises)
    .where(
      and(
        isNull(exercises.archivedAt),
        filter.category ? eq(exercises.category, filter.category) : undefined,
        filter.customOnly ? eq(exercises.isCustom, true) : undefined,
        search
          ? sql`lower(${exercises.name}) like ${`%${escapeLike(search.toLowerCase())}%`} escape '\\'`
          : undefined,
      ),
    )
    .orderBy(asc(exercises.name), asc(exercises.id))
    .all();
}

/** Returns archived exercises too. */
export function getExercise(db: Db, id: number): Exercise | undefined {
  return db.select().from(exercises).where(eq(exercises.id, id)).get();
}

export function requireExercise(db: Db, id: number): Exercise {
  const exercise = getExercise(db, id);
  if (!exercise) throw new DomainError('not_found');
  return exercise;
}

/** An exercise that can still be added to templates and sessions. */
export function requireActiveExercise(db: Db, id: number): Exercise {
  const exercise = requireExercise(db, id);
  if (exercise.archivedAt) throw new DomainError('exercise_archived');
  return exercise;
}

function requireCustomExercise(db: Db, id: number): Exercise {
  const exercise = requireExercise(db, id);
  if (!exercise.isCustom) throw new DomainError('exercise_read_only');
  return exercise;
}

/** Trims and validates a media URI; blank means no media (`null`). */
function normalizeMediaUrl(value: string): string | null {
  const trimmed = value.trim();
  assertValid(validateMediaUri(trimmed));
  return trimmed === '' ? null : trimmed;
}

export function createCustomExercise(db: Db, input: CustomExerciseInput): Exercise {
  return db
    .insert(exercises)
    .values({
      name: requireName(input.name),
      category: input.category,
      trackingType: input.trackingType,
      description: input.description?.trim() ?? '',
      mediaUrl: normalizeMediaUrl(input.mediaUrl ?? ''),
      isCustom: true,
    })
    .returning()
    .get();
}

export function updateCustomExercise(db: Db, id: number, input: CustomExerciseUpdate): Exercise {
  requireCustomExercise(db, id);
  // Everything is checked before the write, so a failure changes nothing. A field left out stays.
  const values = {
    name: input.name === undefined ? undefined : requireName(input.name),
    category: input.category,
    description: input.description?.trim(),
    mediaUrl: input.mediaUrl === undefined ? undefined : normalizeMediaUrl(input.mediaUrl),
  };
  return db.update(exercises).set(values).where(eq(exercises.id, id)).returning().get();
}

/** How many active workouts have the exercise (each counted once, however often it appears). */
export function countWorkoutsUsingExercise(db: Db, exerciseId: number): number {
  const row = db
    .select({ n: countDistinct(workouts.id) })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(workoutExercises.exerciseId, exerciseId), isNull(workouts.archivedAt)))
    .get();
  return row?.n ?? 0;
}

/** Which of `ids` are archived exercises. */
export function archivedExerciseIds(db: Db, ids: readonly number[]): Set<number> {
  if (ids.length === 0) return new Set();
  const rows = db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(inArray(exercises.id, [...ids]), isNotNull(exercises.archivedAt)))
    .all();
  return new Set(rows.map((row) => row.id));
}

/**
 * Archives a custom exercise and removes it from every template that has it (archived workouts
 * too), in one transaction. A template holding an archived exercise could never be saved again
 * (`exercise_archived`). Sessions keep their own snapshot, so history is untouched.
 */
export function archiveCustomExercise(db: Db, id: number): void {
  db.transaction((tx) => {
    requireCustomExercise(tx, id);
    tx.delete(workoutExercises).where(eq(workoutExercises.exerciseId, id)).run(); // sets cascade
    tx.update(exercises).set({ archivedAt: new Date() }).where(eq(exercises.id, id)).run();
  });
}
