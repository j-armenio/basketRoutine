/** @jest-environment node */
import {
  addSessionExercise,
  finishSession,
  getSessionDetail,
  startEmptySession,
} from '@/db/repositories/sessions';
import { exercises } from '@/db/schema';
import type { Db } from '@/db/types';
import { eq } from 'drizzle-orm';
import { subscribe } from '../dataStore';
import { deleteSession } from './actions';

jest.mock('@/db/client', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { createTestDb } = require('@/db/test-utils');
  const { seedExercises } = require('@/db/seed/seed');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const db = createTestDb();
  seedExercises(db);
  return { db };
});

const { db } = jest.requireMock('@/db/client') as { db: Db };

let notifications = 0;
subscribe(() => {
  notifications += 1;
});

beforeEach(() => {
  notifications = 0;
});

function finishedSession() {
  const session = startEmptySession(db, 'Morning Workout');
  const figure8 = db.select().from(exercises).where(eq(exercises.seedKey, 'figure_8')).get()!;
  addSessionExercise(db, session.id, figure8.id);
  finishSession(db, session.id);
  return session;
}

test('deleting a finished session removes it and notifies once', () => {
  const session = finishedSession();

  expect(deleteSession(session.id)).toEqual({ ok: true, value: undefined });

  expect(getSessionDetail(db, session.id)).toBeUndefined();
  expect(notifications).toBe(1);
});

test('a rule violation comes back as a reason and does not notify', () => {
  expect(deleteSession(999)).toEqual({ ok: false, reason: 'not_found' });

  const running = startEmptySession(db, 'Running');
  expect(deleteSession(running.id)).toEqual({ ok: false, reason: 'session_not_finished' });
  expect(getSessionDetail(db, running.id)).toBeDefined();
  expect(notifications).toBe(0);
});
