import { DomainError } from '@/domain/errors';
import { and, asc, eq, isNull, max } from 'drizzle-orm';
import { routines, workoutExercises, workouts } from '../schema';
import type { Db, Routine } from '../types';
import { assertSameIds, nextPosition, requireName } from './common';

export function listRoutines(db: Db): Routine[] {
  return db
    .select()
    .from(routines)
    .where(isNull(routines.archivedAt))
    .orderBy(asc(routines.position), asc(routines.id))
    .all();
}

export function getRoutine(db: Db, id: number): Routine | undefined {
  return db.select().from(routines).where(eq(routines.id, id)).get();
}

/** An active routine, or `not_found`. */
export function requireActiveRoutine(db: Db, id: number): Routine {
  const routine = getRoutine(db, id);
  if (!routine || routine.archivedAt) throw new DomainError('not_found');
  return routine;
}

/** Appended at the end of the list. */
export function createRoutine(db: Db, name: string): Routine {
  const trimmed = requireName(name);
  return db.transaction((tx) => {
    const last = tx
      .select({ value: max(routines.position) })
      .from(routines)
      .get();
    return tx
      .insert(routines)
      .values({ name: trimmed, position: nextPosition(last?.value) })
      .returning()
      .get();
  });
}

export function renameRoutine(db: Db, id: number, name: string): Routine {
  const trimmed = requireName(name);
  requireActiveRoutine(db, id);
  return db.update(routines).set({ name: trimmed }).where(eq(routines.id, id)).returning().get();
}

/** Archives the routine and its workouts. */
export function archiveRoutine(db: Db, id: number): void {
  requireActiveRoutine(db, id);
  const now = new Date();
  db.transaction((tx) => {
    tx.update(routines).set({ archivedAt: now }).where(eq(routines.id, id)).run();
    tx.update(workouts)
      .set({ archivedAt: now })
      .where(and(eq(workouts.routineId, id), isNull(workouts.archivedAt)))
      .run();
  });
}

/** `orderedIds` must be exactly the active routines' ids, each once. Archived ones keep their position. */
export function reorderRoutines(db: Db, orderedIds: number[]): void {
  db.transaction((tx) => {
    assertSameIds(
      listRoutines(tx).map((routine) => routine.id),
      orderedIds,
    );
    orderedIds.forEach((id, position) => {
      tx.update(routines).set({ position }).where(eq(routines.id, id)).run();
    });
  });
}

/**
 * The active routines with their active workouts, each with its ordered exercises (catalog name
 * only), everything in position order: what the Workout tab lists.
 */
export function listRoutinesWithWorkouts(db: Db) {
  return db.query.routines
    .findMany({
      where: isNull(routines.archivedAt),
      orderBy: [asc(routines.position), asc(routines.id)],
      with: {
        workouts: {
          where: (workout, { isNull: isNullOp }) => isNullOp(workout.archivedAt),
          orderBy: [asc(workouts.position), asc(workouts.id)],
          with: {
            exercises: {
              orderBy: [asc(workoutExercises.position), asc(workoutExercises.id)],
              with: { exercise: { columns: { name: true } } },
            },
          },
        },
      },
    })
    .sync();
}

export type RoutineWithWorkouts = ReturnType<typeof listRoutinesWithWorkouts>[number];
export type WorkoutInRoutine = RoutineWithWorkouts['workouts'][number];
