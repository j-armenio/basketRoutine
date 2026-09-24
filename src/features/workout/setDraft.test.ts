import { evaluateDraft } from './setDraft';

const attempts = { targetMode: 'attempts' as const };
const makes = { targetMode: 'makes' as const };

describe('attempts mode (target = attempts, logged = makes)', () => {
  const set = { targetValue: 10, loggedValue: 7 };

  test('a logged value up to the target is valid', () => {
    expect(evaluateDraft({ exercise: attempts, set, field: 'loggedValue', text: '10' })).toEqual({
      kind: 'valid',
      value: 10,
    });
    expect(evaluateDraft({ exercise: attempts, set, field: 'loggedValue', text: '0' })).toEqual({
      kind: 'valid',
      value: 0,
    });
  });

  test('a logged value over the target is invalid', () => {
    expect(evaluateDraft({ exercise: attempts, set, field: 'loggedValue', text: '11' })).toEqual({
      kind: 'invalid',
      reason: 'makes_exceed_attempts',
    });
  });

  test('an empty logged value is valid and clears', () => {
    expect(evaluateDraft({ exercise: attempts, set, field: 'loggedValue', text: '' })).toEqual({
      kind: 'valid',
      value: null,
    });
  });

  test('a target at or above the logged value is valid', () => {
    expect(evaluateDraft({ exercise: attempts, set, field: 'targetValue', text: '12' })).toEqual({
      kind: 'valid',
      value: 12,
    });
  });

  test('a target that makes the stored logged value invalid is invalid', () => {
    expect(evaluateDraft({ exercise: attempts, set, field: 'targetValue', text: '5' })).toEqual({
      kind: 'invalid',
      reason: 'makes_exceed_attempts',
    });
  });
});

describe('makes mode (target = makes, logged = attempts)', () => {
  const set = { targetValue: 5, loggedValue: 8 };

  test('logged attempts at or above the target are valid', () => {
    expect(evaluateDraft({ exercise: makes, set, field: 'loggedValue', text: '12' })).toEqual({
      kind: 'valid',
      value: 12,
    });
    expect(evaluateDraft({ exercise: makes, set, field: 'loggedValue', text: '5' })).toEqual({
      kind: 'valid',
      value: 5,
    });
  });

  test('logged attempts under the target are invalid (a prefix of a valid value)', () => {
    expect(evaluateDraft({ exercise: makes, set, field: 'loggedValue', text: '1' })).toEqual({
      kind: 'invalid',
      reason: 'makes_exceed_attempts',
    });
  });

  test('a target above the stored logged attempts is invalid', () => {
    expect(evaluateDraft({ exercise: makes, set, field: 'targetValue', text: '9' })).toEqual({
      kind: 'invalid',
      reason: 'makes_exceed_attempts',
    });
    expect(evaluateDraft({ exercise: makes, set, field: 'targetValue', text: '8' })).toEqual({
      kind: 'valid',
      value: 8,
    });
  });
});

describe('both modes', () => {
  const set = { targetValue: 10, loggedValue: null };

  test('an empty target is invalid', () => {
    expect(evaluateDraft({ exercise: attempts, set, field: 'targetValue', text: '' })).toEqual({
      kind: 'invalid',
      reason: 'invalid_target_value',
    });
  });

  test('a zero target is invalid', () => {
    expect(evaluateDraft({ exercise: attempts, set, field: 'targetValue', text: '0' })).toEqual({
      kind: 'invalid',
      reason: 'invalid_target_value',
    });
  });

  test.each(['1.5', '-1', ',', 'x'])('non-digits %j are invalid', (text) => {
    expect(evaluateDraft({ exercise: attempts, set, field: 'loggedValue', text })).toEqual({
      kind: 'invalid',
      reason: 'invalid_logged_value',
    });
    expect(evaluateDraft({ exercise: attempts, set, field: 'targetValue', text })).toEqual({
      kind: 'invalid',
      reason: 'invalid_target_value',
    });
  });
});
