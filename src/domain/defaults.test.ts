import { DEFAULT_TARGET_VALUE, defaultWorkoutName } from './defaults';

test('default targets', () => {
  expect(DEFAULT_TARGET_VALUE).toEqual({ attempts: 10, makes: 5 });
});

describe('defaultWorkoutName', () => {
  test.each([
    [new Date(2026, 8, 24, 0, 0), 'Morning Workout'],
    [new Date(2026, 8, 24, 11, 59), 'Morning Workout'],
    [new Date(2026, 8, 24, 12, 0), 'Afternoon Workout'],
    [new Date(2026, 8, 24, 17, 59), 'Afternoon Workout'],
    [new Date(2026, 8, 24, 18, 0), 'Evening Workout'],
    [new Date(2026, 8, 24, 23, 59), 'Evening Workout'],
  ])('%s -> %s', (date, expected) => {
    expect(defaultWorkoutName(date)).toBe(expected);
  });
});
