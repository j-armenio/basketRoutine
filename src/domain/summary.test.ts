import { countEmptySets, hasLoggedData, summarizeExercise, summarizeSession } from './summary';
import type { SummaryExercise } from './summary';

const shooting = (
  targetMode: 'makes' | 'attempts',
  sets: [number, number | null][],
): SummaryExercise => ({
  trackingType: 'makes_attempts',
  targetMode,
  sets: sets.map(([targetValue, loggedValue]) => ({
    targetValue,
    loggedValue,
    completed: false,
  })),
});

const check = (completed: boolean[]): SummaryExercise => ({
  trackingType: 'check',
  targetMode: null,
  sets: completed.map((c) => ({
    targetValue: null,
    loggedValue: null,
    completed: c,
  })),
});

describe('summarizeExercise', () => {
  test('sums makes and attempts, excluding empty sets', () => {
    expect(
      summarizeExercise(
        shooting('attempts', [
          [10, 7],
          [10, null],
          [10, 5],
        ]),
      ),
    ).toEqual({
      trackingType: 'makes_attempts',
      makes: 12,
      attempts: 20,
      fgPct: 0.6,
    });
  });

  test('aggregate is Σmakes/Σattempts, not an average of percentages', () => {
    // 1/2 = 50% and 9/18 = 50% would average 50%; use uneven sets instead:
    // 1/1 = 100% and 1/9 = 11% average ~55.6%, but the aggregate is 2/10.
    const summary = summarizeExercise(
      shooting('makes', [
        [1, 1],
        [1, 9],
      ]),
    );
    expect(summary).toMatchObject({ makes: 2, attempts: 10, fgPct: 0.2 });
  });

  test('fgPct is null when nothing is logged', () => {
    expect(summarizeExercise(shooting('attempts', [[10, null]]))).toMatchObject({
      makes: 0,
      attempts: 0,
      fgPct: null,
    });
  });

  test('a logged 0 counts as an attempt-set with no makes', () => {
    expect(summarizeExercise(shooting('attempts', [[10, 0]]))).toMatchObject({
      makes: 0,
      attempts: 10,
      fgPct: 0,
    });
  });

  test('check exercises count completed and total sets', () => {
    expect(summarizeExercise(check([true, false, true]))).toEqual({
      trackingType: 'check',
      completed: 2,
      total: 3,
    });
  });
});

describe('summarizeSession', () => {
  test('combines shooting and check exercises separately', () => {
    const summary = summarizeSession([
      shooting('attempts', [
        [10, 8],
        [10, null],
      ]),
      shooting('makes', [[5, 10]]),
      check([true, false]),
      check([true]),
    ]);
    expect(summary).toEqual({
      shooting: { makes: 13, attempts: 20, fgPct: 0.65 },
      check: { completed: 2, total: 3 },
    });
  });

  test('empty session', () => {
    expect(summarizeSession([])).toEqual({
      shooting: { makes: 0, attempts: 0, fgPct: null },
      check: { completed: 0, total: 0 },
    });
  });
});

describe('hasLoggedData', () => {
  test('is false for an empty or untouched session', () => {
    expect(hasLoggedData(summarizeSession([]))).toBe(false);
    expect(
      hasLoggedData(summarizeSession([shooting('attempts', [[10, null]]), check([false])])),
    ).toBe(false);
  });

  test('is true for a shooting set with a value, even 0 makes', () => {
    expect(hasLoggedData(summarizeSession([shooting('attempts', [[10, 0]])]))).toBe(true);
    expect(hasLoggedData(summarizeSession([shooting('makes', [[5, 8]])]))).toBe(true);
  });

  test('is true for a done check set', () => {
    expect(hasLoggedData(summarizeSession([check([false, true])]))).toBe(true);
  });
});

describe('countEmptySets', () => {
  test('counts only shooting sets with no logged value', () => {
    expect(
      countEmptySets([
        shooting('attempts', [
          [10, 7],
          [10, null],
          [10, null],
        ]),
        shooting('makes', [[5, null]]),
        check([false, false]),
      ]),
    ).toBe(3);
    expect(countEmptySets([])).toBe(0);
  });
});

describe('hasLoggedData', () => {
  test('is false for an empty or untouched session', () => {
    expect(hasLoggedData(summarizeSession([]))).toBe(false);
    expect(
      hasLoggedData(summarizeSession([shooting('attempts', [[10, null]]), check([false])])),
    ).toBe(false);
  });

  test('is true for a shooting set with a value, even 0 makes', () => {
    expect(hasLoggedData(summarizeSession([shooting('attempts', [[10, 0]])]))).toBe(true);
    expect(hasLoggedData(summarizeSession([shooting('makes', [[5, 8]])]))).toBe(true);
  });

  test('is true for a done check set', () => {
    expect(hasLoggedData(summarizeSession([check([false, true])]))).toBe(true);
  });
});

describe('countEmptySets', () => {
  test('counts only shooting sets with no logged value', () => {
    expect(
      countEmptySets([
        shooting('attempts', [
          [10, 7],
          [10, null],
          [10, null],
        ]),
        shooting('makes', [[5, null]]),
        check([false, false]),
      ]),
    ).toBe(3);
    expect(countEmptySets([])).toBe(0);
  });
});
