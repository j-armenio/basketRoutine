import { reasonMessage } from './messages';

test('explains a rejected value', () => {
  expect(reasonMessage('makes_exceed_attempts')).toBe("Makes can't exceed attempts.");
});

test('every reason has a message', () => {
  const reasons = [
    'invalid_target_value',
    'invalid_logged_value',
    'makes_exceed_attempts',
    'target_mode_required',
    'target_mode_not_allowed',
    'value_not_allowed',
    'not_found',
    'empty_name',
    'exercise_read_only',
    'exercise_archived',
    'session_in_progress_exists',
    'session_not_in_progress',
    'invalid_exercise_order',
    'invalid_set_count',
  ] as const;
  for (const reason of reasons) expect(reasonMessage(reason)).not.toBe('');
});
