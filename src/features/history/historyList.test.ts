import type { SessionSummary } from '@/domain/summary';
import {
  chartDateLabels,
  chartRangeCount,
  chartRangeLabel,
  chartRangeShortLabel,
  fgEvolution,
  fgEvolutionLabel,
  groupByMonth,
  profileStats,
  sessionResult,
  spreadLabels,
  toHistoryItem,
  type HistoryItem,
} from './historyList';

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
      fgBand: 'good',
      checks: null,
    });
  });

  test('check only', () => {
    expect(sessionResult(summary({ makes: 0, attempts: 0 }, { completed: 1, total: 3 }))).toEqual({
      fgPct: null,
      fgBand: 'none',
      checks: '1 / 3 done',
    });
  });

  test('mixed shows both', () => {
    expect(sessionResult(summary({ makes: 2, attempts: 3 }, { completed: 2, total: 2 }))).toEqual({
      fgPct: '66.7%',
      fgBand: 'good',
      checks: '2 / 2 done',
    });
  });

  test('a shooting session with a logged 0 makes still shows 0%, as poor', () => {
    expect(
      sessionResult(summary({ makes: 0, attempts: 5 }, { completed: 0, total: 0 })),
    ).toMatchObject({ fgPct: '0%', fgBand: 'poor' });
  });

  test('the band of a middle value is neutral', () => {
    expect(
      sessionResult(summary({ makes: 1, attempts: 2 }, { completed: 0, total: 0 })),
    ).toMatchObject({ fgPct: '50%', fgBand: 'neutral' });
  });

  test('neither: both are null', () => {
    expect(sessionResult(summary({ makes: 0, attempts: 0 }, { completed: 0, total: 0 }))).toEqual({
      fgPct: null,
      fgBand: 'none',
      checks: null,
    });
  });
});

