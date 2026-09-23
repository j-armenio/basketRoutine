import type { TargetMode } from './types';

export interface ShootingSet {
  targetMode: TargetMode;
  targetValue: number;
  loggedValue: number | null;
}

export interface MakesAttempts {
  makes: number;
  attempts: number;
}

/**
 * Turns a set into makes/attempts. In `makes` mode the target is the makes and
 * the logged value the attempts; in `attempts` mode it is the other way round.
 * Returns null when nothing is logged.
 */
export function setMakesAttempts(set: ShootingSet): MakesAttempts | null {
  if (set.loggedValue === null) return null;
  return set.targetMode === 'makes'
    ? { makes: set.targetValue, attempts: set.loggedValue }
    : { makes: set.loggedValue, attempts: set.targetValue };
}

/** FG% as a ratio between 0 and 1, or null when there is nothing to divide. */
export function fgRatio(makes: number, attempts: number): number | null {
  return attempts > 0 ? makes / attempts : null;
}

export function setFgPct(set: ShootingSet): number | null {
  const result = setMakesAttempts(set);
  return result === null ? null : fgRatio(result.makes, result.attempts);
}
