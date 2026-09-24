import type { TargetMode } from './types';

/** The target a new shooting set starts with, per mode: 10 attempts to take, or 5 makes to hit. */
export const DEFAULT_TARGET_VALUE: Record<TargetMode, number> = {
  attempts: 10,
  makes: 5,
};

/** The name of an empty workout, after the local time of day it starts. */
export function defaultWorkoutName(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Morning Workout';
  if (hour < 18) return 'Afternoon Workout';
  return 'Evening Workout';
}
