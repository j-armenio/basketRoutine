import { exerciseStats, type ExerciseSession } from './exerciseStats';
import type { SummaryExercise } from './summary';

const shooting = (...sets: [number, number | null][]): SummaryExercise => ({
  trackingType: 'makes_attempts',
  targetMode: 'attempts',
  sets: sets.map(([targetValue, loggedValue]) => ({ targetValue, loggedValue, completed: false })),
});
const checks = (...done: boolean[]): SummaryExercise => ({
  trackingType: 'check',
  targetMode: null,
  sets: done.map((completed) => ({ targetValue: null, loggedValue: null, completed })),
});
const session = (id: number, day: number, ...exercises: SummaryExercise[]): ExerciseSession => ({
  id,
  startedAt: new Date(2026, 8, day),
  exercises,
});

test('shooting: best session, the aggregate average, the count and the recent ones', () => {
  // newest first
  const stats = exerciseStats(
    [
      session(4, 28, shooting([15, 11])), // 73.3%
      session(3, 25, shooting([10, 3])), // 30%
      session(2, 22, shooting([10, null])), // nothing logged
      session(1, 20, shooting([5, 5], [5, 4])), // 90%
    ],
    3,
  );

  expect(stats.sessions).toBe(4);
  expect(stats.best).toBe(0.9);
  // Σmakes / Σattempts = 23 / 35, not the average of the percents
  expect(stats.shooting).toEqual({ makes: 23, attempts: 35, fgPct: 23 / 35 });
  expect(stats.recent.map((result) => result.sessionId)).toEqual([4, 3, 2]);
  expect(stats.recent[0].shooting).toEqual({ makes: 11, attempts: 15, fgPct: 11 / 15 });
  expect(stats.recent[2].shooting.fgPct).toBeNull();
});

test('an exercise twice in one session counts once, summed', () => {
  const stats = exerciseStats([session(1, 20, shooting([10, 2]), shooting([10, 8]))], 3);

  expect(stats.sessions).toBe(1);
  expect(stats.best).toBe(0.5);
  expect(stats.recent[0].shooting).toEqual({ makes: 10, attempts: 20, fgPct: 0.5 });
});

test('check drills: the sessions and the done sets', () => {
  const stats = exerciseStats(
    [session(2, 25, checks(true, true)), session(1, 20, checks(true, false))],
    3,
  );

  expect(stats.sessions).toBe(2);
  expect(stats.best).toBeNull();
  expect(stats.check).toEqual({ completed: 3, total: 4 });
  expect(stats.recent[1].check).toEqual({ completed: 1, total: 2 });
});

test('no session', () => {
  expect(exerciseStats([], 3)).toEqual({
    sessions: 0,
    best: null,
    shooting: { makes: 0, attempts: 0, fgPct: null },
    check: { completed: 0, total: 0 },
    recent: [],
  });
});
