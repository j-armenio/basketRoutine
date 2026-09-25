/** @jest-environment node */
import { exercises } from '@/db/schema';
import { getInProgressSession, getSessionDetail } from '@/db/repositories/sessions';
import { getWorkoutWithExercises, listWorkouts } from '@/db/repositories/workouts';
import { listRoutines } from '@/db/repositories/routines';
import type { Db } from '@/db/types';
import { eq } from 'drizzle-orm';
import { subscribe, type ActionResult } from '../dataStore';
import * as workoutActions from '../workout/actions';
import * as actions from './actions';

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

const exerciseId = (seedKey: string) =>
  db.select().from(exercises).where(eq(exercises.seedKey, seedKey)).get()!.id;

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(`unexpected failure: ${result.reason}`);
  return result.value;
}

let notifications = 0;
subscribe(() => {
  notifications += 1;
});

afterEach(() => {
  const session = getInProgressSession(db);
  if (session) workoutActions.discardWorkout(session.id);
  notifications = 0;
});

function buildWorkout(name = 'Shooting day') {
  const routine = unwrap(actions.createRoutine(`Routine of ${name}`));
  const workout = unwrap(
    actions.saveWorkout({
      routineId: routine.id,
      name,
      exercises: [
        { exerciseId: exerciseId('free_throws'), targetMode: 'attempts', targetValues: [10, 10] },
        { exerciseId: exerciseId('figure_8'), targetMode: null, targetValues: [null] },
      ],
    }),
  );
  return { routine, workout };
}

test('every successful write notifies once', () => {
  const routine = unwrap(actions.createRoutine('Push'));
  expect(notifications).toBe(1);
  unwrap(actions.renameRoutine(routine.id, 'Pull'));
  expect(notifications).toBe(2);

  const saved = unwrap(
    actions.saveWorkout({
      routineId: routine.id,
      name: 'W',
      exercises: [{ exerciseId: exerciseId('figure_8'), targetMode: null, targetValues: [null] }],
    }),
  );
  expect(notifications).toBe(3);
  unwrap(actions.moveWorkout(routine.id, [saved.id]));
  expect(notifications).toBe(4);
  unwrap(actions.moveRoutine(listRoutines(db).map((r) => r.id)));
  expect(notifications).toBe(5);
  unwrap(actions.deleteWorkout(saved.id));
  expect(notifications).toBe(6);
  unwrap(actions.deleteRoutine(routine.id));
  expect(notifications).toBe(7);
});

test('a rejected write returns its reason and does not notify', () => {
  const routine = unwrap(actions.createRoutine('Push'));
  notifications = 0;

  expect(actions.createRoutine('  ')).toEqual({ ok: false, reason: 'empty_name' });
  expect(actions.renameRoutine(999, 'X')).toEqual({ ok: false, reason: 'not_found' });
  expect(actions.moveRoutine([999])).toEqual({ ok: false, reason: 'invalid_order' });
  expect(actions.saveWorkout({ routineId: routine.id, name: 'W', exercises: [] })).toEqual({
    ok: false,
    reason: 'empty_workout',
  });
  expect(listWorkouts(db, routine.id)).toEqual([]);
  expect(notifications).toBe(0);
});

test('start from a template, and discard and start, notify once each', () => {
  const { workout } = buildWorkout();
  notifications = 0;

  const session = unwrap(workoutActions.startWorkoutFromTemplate(workout.id));
  expect(notifications).toBe(1);
  expect(workoutActions.startWorkoutFromTemplate(workout.id)).toEqual({
    ok: false,
    reason: 'session_in_progress_exists',
  });
  expect(notifications).toBe(1);

  const fresh = unwrap(workoutActions.discardAndStartFromTemplate(workout.id));
  expect(notifications).toBe(2);
  expect(fresh.id).not.toBe(session.id);
  expect(getInProgressSession(db)?.id).toBe(fresh.id);
});

describe('templateUpdateCandidate', () => {
  const finish = (sessionId: number) => {
    const detail = getSessionDetail(db, sessionId)!;
    unwrap(workoutActions.updateSet(detail.exercises[0].sets[0].id, { loggedValue: 7 }));
    unwrap(workoutActions.finishWorkout(sessionId));
  };

  test('is nothing for a session with no workout', () => {
    const session = unwrap(workoutActions.startEmptyWorkout());
    unwrap(workoutActions.addExercise(session.id, exerciseId('free_throws'), 'attempts'));
    finish(session.id);
    expect(workoutActions.templateUpdateCandidate(session.id)).toBeUndefined();
  });

  test('is nothing when the structure is the same, whatever was logged', () => {
    const { workout } = buildWorkout();
    const session = unwrap(workoutActions.startWorkoutFromTemplate(workout.id));
    const detail = getSessionDetail(db, session.id)!;
    unwrap(workoutActions.updateNote(detail.exercises[0].id, 'felt good'));
    unwrap(workoutActions.updateSet(detail.exercises[1].sets[0].id, { completed: true }));
    finish(session.id);

    expect(workoutActions.templateUpdateCandidate(session.id)).toBeUndefined();
  });

  test('is the workout when the session changed its structure', () => {
    const { workout } = buildWorkout();
    const session = unwrap(workoutActions.startWorkoutFromTemplate(workout.id));
    unwrap(workoutActions.addSet(getSessionDetail(db, session.id)!.exercises[0].id));
    finish(session.id);

    expect(workoutActions.templateUpdateCandidate(session.id)).toMatchObject({ id: workout.id });
  });

  test('is nothing when the workout was deleted meanwhile', () => {
    const { workout } = buildWorkout();
    const session = unwrap(workoutActions.startWorkoutFromTemplate(workout.id));
    unwrap(workoutActions.addSet(getSessionDetail(db, session.id)!.exercises[0].id));
    unwrap(actions.deleteWorkout(workout.id));
    finish(session.id);

    expect(workoutActions.templateUpdateCandidate(session.id)).toBeUndefined();
  });

  test('is nothing for an unknown session, and reading it does not notify', () => {
    notifications = 0;
    expect(workoutActions.templateUpdateCandidate(999)).toBeUndefined();
    expect(notifications).toBe(0);
  });

  test('updateTemplateFromSession applies the structure and notifies once', () => {
    const { workout } = buildWorkout();
    const session = unwrap(workoutActions.startWorkoutFromTemplate(workout.id));
    unwrap(workoutActions.addSet(getSessionDetail(db, session.id)!.exercises[0].id));
    finish(session.id);
    notifications = 0;

    unwrap(workoutActions.updateTemplateFromSession(session.id));

    expect(notifications).toBe(1);
    expect(getWorkoutWithExercises(db, workout.id)!.exercises[0].sets).toHaveLength(3);
    expect(workoutActions.templateUpdateCandidate(session.id)).toBeUndefined();
  });

  test('updateTemplateFromSession refuses a session still in progress', () => {
    const { workout } = buildWorkout();
    const session = unwrap(workoutActions.startWorkoutFromTemplate(workout.id));

    expect(workoutActions.updateTemplateFromSession(session.id)).toEqual({
      ok: false,
      reason: 'session_not_finished',
    });
  });
});
