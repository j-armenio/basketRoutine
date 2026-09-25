import { db } from '@/db/client';
import { deleteFinishedSession } from '@/db/repositories/sessions';
import { run } from '../dataStore';

// History is read-only: the only write is deleting a session, like the writes in
// `workout/actions.ts`.

/** Hard-deletes a finished session, with its exercises and sets. */
export function deleteSession(id: number) {
  return run(() => deleteFinishedSession(db, id));
}
