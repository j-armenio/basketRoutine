import type { TargetMode } from './types';

/** What a template and a session have in common: which exercises, in which order, and their targets. */
export interface StructureExercise {
  exerciseId: number;
  targetMode: TargetMode | null;
  sets: { targetValue: number | null }[];
}

export type TemplateStructure = {
  exerciseId: number;
  targetMode: TargetMode | null;
  targetValues: (number | null)[];
}[];

function structureOf(exercises: readonly StructureExercise[]): TemplateStructure {
  return exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    targetMode: exercise.targetMode,
    targetValues: exercise.sets.map((set) => set.targetValue),
  }));
}

/** The workout's ordered exercises with their target values. */
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
        exercise.targetValues.every((value, j) => value === other.targetValues[j])
      );
    })
  );
}
