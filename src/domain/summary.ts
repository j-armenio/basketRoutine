import { fgRatio, setMakesAttempts } from './fg';
import type { TargetMode, TrackingType } from './types';

export interface SummarySet {
  targetValue: number | null;
  loggedValue: number | null;
  completed: boolean;
}

export interface SummaryExercise {
  trackingType: TrackingType;
  targetMode: TargetMode | null;
  sets: SummarySet[];
}

export interface ShootingTotals {
  makes: number;
  attempts: number;
  /** Σmakes / Σattempts as a ratio, or null when nothing is logged. */
  fgPct: number | null;
}

export interface CheckTotals {
  completed: number;
  total: number;
}

export type ExerciseSummary =
  ({ trackingType: 'makes_attempts' } & ShootingTotals) | ({ trackingType: 'check' } & CheckTotals);

export interface SessionSummary {
  shooting: ShootingTotals;
  check: CheckTotals;
}

function shootingTotals(exercises: SummaryExercise[]): ShootingTotals {
  let makes = 0;
  let attempts = 0;
  for (const exercise of exercises) {
    if (exercise.trackingType !== 'makes_attempts') continue;
    for (const set of exercise.sets) {
      if (exercise.targetMode === null || set.targetValue === null) continue;
      const result = setMakesAttempts({
        targetMode: exercise.targetMode,
        targetValue: set.targetValue,
        loggedValue: set.loggedValue,
      });
      if (result === null) continue;
      makes += result.makes;
      attempts += result.attempts;
    }
  }
  return { makes, attempts, fgPct: fgRatio(makes, attempts) };
}

function checkTotals(exercises: SummaryExercise[]): CheckTotals {
  let completed = 0;
  let total = 0;
  for (const exercise of exercises) {
    if (exercise.trackingType !== 'check') continue;
    for (const set of exercise.sets) {
      total += 1;
      if (set.completed) completed += 1;
    }
  }
  return { completed, total };
}

export function summarizeExercise(exercise: SummaryExercise): ExerciseSummary {
  return exercise.trackingType === 'check'
    ? { trackingType: 'check', ...checkTotals([exercise]) }
    : { trackingType: 'makes_attempts', ...shootingTotals([exercise]) };
}

export function summarizeSession(exercises: SummaryExercise[]): SessionSummary {
  return {
    shooting: shootingTotals(exercises),
    check: checkTotals(exercises),
  };
}