describe('profileStats', () => {
  // newest first, like the History: session `id` started on Sep `id`
  const session = (id: number, makes: number, attempts: number, minutes = 0): HistoryItem => ({
    ...item(id, new Date(2026, 8, id)),
    durationMs: minutes * 60_000,
    summary: summary({ makes, attempts }, { completed: 1, total: 1 }),
  });

  test('counts the sessions and adds up the shots and the time', () => {
    const stats = profileStats([session(2, 5, 14, 65), session(1, 7, 10, 42)]);
    expect(stats.sessions).toBe(2);
    expect(stats.shooting.makes).toBe(12);
    expect(stats.shooting.attempts).toBe(24);
    expect(stats.durationMs).toBe(107 * 60_000);
  });

  test('the FG% is Σmakes / Σattempts, not the average of the sessions', () => {
    // 70% and 35.7%: their average would be 52.9%
    expect(profileStats([session(2, 5, 14), session(1, 7, 10)]).shooting.fgPct).toBe(0.5);
  });

  test('sessions with no shot count as sessions only; with none, no FG%', () => {
    const stats = profileStats([session(2, 3, 4), session(1, 0, 0)]);
    expect(stats.sessions).toBe(2);
    expect(stats.shooting.fgPct).toBe(0.75);
    expect(profileStats([session(1, 0, 0)]).shooting.fgPct).toBeNull();
    expect(profileStats([])).toEqual({
      sessions: 0,
      shooting: { makes: 0, attempts: 0, fgPct: null },
      durationMs: 0,
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

describe('fgEvolution', () => {
  const shot = (id: number, day: number, makes: number, attempts: number): HistoryItem => ({
    ...item(id, new Date(2026, 8, day, 10, id)),
    summary: summary({ makes, attempts }, { completed: 0, total: 0 }),
  });
  const checksOnly = (id: number, day: number): HistoryItem => ({
    ...item(id, new Date(2026, 8, day, 10, id)),
    summary: summary({ makes: 0, attempts: 0 }, { completed: 1, total: 1 }),
  });

  test('keeps the last sessions with a shooting set, oldest first, skipping check-only ones', () => {
    // newest first, as History reads them
    const items = [
      shot(7, 28, 5, 10),
      checksOnly(6, 27),
      shot(5, 26, 1, 4),
      shot(4, 25, 3, 4),
      shot(3, 24, 0, 5),
      shot(2, 23, 2, 2),
      shot(1, 22, 1, 1),
    ];

    const points = fgEvolution(items, 5);

    expect(points.map((point) => point.id)).toEqual([2, 3, 4, 5, 7]);
    expect(points.map((point) => point.fgPct)).toEqual([1, 0, 0.75, 0.25, 0.5]);
  });

  test('is empty when no session has a shooting set', () => {
    expect(fgEvolution([checksOnly(1, 22)], 5)).toEqual([]);
  });

  test('one date label per run of points on the same day', () => {
    const points = fgEvolution(
      [shot(4, 28, 1, 2), shot(3, 25, 1, 2), shot(2, 25, 1, 2), shot(1, 25, 1, 2)],
      5,
    );

    expect(chartDateLabels(points)).toEqual([
      { label: 'Sep 25', first: 0, last: 2 },
      { label: 'Sep 28', first: 3, last: 3 },
    ]);
  });

  test('the screen reader label lists every point', () => {
    const points = fgEvolution([shot(2, 28, 1, 3), shot(1, 25, 7, 10)], 5);

    expect(fgEvolutionLabel(points)).toBe(
      'FG% over the last 2 workouts: Sep 25 Workout 1 70%, Sep 28 Workout 2 33.3%',
    );
    expect(fgEvolutionLabel(points.slice(1))).toBe(
      'FG% over the last workout: Sep 28 Workout 2 33.3%',
    );
    expect(fgEvolutionLabel(points, true)).toBe(
      'FG% over all 2 workouts: Sep 25 Workout 1 70%, Sep 28 Workout 2 33.3%',
    );
  });

  test('all of them: every session with a shooting set', () => {
    const items = Array.from({ length: 30 }, (_, i) => shot(30 - i, 1 + (i % 28), 1, 2));

    expect(fgEvolution(items, chartRangeCount('all'))).toHaveLength(30);
    expect(fgEvolution(items, chartRangeCount(20))).toHaveLength(20);
  });

  test('beyond 10 points, the screen reader label sums up the range', () => {
    // 12 sessions, Sep 1 to Sep 12, newest first: 1/4 each, the best 9/10 on Sep 6, 1/2 latest
    const items = Array.from({ length: 12 }, (_, i) => {
      const day = 12 - i;
      if (day === 12) return shot(day, day, 1, 2);
      if (day === 6) return shot(day, day, 9, 10);
      return shot(day, day, 1, 4);
    });
    const points = fgEvolution(items, chartRangeCount('all'));

    expect(fgEvolutionLabel(points, true)).toBe(
      'FG% over all 12 workouts, from Sep 1 to Sep 12: first 25%, best 90%, latest 50%',
    );
    expect(fgEvolutionLabel(points.slice(1))).toBe(
      'FG% over the last 11 workouts, from Sep 2 to Sep 12: first 25%, best 90%, latest 50%',
    );
  });
});

describe('the chart range', () => {
  test('5, 10, 20 or all, with the menu and button texts', () => {
    expect(chartRangeLabel(5)).toBe('Last 5 workouts');
    expect(chartRangeLabel('all')).toBe('All workouts');
    expect(chartRangeShortLabel(20)).toBe('Last 20');
    expect(chartRangeShortLabel('all')).toBe('All');
    expect(chartRangeCount(10)).toBe(10);
    expect(chartRangeCount('all')).toBe(Infinity);
  });
});

describe('spreadLabels', () => {
  const at = (...centers: number[]) => spreadLabels(centers, (center) => center, 64);

  test('keeps every label that fits', () => {
    expect(at(50, 120, 190, 260)).toEqual([50, 120, 190, 260]);
  });

  test('skips the ones too close to the previous kept one or to the last', () => {
    expect(at(50, 80, 110, 140, 170, 200, 230, 260)).toEqual([50, 140, 260]);
    expect(at(50, 150, 220, 250)).toEqual([50, 150, 250]);
  });

  test('keeps the last alone when even the first is too close to it', () => {
    expect(at(200, 240)).toEqual([240]);
  });

  test('one label or none', () => {
    expect(at(120)).toEqual([120]);
    expect(at()).toEqual([]);
  });
});
