import { db } from '@/db/client';
import { getSessionDetail, listFinishedSessionsWithExercises } from '@/db/repositories/sessions';
import { useIsFocused } from 'expo-router';
import { useMemo } from 'react';
import { useDataVersion, useDataVersionWhile } from '../dataStore';
import { toHistoryItem } from './historyList';

/**
 * Every finished session, newest first, for the History tab. The tab stays mounted once visited
 * and the query reads every session with its sets, so it follows the data version only while the
 * tab is focused (and catches up when it is focused again): otherwise it would be redone on every
 * keystroke of the active workout.
 */
export function useHistory() {
  const version = useDataVersionWhile(useIsFocused());
  return useMemo(() => {
    void version; // re-read after any write
    return listFinishedSessionsWithExercises(db).map(toHistoryItem);
  }, [version]);
}

/** A finished session with its exercises and sets, or `undefined` (unknown or in progress). */
export function useFinishedSession(id: number | undefined) {
  const version = useDataVersion();
  return useMemo(() => {
    void version; // re-read after any write
    if (id === undefined) return undefined;
    const detail = getSessionDetail(db, id);
    return detail?.status === 'finished' ? detail : undefined;
  }, [id, version]);
}
