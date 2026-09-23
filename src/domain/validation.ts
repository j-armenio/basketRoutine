import type { TargetMode, TrackingType } from './types';

export type ValidationReason =
  | 'invalid_target_value'
  | 'invalid_logged_value'
  | 'makes_exceed_attempts'
  | 'target_mode_required'
  | 'target_mode_not_allowed'
  | 'value_not_allowed';

export type ValidationResult = { ok: true } | { ok: false; reason: ValidationReason };

const OK: ValidationResult = { ok: true };
const fail = (reason: ValidationReason): ValidationResult => ({
  ok: false,
  reason,
});

/** A target is an integer >= 1. */
export function validateTargetValue(targetValue: number): ValidationResult {
  return Number.isInteger(targetValue) && targetValue >= 1 ? OK : fail('invalid_target_value');
}

/** A logged value is an integer >= 0, or empty (null). */
export function validateLoggedValue(loggedValue: number | null): ValidationResult {
  if (loggedValue === null) return OK;
  return Number.isInteger(loggedValue) && loggedValue >= 0 ? OK : fail('invalid_logged_value');
}

/** `check` exercises have no target mode; `makes_attempts` ones require one. */
export function validateExerciseConfig(
  trackingType: TrackingType,
  targetMode: TargetMode | null,
): ValidationResult {
  if (trackingType === 'check') {
    return targetMode === null ? OK : fail('target_mode_not_allowed');
  }
  return targetMode === null ? fail('target_mode_required') : OK;
}

export interface SetToValidate {
  trackingType: TrackingType;
  targetMode: TargetMode | null;
  targetValue: number | null;
  loggedValue: number | null;
}

/**
 * Validates a set as it would be stored. Makes can never exceed attempts:
 * in `attempts` mode the logged makes are <= target, in `makes` mode the
 * logged attempts are >= target.
 */
export function validateSet(set: SetToValidate): ValidationResult {
  const config = validateExerciseConfig(set.trackingType, set.targetMode);
  if (!config.ok) return config;

  if (set.trackingType === 'check') {
    return set.targetValue === null && set.loggedValue === null ? OK : fail('value_not_allowed');
  }

  if (set.targetValue === null) return fail('invalid_target_value');
  const target = validateTargetValue(set.targetValue);
  if (!target.ok) return target;
  const logged = validateLoggedValue(set.loggedValue);
  if (!logged.ok) return logged;
  if (set.loggedValue === null) return OK;

  if (set.targetMode === 'attempts' && set.loggedValue > set.targetValue) {
    return fail('makes_exceed_attempts');
  }
  if (set.targetMode === 'makes' && set.loggedValue < set.targetValue) {
    return fail('makes_exceed_attempts');
  }
  return OK;
}
