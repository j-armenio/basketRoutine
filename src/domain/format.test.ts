import {
  formatDayDate,
  formatElapsed,
  formatDuration,
  formatExerciseList,
  formatFgPct,
  formatMonth,
  formatShortDate,
  formatWorkoutDate,
  parseCount,
} from './format';

describe('formatFgPct', () => {
  test.each([
    [null, '—'],
    [0, '0%'],
    [1, '100%'],
    [0.5, '50%'],
    [0.7, '70%'],
    [2 / 3, '66.7%'],
    [5 / 11, '45.5%'],
    [0.9994, '99.9%'],
    // rounds to a whole percent: no `.0`
    [0.4996, '50%'],
  ])('%s -> %s', (ratio, expected) => {
    expect(formatFgPct(ratio)).toBe(expected);
  });
});

describe('parseCount', () => {
  test('empty text is empty', () => {
    expect(parseCount('')).toEqual({ kind: 'empty' });
    expect(parseCount('  ')).toEqual({ kind: 'empty' });
  });

  test('digits are an integer', () => {
    expect(parseCount('0')).toEqual({ kind: 'value', value: 0 });
    expect(parseCount('12')).toEqual({ kind: 'value', value: 12 });
    expect(parseCount('007')).toEqual({ kind: 'value', value: 7 });
  });

  test.each(['1.5', '-1', ',', '1,5', 'a', '1 2', '99999999999999999999'])(
    '%j is invalid',
    (text) => {
      expect(parseCount(text)).toEqual({ kind: 'invalid' });
    },
  );
});

describe('formatDuration', () => {
  const min = 60_000;

  test.each([
    [0, '< 1 min'],
    [29_000, '< 1 min'],
    [59_999, '< 1 min'],
    [min, '1 min'],
    [min + 29_000, '1 min'],
    [42 * min, '42 min'],
    [59 * min + 40_000, '1 h 00 min'],
    [60 * min, '1 h 00 min'],
    [65 * min, '1 h 05 min'],
    [135 * min, '2 h 15 min'],
    [-5 * min, '< 1 min'],
  ])('%s ms -> %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

test('formatWorkoutDate uses the local date, in English', () => {
  expect(formatWorkoutDate(new Date(2026, 8, 24, 23, 30))).toBe('Thu, Sep 24, 2026');
});

test('formatMonth uses the local month and year, in English', () => {
  expect(formatMonth(new Date(2026, 8, 24, 23, 30))).toBe('September 2026');
  expect(formatMonth(new Date(2027, 0, 1, 0, 5))).toBe('January 2027');
});

describe('formatExerciseList', () => {
  test('lists every name up to the limit', () => {
    expect(formatExerciseList(['Free Throws'])).toBe('Free Throws');
    expect(formatExerciseList(['Free Throws', 'Mikan Drill', 'Layups'])).toBe(
      'Free Throws, Mikan Drill, Layups',
    );
  });

  test('counts the ones left out', () => {
    expect(formatExerciseList(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C +2 more');
    expect(formatExerciseList(['A', 'B', 'C'], 2)).toBe('A, B +1 more');
  });

  test('says so when there is nothing', () => {
    expect(formatExerciseList([])).toBe('No exercises');
  });
});

describe('formatElapsed', () => {
  test.each([
    [0, '00:00'],
    [999, '00:00'],
    [1000, '00:01'],
    [65_000, '01:05'],
    [754_000, '12:34'],
    [3_599_999, '59:59'],
    [3_600_000, '1:00:00'],
    [3_723_000, '1:02:03'],
    [-5000, '00:00'],
  ])('%d ms -> %s', (ms, text) => {
    expect(formatElapsed(ms)).toBe(text);
  });
});

test('formatShortDate and formatDayDate use the local date, in English', () => {
  const date = new Date(2026, 8, 28, 23, 30);
  expect(formatShortDate(date)).toBe('Sep 28');
  expect(formatDayDate(date)).toBe('Mon, Sep 28');
});
