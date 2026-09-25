import type { SessionSummary } from '@/domain/summary';
import { groupByMonth, sessionResult, toHistoryItem, type HistoryItem } from './historyList';

const summary = (
  shooting: { makes: number; attempts: number },
  check: { completed: number; total: number },
): SessionSummary => ({
  shooting: {
    ...shooting,
    fgPct: shooting.attempts > 0 ? shooting.makes / shooting.attempts : null,
  },
  check,
});

const item = (id: number, startedAt: Date): HistoryItem => ({
  id,
  name: `Workout ${id}`,
  startedAt,
  durationMs: 0,
  exerciseNames: [],
  summary: summary({ makes: 0, attempts: 0 }, { completed: 0, total: 0 }),
});

describe('toHistoryItem', () => {
  const started = new Date(2026, 8, 24, 10, 0);

  test('reads the duration, the exercise names in order and the summary', () => {
    const result = toHistoryItem({
      id: 7,
      name: 'Morning Workout',
      startedAt: started,
      finishedAt: new Date(started.getTime() + 42 * 60_000),
      exercises: [
        {
          name: 'Free Throws',
          trackingType: 'makes_attempts',
          targetMode: 'attempts',
          sets: [
            { targetValue: 10, loggedValue: 7, completed: false },
            { targetValue: 10, loggedValue: null, completed: false },
          ],
        },
        {
          name: 'Figure 8',
          trackingType: 'check',
          targetMode: null,
          sets: [{ targetValue: null, loggedValue: null, completed: true }],
        },
      ],
    });

    expect(result).toMatchObject({
      id: 7,
      name: 'Morning Workout',
      startedAt: started,
      durationMs: 42 * 60_000,
      exerciseNames: ['Free Throws', 'Figure 8'],
    });
    // the empty set is left out of the totals
    expect(result.summary.shooting).toEqual({ makes: 7, attempts: 10, fgPct: 0.7 });
    expect(result.summary.check).toEqual({ completed: 1, total: 1 });
  });

  test('a missing finish time gives a zero duration', () => {
    const result = toHistoryItem({
      id: 1,
      name: 'X',
      startedAt: started,
      finishedAt: null,
      exercises: [],
    });
    expect(result.durationMs).toBe(0);
  });
});

describe('sessionResult', () => {
  test('shooting only', () => {
    expect(sessionResult(summary({ makes: 7, attempts: 10 }, { completed: 0, total: 0 }))).toEqual({
      fgPct: '70%',
      checks: null,
    });
  });

  test('check only', () => {
    expect(sessionResult(summary({ makes: 0, attempts: 0 }, { completed: 1, total: 3 }))).toEqual({
      fgPct: null,
      checks: '1 / 3 done',
    });
  });

  test('mixed shows both', () => {
    expect(sessionResult(summary({ makes: 2, attempts: 3 }, { completed: 2, total: 2 }))).toEqual({
      fgPct: '67%',
      checks: '2 / 2 done',
    });
  });

  test('a shooting session with a logged 0 makes still shows 0%', () => {
    expect(
      sessionResult(summary({ makes: 0, attempts: 5 }, { completed: 0, total: 0 })).fgPct,
    ).toBe('0%');
  });

  test('neither: both are null', () => {
    expect(sessionResult(summary({ makes: 0, attempts: 0 }, { completed: 0, total: 0 }))).toEqual({
      fgPct: null,
      checks: null,
    });
  });
});

describe('groupByMonth', () => {
  test('groups by month in list order', () => {
    const sections = groupByMonth([
      item(1, new Date(2026, 8, 24)),
      item(2, new Date(2026, 8, 3)),
      item(3, new Date(2026, 7, 20)),
    ]);

    expect(sections.map((s) => [s.title, s.data.map((i) => i.id)])).toEqual([
      ['September 2026', [1, 2]],
      ['August 2026', [3]],
    ]);
  });

  test('the same month in two years makes two sections', () => {
    const sections = groupByMonth([item(1, new Date(2027, 8, 10)), item(2, new Date(2026, 8, 10))]);

    expect(sections.map((s) => s.title)).toEqual(['September 2027', 'September 2026']);
  });

  test('no items, no sections', () => {
    expect(groupByMonth([])).toEqual([]);
  });
});
