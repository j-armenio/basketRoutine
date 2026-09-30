import { sameBoard, type TacticalBoard } from './tacticalBoard';
import type { TargetMode } from './types';

/**
 * What a template and a session have in common: which exercises, in which order, their targets
 * and their tactical boards.
 */
export interface StructureExercise {
  exerciseId: number;
  targetMode: TargetMode | null;
  sets: { targetValue: number | null }[];
  tacticalBoard: TacticalBoard | null;
}

export type TemplateStructure = {
  exerciseId: number;
  targetMode: TargetMode | null;
  targetValues: (number | null)[];
  tacticalBoard: TacticalBoard | null;
}[];

function structureOf(exercises: readonly StructureExercise[]): TemplateStructure {
  return exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    targetMode: exercise.targetMode,
    targetValues: exercise.sets.map((set) => set.targetValue),
    tacticalBoard: exercise.tacticalBoard,
  }));
}

/** The workout's ordered exercises with their target values and boards. */
export function structureFromTemplate(workout: {
  exercises: readonly StructureExercise[];
}): TemplateStructure {
  return structureOf(workout.exercises);
}

/** The session's ordered exercises with their target values. Logged values, ✓ and notes are left out. */
export function structureFromSession(session: {
  exercises: readonly StructureExercise[];
}): TemplateStructure {
  return structureOf(session.exercises);
}

export function sameStructure(a: TemplateStructure, b: TemplateStructure): boolean {
  return (
    a.length === b.length &&
    a.every((exercise, i) => {
      const other = b[i];
      return (
        exercise.exerciseId === other.exerciseId &&
        exercise.targetMode === other.targetMode &&
        exercise.targetValues.length === other.targetValues.length &&
        exercise.targetValues.every((value, j) => value === other.targetValues[j]) &&
        sameBoard(exercise.tacticalBoard, other.tacticalBoard)
      );
    })
  );
}
