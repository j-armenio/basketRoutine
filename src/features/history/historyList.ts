import { fgBand, fgRatio, type FgBand } from '@/domain/fg';
import { formatFgPct, formatMonth, formatShortDate } from '@/domain/format';
import { summarizeSession } from '@/domain/summary';
import type { SessionSummary, ShootingTotals, SummaryExercise } from '@/domain/summary';

/** What a finished session needs to become a History row (`listFinishedSessionsWithExercises`). */
interface FinishedSession {
  id: number;
  name: string;
  startedAt: Date;
  finishedAt: Date | null;
  exercises: (SummaryExercise & { name: string })[];
}

export interface HistoryItem {
  id: number;
  name: string;
  startedAt: Date;
  durationMs: number;
  exerciseNames: string[];
  summary: SessionSummary;
}

export interface HistorySection {
  title: string;
  data: HistoryItem[];
}

export function toHistoryItem(session: FinishedSession): HistoryItem {
  return {
    id: session.id,
    name: session.name,
    startedAt: session.startedAt,
    durationMs: session.finishedAt ? session.finishedAt.getTime() - session.startedAt.getTime() : 0,
    exerciseNames: session.exercises.map((exercise) => exercise.name),
    summary: summarizeSession(session.exercises),
  };
}

/**
 * The right side of a History row: the overall FG% (and its band, for the color) when a shooting
 * set was logged, and `x / y done` when the session has check drills. Either can be missing, or
 * both.
 */
export function sessionResult(summary: SessionSummary): {
  fgPct: string | null;
  fgBand: FgBand;
  checks: string | null;
} {
  const shot = summary.shooting.attempts > 0;
  return {
    fgPct: shot ? formatFgPct(summary.shooting.fgPct) : null,
    fgBand: shot ? fgBand(summary.shooting.fgPct) : 'none',
    checks:
      summary.check.total > 0 ? `${summary.check.completed} / ${summary.check.total} done` : null,
  };
}

/** How many sessions with a shot each side of the Profile's trend compares. */
export const TREND_WINDOW = 5;

export interface ProfileStats {
  sessions: number;
  /**
   * Σmakes and Σattempts over every session, and their FG% (not an average of the sessions'
   * percentages), `null` when no shooting set was logged.
   */
  shooting: ShootingTotals;
  /** Every session's duration, added up. */
  durationMs: number;
  /**
   * The FG% of the last `TREND_WINDOW` sessions with a shot minus the one of the `TREND_WINDOW`
   * before them, in percentage points, as the two percents shown (rounded in tenths) differ.
   * `null` until there are twice `TREND_WINDOW` such sessions.
   */
  trend: number | null;
}

const shootingOf = (items: HistoryItem[]): ShootingTotals => {
  let makes = 0;
  let attempts = 0;
  for (const item of items) {
    makes += item.summary.shooting.makes;
    attempts += item.summary.shooting.attempts;
  }
  return { makes, attempts, fgPct: fgRatio(makes, attempts) };
};

/** Percent rounded in tenths, the number `formatFgPct` shows. */
const shownPercent = (ratio: number) => Math.round(ratio * 1000) / 10;

/** "Your stats" on the Profile, over every finished session (`items`, newest first). */
export function profileStats(items: HistoryItem[]): ProfileStats {
  const shot = items.filter((item) => item.summary.shooting.attempts > 0);
  const recent = shootingOf(shot.slice(0, TREND_WINDOW)).fgPct;
  const previous = shootingOf(shot.slice(TREND_WINDOW, 2 * TREND_WINDOW)).fgPct;
  const trend =
    shot.length < 2 * TREND_WINDOW || recent === null || previous === null
      ? null
      : Math.round((shownPercent(recent) - shownPercent(previous)) * 10) / 10;
  return {
    sessions: items.length,
    shooting: shootingOf(items),
    durationMs: items.reduce((total, item) => total + item.durationMs, 0),
    trend,
  };
}

/** The trend's words: "4.2 pts" up, "1 pt" down, or "No change". */
export function trendLabel(points: number): { text: string; direction: 'up' | 'down' | 'flat' } {
  if (points === 0) return { text: 'No change', direction: 'flat' };
  const size = Math.abs(points);
  return {
    text: `${size % 1 === 0 ? size : size.toFixed(1)} ${size === 1 ? 'pt' : 'pts'}`,
    direction: points > 0 ? 'up' : 'down',
  };
}

