import {
  validateExerciseConfig,
  validateLoggedValue,
  validateSet,
  validateTargetValue,
} from './validation';

describe('validateTargetValue', () => {
  test.each([1, 5, 100])('accepts %d', (v) => {
    expect(validateTargetValue(v)).toEqual({ ok: true });
  });
  test.each([0, -1, 1.5, NaN])('rejects %d', (v) => {
    expect(validateTargetValue(v)).toEqual({
      ok: false,
      reason: 'invalid_target_value',
    });
  });
});

describe('validateLoggedValue', () => {
  test.each([null, 0, 3])('accepts %s', (v) => {
    expect(validateLoggedValue(v)).toEqual({ ok: true });
  });
  test.each([-1, 2.5])('rejects %d', (v) => {
    expect(validateLoggedValue(v)).toEqual({
      ok: false,
      reason: 'invalid_logged_value',
    });
  });
});

describe('validateExerciseConfig', () => {
  test('check has no target mode', () => {
    expect(validateExerciseConfig('check', null)).toEqual({ ok: true });
    expect(validateExerciseConfig('check', 'makes')).toEqual({
      ok: false,
      reason: 'target_mode_not_allowed',
    });
  });
  test('makes_attempts requires a target mode', () => {
    expect(validateExerciseConfig('makes_attempts', 'attempts')).toEqual({
      ok: true,
    });
    expect(validateExerciseConfig('makes_attempts', null)).toEqual({
      ok: false,
      reason: 'target_mode_required',
    });
  });
});

describe('validateSet', () => {
  const set = (
    targetMode: 'makes' | 'attempts',
    targetValue: number | null,
    loggedValue: number | null,
  ) =>
    validateSet({
      trackingType: 'makes_attempts',
      targetMode,
      targetValue,
      loggedValue,
    });

  test('attempts mode: logged makes <= target', () => {
    expect(set('attempts', 10, 10)).toEqual({ ok: true });
    expect(set('attempts', 10, 0)).toEqual({ ok: true });
    expect(set('attempts', 10, 11)).toEqual({
      ok: false,
      reason: 'makes_exceed_attempts',
    });
  });
  test('makes mode: logged attempts >= target', () => {
    expect(set('makes', 5, 5)).toEqual({ ok: true });
    expect(set('makes', 5, 12)).toEqual({ ok: true });
    expect(set('makes', 5, 4)).toEqual({
      ok: false,
      reason: 'makes_exceed_attempts',
    });
  });
  test('empty logged value is always fine', () => {
    expect(set('makes', 5, null)).toEqual({ ok: true });
    expect(set('attempts', 5, null)).toEqual({ ok: true });
  });
  test('rejects a bad or missing target', () => {
    expect(set('makes', 0, null)).toEqual({
      ok: false,
      reason: 'invalid_target_value',
    });
    expect(set('makes', null, null)).toEqual({
      ok: false,
      reason: 'invalid_target_value',
    });
  });
  test('check sets carry no values', () => {
    const check = (targetValue: number | null, loggedValue: number | null) =>
      validateSet({
        trackingType: 'check',
        targetMode: null,
        targetValue,
        loggedValue,
      });
    expect(check(null, null)).toEqual({ ok: true });
    expect(check(3, null)).toEqual({ ok: false, reason: 'value_not_allowed' });
    expect(check(null, 1)).toEqual({ ok: false, reason: 'value_not_allowed' });
  });
});
