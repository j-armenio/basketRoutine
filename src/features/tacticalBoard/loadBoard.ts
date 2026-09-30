import { db } from '@/db/client';
import { getInProgressSession, getSessionDetail } from '@/db/repositories/sessions';
import type { TacticalBoard } from '@/domain/tacticalBoard';
import { getDraft } from '../routines/draftStore';

/** Where the editor's board lives: an exercise of the active workout, or of the open template draft. */
export type BoardSource =
  | {
      kind: 'session';
      sessionExerciseId: number;
      exerciseName: string;
      board: TacticalBoard | null;
    }
  | { kind: 'draft'; draftKey: string; exerciseName: string; board: TacticalBoard | null };

/**
 * The board the editor opens with. `null` for a stale link: an exercise that isn't in the workout
 * in progress, or a draft that is closed or no longer holds the exercise.
 */
export function loadBoardSource(params: {
  sessionExerciseId?: number;
  draftKey?: string;
}): BoardSource | null {
  if (params.sessionExerciseId !== undefined) {
    const session = getInProgressSession(db);
    const exercise = session
      ? getSessionDetail(db, session.id)?.exercises.find((e) => e.id === params.sessionExerciseId)
      : undefined;
    if (!exercise) return null;
    return {
      kind: 'session',
      sessionExerciseId: exercise.id,
      exerciseName: exercise.name,
      board: exercise.tacticalBoard,
    };
  }
  if (params.draftKey === undefined) return null;
  const exercise = getDraft()?.exercises.find((e) => e.key === params.draftKey);
  if (!exercise) return null;
  return {
    kind: 'draft',
    draftKey: exercise.key,
    exerciseName: exercise.name,
    board: exercise.tacticalBoard,
  };
}
