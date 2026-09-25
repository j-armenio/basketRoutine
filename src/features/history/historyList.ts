import { formatFgPct, formatMonth } from '@/domain/format';
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
 * The right side of a History row: the overall FG% when a shooting set was logged, and
 * `x / y done` when the session has check drills. Either can be missing, or both.
 */
export function sessionResult(summary: SessionSummary): {
  fgPct: string | null;
  checks: string | null;
} {
  return {
    fgPct: summary.shooting.attempts > 0 ? formatFgPct(summary.shooting.fgPct) : null,
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
