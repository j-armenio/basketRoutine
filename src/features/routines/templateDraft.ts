import { DEFAULT_TARGET_VALUE } from '@/domain/defaults';
import { moveItem } from '@/domain/order';
import { sameStructure, structureFromTemplate } from '@/domain/template';
import type { TargetMode, TrackingType } from '@/domain/types';
import type { SaveWorkoutInput } from '@/db/repositories/workouts';

export interface DraftSet {
  /** Identifies the row while editing: a template set has no id until it is saved. */
  key: string;
  targetValue: number | null;
}

export interface DraftExercise {
  key: string;
  exerciseId: number;
  name: string;
  trackingType: TrackingType;
  targetMode: TargetMode | null;
  sets: DraftSet[];
}

/** A workout template as the editor holds it, in memory, until Save. */
export interface TemplateDraft {
  /** Absent for a workout that doesn't exist yet. */
  workoutId?: number;
  routineId: number;
  name: string;
  exercises: DraftExercise[];
}

let counter = 0;
const nextKey = () => `k${(counter += 1)}`;

export function emptyDraft(routineId: number): TemplateDraft {
  return { routineId, name: '', exercises: [] };
}

/** What `getWorkoutWithExercises` returns, as far as the draft needs it. */
interface WorkoutForDraft {
  id: number;
  routineId: number;
  name: string;
  exercises: {
    exerciseId: number;
    targetMode: TargetMode | null;
    exercise: { name: string; trackingType: TrackingType };
    sets: { targetValue: number | null }[];
  }[];
}

export function draftFromWorkout(workout: WorkoutForDraft): TemplateDraft {
  return {
    workoutId: workout.id,
    routineId: workout.routineId,
    name: workout.name,
    exercises: workout.exercises.map((item) => ({
      key: nextKey(),
      exerciseId: item.exerciseId,
      name: item.exercise.name,
      trackingType: item.exercise.trackingType,
      targetMode: item.targetMode,
      sets: item.sets.map((set) => ({ key: nextKey(), targetValue: set.targetValue })),
    })),
  };
}

export function rename(draft: TemplateDraft, name: string): TemplateDraft {
  return { ...draft, name };
}

function updateExercise(
  draft: TemplateDraft,
  key: string,
  change: (exercise: DraftExercise) => DraftExercise,
): TemplateDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) =>
      exercise.key === key ? change(exercise) : exercise,
    ),
  };
}

/** Appended at the end with one set: the mode's default target, or nothing for a `check` drill. */
export function addExercise(
  draft: TemplateDraft,
  exercise: { id: number; name: string; trackingType: TrackingType },
  targetMode: TargetMode | null,
): TemplateDraft {
  const added: DraftExercise = {
    key: nextKey(),
    exerciseId: exercise.id,
    name: exercise.name,
    trackingType: exercise.trackingType,
    targetMode,
    sets: [
      {
        key: nextKey(),
        targetValue: targetMode === null ? null : DEFAULT_TARGET_VALUE[targetMode],
      },
    ],
  };
  return { ...draft, exercises: [...draft.exercises, added] };
}

export function removeExercise(draft: TemplateDraft, key: string): TemplateDraft {
  return { ...draft, exercises: draft.exercises.filter((exercise) => exercise.key !== key) };
}

export function moveExercise(draft: TemplateDraft, key: string, delta: -1 | 1): TemplateDraft {
  const index = draft.exercises.findIndex((exercise) => exercise.key === key);
  return { ...draft, exercises: moveItem(draft.exercises, index, delta) };
}

/** Appends a set with the same target as the last one. */
export function addSet(draft: TemplateDraft, exerciseKey: string): TemplateDraft {
  return updateExercise(draft, exerciseKey, (exercise) => {
    const last = exercise.sets.at(-1);
    const targetValue =
      exercise.targetMode === null
        ? null
        : (last?.targetValue ?? DEFAULT_TARGET_VALUE[exercise.targetMode]);
    return { ...exercise, sets: [...exercise.sets, { key: nextKey(), targetValue }] };
  });
}

/** An exercise keeps at least one set: the last one is refused (remove the exercise instead). */
export function deleteSet(
  draft: TemplateDraft,
  exerciseKey: string,
  setKey: string,
): TemplateDraft {
  return updateExercise(draft, exerciseKey, (exercise) =>
    exercise.sets.length <= 1
      ? exercise
      : { ...exercise, sets: exercise.sets.filter((set) => set.key !== setKey) },
  );
}

export function setTarget(
  draft: TemplateDraft,
  exerciseKey: string,
  setKey: string,
  targetValue: number | null,
): TemplateDraft {
  return updateExercise(draft, exerciseKey, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => (set.key === setKey ? { ...set, targetValue } : set)),
  }));
}

export function toSaveInput(draft: TemplateDraft): SaveWorkoutInput {
  return {
    workoutId: draft.workoutId,
    routineId: draft.routineId,
    name: draft.name,
    exercises: draft.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      targetMode: exercise.targetMode,
      targetValues: exercise.sets.map((set) => set.targetValue),
    })),
  };
}

function structureOf(draft: TemplateDraft) {
  return structureFromTemplate({
    exercises: draft.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      targetMode: exercise.targetMode,
      sets: exercise.sets,
    })),
  });
}

/** Whether the draft differs from where it started: the trimmed name or the structure. */
export function isDirty(initial: TemplateDraft, current: TemplateDraft): boolean {
  return (
    initial.name.trim() !== current.name.trim() ||
    !sameStructure(structureOf(initial), structureOf(current))
  );
}
