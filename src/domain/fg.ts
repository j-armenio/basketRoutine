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

/** FG% bands, in whole percents: above GOOD is good, below POOR is poor, both included in between. */
export const FG_GOOD_PCT = 60;
export const FG_POOR_PCT = 40;

export type FgBand = 'good' | 'poor' | 'neutral' | 'none';

/**
 * The band of an FG% ratio, `none` when there is no value. Computed on the percent rounded in
 * tenths, the number `formatFgPct` shows, so a value that reads "60%" is always neutral.
 */
export function fgBand(ratio: number | null): FgBand {
  if (ratio === null) return 'none';
  const tenths = Math.round(ratio * 1000);
  if (tenths > FG_GOOD_PCT * 10) return 'good';
  if (tenths < FG_POOR_PCT * 10) return 'poor';
  return 'neutral';
}