/** How many sessions the Profile lists under History before "See all". */
export const PROFILE_HISTORY_COUNT = 5;

/** Sections by month of the start date, in the order of `items` (newest first). */
export function groupByMonth(items: HistoryItem[]): HistorySection[] {
  const sections = new Map<string, HistorySection>();
  for (const item of items) {
    const title = formatMonth(item.startedAt);
    const section = sections.get(title);
    if (section) section.data.push(item);
    else sections.set(title, { title, data: [item] });
  }
  return [...sections.values()];
}

/** A finished session on the FG% evolution chart. */
export interface FgPoint {
  id: number;
  name: string;
  startedAt: Date;
  /** The session's overall FG%, as a ratio. */
  fgPct: number;
}

/**
 * The last `count` sessions that have a shooting set, oldest first, for the FG% evolution chart.
 * Sessions with only check drills have no FG% and are left out. `items` is newest first.
 */
export function fgEvolution(items: HistoryItem[], count: number): FgPoint[] {
  const points: FgPoint[] = [];
  for (const item of items) {
    if (points.length === count) break;
    const { fgPct } = item.summary.shooting;
    if (item.summary.shooting.attempts === 0 || fgPct === null) continue;
    points.push({ id: item.id, name: item.name, startedAt: item.startedAt, fgPct });
  }
  return points.reverse();
}

/**
 * The chart's date labels: one per run of points on the same day, with the indexes of its first
 * and last point, so the label sits under the middle of its run.
 */
export function chartDateLabels(
  points: FgPoint[],
): { label: string; first: number; last: number }[] {
  const labels: { label: string; first: number; last: number }[] = [];
  points.forEach((point, index) => {
    const label = formatShortDate(point.startedAt);
    const current = labels.at(-1);
    if (current?.label === label) current.last = index;
    else labels.push({ label, first: index, last: index });
  });
  return labels;
}

/** How many sessions the FG% evolution chart can show: the last few, or all of them. */
export const CHART_RANGES = [5, 10, 20, 'all'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

/** The chart's range as `fgEvolution`'s count. */
export const chartRangeCount = (range: ChartRange) => (range === 'all' ? Infinity : range);

/** "Last 5 workouts", "All workouts": the menu's options. */
export const chartRangeLabel = (range: ChartRange) =>
  range === 'all' ? 'All workouts' : `Last ${range} workouts`;

/** "Last 5", "All": the card's button. */
export const chartRangeShortLabel = (range: ChartRange) =>
  range === 'all' ? 'All' : `Last ${range}`;

/**
 * The labels that fit side by side: no two centers closer than `minGap`. The first and the last
 * are kept (the last alone when even they don't fit), the others picked from the left.
 */
export function spreadLabels<T>(labels: T[], centerOf: (label: T) => number, minGap: number): T[] {
  const last = labels.at(-1);
  if (last === undefined) return [];
  const end = centerOf(last);
  const kept: T[] = [];
  for (const label of labels.slice(0, -1)) {
    const center = centerOf(label);
    const previous = kept.at(-1);
    if (end - center < minGap) break;
    if (previous === undefined || center - centerOf(previous) >= minGap) kept.push(label);
  }
  return [...kept, last];
}

/** Up to this many points, the chart's screen-reader label lists each one; beyond, it sums up. */
const LISTED_POINTS = 10;

/**
 * What the chart says to a screen reader: every point with its date, name and FG%, or, for a long
 * range, its dates and the first, best and latest FG%. `all`: the chart shows every session.
 */
export function fgEvolutionLabel(points: FgPoint[], all = false): string {
  const count = points.length;
  const subject =
    all && count > 1
      ? `all ${count} workouts`
      : `the last ${count === 1 ? 'workout' : `${count} workouts`}`;
  if (count <= LISTED_POINTS) {
    const list = points
      .map(
        (point) => `${formatShortDate(point.startedAt)} ${point.name} ${formatFgPct(point.fgPct)}`,
      )
      .join(', ');
    return `FG% over ${subject}: ${list}`;
  }
  const first = points[0];
  const latest = points[count - 1];
  const best = Math.max(...points.map((point) => point.fgPct));
  return (
    `FG% over ${subject}, from ${formatShortDate(first.startedAt)} to ` +
    `${formatShortDate(latest.startedAt)}: first ${formatFgPct(first.fgPct)}, ` +
    `best ${formatFgPct(best)}, latest ${formatFgPct(latest.fgPct)}`
  );
}
