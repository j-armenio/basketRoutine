import type { ValidationReason } from './validation';

/** Rule violations raised by the data layer, on top of the pure validation reasons. */
export type DataReason =
  | 'not_found'
  | 'empty_name'
  | 'exercise_read_only'
  | 'exercise_archived'
  | 'session_in_progress_exists'
  | 'session_not_in_progress'
  | 'invalid_exercise_order'
  | 'invalid_set_count';

export type DomainErrorReason = ValidationReason | DataReason;

/**
 * Thrown by the data layer when a rule is broken. Throwing inside a Drizzle
 * transaction rolls it back, and the UI can show `reason` inline.
 */
export class DomainError extends Error {
  readonly reason: DomainErrorReason;

  constructor(reason: DomainErrorReason) {
    super(reason);
    this.name = 'DomainError';
    this.reason = reason;
  }
}
