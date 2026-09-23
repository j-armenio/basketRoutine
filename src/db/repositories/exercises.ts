import { DomainError } from '@/domain/errors';
import type { Category, TrackingType } from '@/domain/types';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { exercises } from '../schema';
import type { Db, Exercise } from '../types';
import { requireName } from './common';

export interface ExerciseFilter {
  category?: Category;
  search?: string;
}

export interface CustomExerciseInput {
  name: string;
  category: Category;
  trackingType: TrackingType;
  description?: string;
}

/** `trackingType` is fixed at creation: changing it would break templates. */
export type CustomExerciseUpdate = Partial<
  Pick<CustomExerciseInput, 'name' | 'category' | 'description'>
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

export function createCustomExercise(db: Db, input: CustomExerciseInput): Exercise {
  return db
    .insert(exercises)
    .values({
      name: requireName(input.name),
      category: input.category,
      trackingType: input.trackingType,
      description: input.description?.trim() ?? '',
      isCustom: true,
    })
    .returning()
    .get();
}

export function updateCustomExercise(db: Db, id: number, input: CustomExerciseUpdate): Exercise {
  requireCustomExercise(db, id);
  return db
    .update(exercises)
    .set({
      name: input.name === undefined ? undefined : requireName(input.name),
      category: input.category,
      description: input.description?.trim(),
    })
    .where(eq(exercises.id, id))
    .returning()
    .get();
}

export function archiveCustomExercise(db: Db, id: number): void {
  requireCustomExercise(db, id);
  db.update(exercises).set({ archivedAt: new Date() }).where(eq(exercises.id, id)).run();
}
