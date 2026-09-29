import {
  summarizeSession,
  type CheckTotals,
  type ShootingTotals,
  type SummaryExercise,
} from './summary';

/** A finished session's rows of one exercise (usually one, more if it was added twice). */
export interface ExerciseSession {
  id: number;
  startedAt: Date;
  exercises: SummaryExercise[];
}

export interface ExerciseSessionResult {
  sessionId: number;
  startedAt: Date;
  shooting: ShootingTotals;
  check: CheckTotals;
}

export interface ExerciseStats {
  /** How many finished sessions hold the exercise. */
  sessions: number;
  /** The best session's FG%, as a ratio; null when nothing was ever shot. */
  best: number | null;
  /** Σmakes / Σattempts over every session (not an average of percents); the check totals too. */
  shooting: ShootingTotals;
  check: CheckTotals;
  /** The most recent sessions, newest first. */
  recent: ExerciseSessionResult[];
}

/**
 * An exercise's stats from its finished sessions (`sessions` newest first). Rows of the same
 * session are summed, so a drill added twice counts as one session.
 */
export function exerciseStats(sessions: ExerciseSession[], recentCount: number): ExerciseStats {
  const results = sessions.map((session) => {
    const summary = summarizeSession(session.exercises);
    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      shooting: summary.shooting,
      check: summary.check,
    };
  });
  const total = summarizeSession(sessions.flatMap((session) => session.exercises));
  const shot = results.flatMap((result) =>
    result.shooting.fgPct === null ? [] : [result.shooting.fgPct],
  );
  return {
    sessions: results.length,
    best: shot.length > 0 ? Math.max(...shot) : null,
    shooting: total.shooting,
    check: total.check,
    recent: results.slice(0, recentCount),
  };
}
