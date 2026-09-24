import { parseCount } from '@/domain/format';
import type { DomainErrorReason } from '@/domain/errors';
import type { TargetMode } from '@/domain/types';
import { validateSet } from '@/domain/validation';

export type SetField = 'targetValue' | 'loggedValue';

export type DraftResult =
  { kind: 'valid'; value: number | null } | { kind: 'invalid'; reason: DomainErrorReason };

interface EvaluateDraftInput {
  exercise: { targetMode: TargetMode };
  set: { targetValue: number | null; loggedValue: number | null };
  field: SetField;
  text: string;
}

/**
 * Whether what a number cell holds could be saved as it stands: `parseCount` plus `validateSet`,
 * against the other field's stored value. An empty logged cell is valid (it clears the value),
 * an empty target is not. The repository validates again before writing.
 */
export function evaluateDraft({ exercise, set, field, text }: EvaluateDraftInput): DraftResult {
  const parsed = parseCount(text);
  const fail = (reason: DomainErrorReason): DraftResult => ({ kind: 'invalid', reason });

  if (parsed.kind === 'invalid') {
    return fail(field === 'targetValue' ? 'invalid_target_value' : 'invalid_logged_value');
  }
  const value = parsed.kind === 'empty' ? null : parsed.value;

  const result = validateSet({
    trackingType: 'makes_attempts',
    targetMode: exercise.targetMode,
    targetValue: field === 'targetValue' ? value : set.targetValue,
    loggedValue: field === 'loggedValue' ? value : set.loggedValue,
  });
  return result.ok ? { kind: 'valid', value } : fail(result.reason);
}
