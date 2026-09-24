import type { DomainErrorReason } from './errors';

const MESSAGES: Record<DomainErrorReason, string> = {
  invalid_target_value: 'The target must be a whole number of at least 1.',
  invalid_logged_value: 'Enter a whole number, 0 or more.',
  makes_exceed_attempts: "Makes can't exceed attempts.",
  target_mode_required: 'Choose what this exercise fixes: makes or attempts.',
  target_mode_not_allowed: "This exercise doesn't have a target mode.",
  value_not_allowed: "This exercise doesn't take values.",
  not_found: 'That item no longer exists.',
  empty_name: "The name can't be empty.",
  exercise_read_only: "Predefined exercises can't be edited.",
  exercise_archived: 'That exercise is no longer available.',
  session_in_progress_exists: 'A workout is already in progress.',
  session_not_in_progress: 'This workout is already finished.',
  invalid_exercise_order: 'The exercise order is out of date.',
  invalid_set_count: 'An exercise needs at least one set.',
};

/** A message for the user; a `Record` over every reason, so a new reason fails `typecheck`. */
export function reasonMessage(reason: DomainErrorReason): string {
  return MESSAGES[reason];
}
