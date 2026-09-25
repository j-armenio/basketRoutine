import { db } from '@/db/client';
import {
  getInProgressSession,
  getSessionDetail,
  listFinishedSessions,
} from '@/db/repositories/sessions';
import { useMemo } from 'react';
import { useDataVersion } from '../dataStore';

// Each hook is a sync repository read (well under a millisecond on a session this small),
// redone when the data store's version changes. The memo callback mentions `version` because
// react-hooks/exhaustive-deps flags a dependency the callback doesn't use.

export function useInProgressSession() {
  const version = useDataVersion();
  return useMemo(() => {
    void version; // re-read after any write
    return getInProgressSession(db);
  }, [version]);
}

export function useSessionDetail(id: number | undefined) {
  const version = useDataVersion();
  return useMemo(() => {
    void version; // re-read after any write
    return id === undefined ? undefined : getSessionDetail(db, id);
  }, [id, version]);
}

export function useFinishedSessionCount(): number {
  const version = useDataVersion();
  return useMemo(() => {
    void version; // re-read after any write
    return listFinishedSessions(db).length;
  }, [version]);
}

export type SessionDetail = NonNullable<ReturnType<typeof getSessionDetail>>;
export type SessionExerciseDetail = SessionDetail['exercises'][number];
export type SessionSetDetail = SessionExerciseDetail['sets'][number];
