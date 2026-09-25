import { db } from '@/db/client';
import * as routineRepo from '@/db/repositories/routines';
import * as workoutRepo from '@/db/repositories/workouts';
import { run } from '../dataStore';

// Every routine and template write goes through here, like the session writes in
// `workout/actions.ts`.

export function createRoutine(name: string) {
  return run(() => routineRepo.createRoutine(db, name));
}

export function renameRoutine(id: number, name: string) {
  return run(() => routineRepo.renameRoutine(db, id, name));
}

/** Archives the routine and its workouts. */
export function deleteRoutine(id: number) {
  return run(() => routineRepo.archiveRoutine(db, id));
}

export function moveRoutine(orderedIds: number[]) {
  return run(() => routineRepo.reorderRoutines(db, orderedIds));
}

export function moveWorkout(routineId: number, orderedIds: number[]) {
  return run(() => workoutRepo.reorderWorkouts(db, routineId, orderedIds));
}

export function deleteWorkout(id: number) {
  return run(() => workoutRepo.archiveWorkout(db, id));
}

/** Creates or edits a whole template in one transaction. */
export function saveWorkout(input: workoutRepo.SaveWorkoutInput) {
  return run(() => workoutRepo.saveWorkout(db, input));
}
