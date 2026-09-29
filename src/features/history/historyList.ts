import { fgBand, type FgBand } from '@/domain/fg';
import { formatFgPct, formatMonth, formatShortDate } from '@/domain/format';
import { summarizeSession } from '@/domain/summary';
import type { SessionSummary, SummaryExercise } from '@/domain/summary';

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

/** What the chart says to a screen reader: every point with its date, name and FG%. */
export function fgEvolutionLabel(points: FgPoint[]): string {
  const list = points
    .map((point) => `${formatShortDate(point.startedAt)} ${point.name} ${formatFgPct(point.fgPct)}`)
    .join(', ');
  return `FG% over the last ${points.length === 1 ? 'workout' : `${points.length} workouts`}: ${list}`;
}
