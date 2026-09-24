/** @jest-environment node */
import { DomainError } from '@/domain/errors';
import { count, eq } from 'drizzle-orm';
import { exercises, sessionExercises, sessionSets } from '../schema';
import { seedExercises } from '../seed/seed';
import { createTestDb } from '../test-utils';
import type { Db } from '../types';
import { archiveCustomExercise, createCustomExercise, listExercises } from './exercises';
import { createRoutine } from './routines';
import {
  addSessionExercise,
  addSessionSet,
  deleteSessionSet,
  discardSession,
  finishSession,
  getInProgressSession,
  getSessionDetail,
  listFinishedSessions,
  removeSessionExercise,
  reorderSessionExercises,
  startEmptySession,
  startSessionFromWorkout,
  updateSessionExerciseNote,
  updateSessionSet,
} from './sessions';
import {
  addWorkoutExercise,
  archiveWorkout,
  createWorkout,
  getWorkoutWithExercises,
  renameWorkout,
} from './workouts';

const exerciseId = (db: Db, seedKey: string) =>
  db.select().from(exercises).where(eq(exercises.seedKey, seedKey)).get()!.id;

const reasonOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.reason;
    throw e;
  }
  return undefined;
};

function setup() {
  const db = createTestDb();
  seedExercises(db);
  const routine = createRoutine(db, 'R');
  const workout = createWorkout(db, routine.id, 'Shooting day');
  addWorkoutExercise(db, workout.id, exerciseId(db, 'free_throws'), {
    targetMode: 'attempts',
    targetValues: [10, 10],
  });
  addWorkoutExercise(db, workout.id, exerciseId(db, 'mikan_drill'), {
    targetMode: 'makes',
    targetValues: [5],
  });
  addWorkoutExercise(db, workout.id, exerciseId(db, 'figure_8'), {
    targetValues: [null, null],
  });
  return { db, workout };
}

const detailOf = (db: Db, id: number) => getSessionDetail(db, id)!;

describe('starting sessions', () => {
  test('from a workout copies the structure as a snapshot', () => {
    const { db, workout } = setup();
    const session = startSessionFromWorkout(db, workout.id);
    expect(session).toMatchObject({
      workoutId: workout.id,
      name: 'Shooting day',
      status: 'in_progress',
      finishedAt: null,
    });

    const detail = detailOf(db, session.id);
    expect(detail.exercises.map((e) => [e.name, e.category, e.trackingType, e.targetMode])).toEqual(
      [
        ['Free Throws', 'shooting', 'makes_attempts', 'attempts'],
        ['Mikan Drill', 'finishing', 'makes_attempts', 'makes'],
        ['Figure 8', 'ball_handling', 'check', null],
      ],
    );
    expect(detail.exercises[0].sets.map((s) => s.targetValue)).toEqual([10, 10]);
    expect(
      detail.exercises
        .flatMap((e) => e.sets)
        .every((s) => s.loggedValue === null && s.completed === false),
    ).toBe(true);
    expect(detail.exercises.every((e) => e.note === '')).toBe(true);
  });

  test('session edits and template edits do not leak into each other', () => {
    const { db, workout } = setup();
    const session = startSessionFromWorkout(db, workout.id);
    const detail = detailOf(db, session.id);
    const templateBefore = getWorkoutWithExercises(db, workout.id);

    // edit the session
    updateSessionSet(db, detail.exercises[0].sets[0].id, { loggedValue: 7 });
    addSessionSet(db, detail.exercises[0].id, 3);
    removeSessionExercise(db, detail.exercises[2].id);
    updateSessionExerciseNote(db, detail.exercises[0].id, 'felt good');
    expect(getWorkoutWithExercises(db, workout.id)).toEqual(templateBefore);

    // edit the template
    renameWorkout(db, workout.id, 'Renamed');
    addWorkoutExercise(db, workout.id, exerciseId(db, 'crossover'), {
      targetValues: [null],
    });
    const after = detailOf(db, session.id);
    expect(after.name).toBe('Shooting day');
    expect(after.exercises.map((e) => e.name)).toEqual(['Free Throws', 'Mikan Drill']);
  });

  test('an empty session has no workout', () => {
    const { db } = setup();
    const session = startEmptySession(db, '  Quick shoot ');
    expect(session).toMatchObject({ workoutId: null, name: 'Quick shoot' });
    expect(getInProgressSession(db)?.id).toBe(session.id);
    expect(detailOf(db, session.id).exercises).toEqual([]);
  });

  test('a second in_progress session is rejected, in both start functions', () => {
    const { db, workout } = setup();
    startEmptySession(db, 'A');
    expect(reasonOf(() => startEmptySession(db, 'B'))).toBe('session_in_progress_exists');
    expect(reasonOf(() => startSessionFromWorkout(db, workout.id))).toBe(
      'session_in_progress_exists',
    );
  });

  test('starting from an unknown or archived workout fails without leaving a session', () => {
    const { db, workout } = setup();
    expect(reasonOf(() => startSessionFromWorkout(db, 999))).toBe('not_found');
    archiveWorkout(db, workout.id);
    expect(reasonOf(() => startSessionFromWorkout(db, workout.id))).toBe('not_found');
    expect(getInProgressSession(db)).toBeUndefined();
  });

  test('an archived custom exercise disappears from lists but sessions keep its name', () => {
    const { db } = setup();
    const custom = createCustomExercise(db, {
      name: 'Deep threes',
      category: 'shooting',
      trackingType: 'makes_attempts',
    });
    const session = startEmptySession(db, 'S');
    addSessionExercise(db, session.id, custom.id, 'attempts');

    archiveCustomExercise(db, custom.id);

    expect(listExercises(db).some((e) => e.id === custom.id)).toBe(false);
    expect(detailOf(db, session.id).exercises[0].name).toBe('Deep threes');
  });
});

describe('editing sessions', () => {
  test('addSessionExercise validates the trackingType/targetMode combination', () => {
    const { db } = setup();
    const session = startEmptySession(db, 'S');
    expect(reasonOf(() => addSessionExercise(db, session.id, exerciseId(db, 'free_throws')))).toBe(
      'target_mode_required',
    );
    expect(
      reasonOf(() => addSessionExercise(db, session.id, exerciseId(db, 'figure_8'), 'makes')),
    ).toBe('target_mode_not_allowed');

    const a = addSessionExercise(db, session.id, exerciseId(db, 'free_throws'), 'makes');
    const b = addSessionExercise(db, session.id, exerciseId(db, 'figure_8'));
    expect([a.position, b.position]).toEqual([0, 1]);
    expect(a).toMatchObject({ name: 'Free Throws', targetMode: 'makes' });
  });

  test('cannot add an archived exercise', () => {
    const { db } = setup();
    const custom = createCustomExercise(db, {
      name: 'X',
      category: 'footwork',
      trackingType: 'check',
    });
    archiveCustomExercise(db, custom.id);
    const session = startEmptySession(db, 'S');
    expect(reasonOf(() => addSessionExercise(db, session.id, custom.id))).toBe('exercise_archived');
  });

  test('adding an exercise creates its first set with the default for its mode', () => {
    const { db } = setup();
    const session = startEmptySession(db, 'S');
    addSessionExercise(db, session.id, exerciseId(db, 'free_throws'), 'attempts');
    addSessionExercise(db, session.id, exerciseId(db, 'mikan_drill'), 'makes');
    addSessionExercise(db, session.id, exerciseId(db, 'figure_8'));

    const exercises = detailOf(db, session.id).exercises;
    expect(exercises.map((e) => e.sets)).toEqual([
      [expect.objectContaining({ position: 0, targetValue: 10, loggedValue: null })],
      [expect.objectContaining({ position: 0, targetValue: 5, loggedValue: null })],
      [expect.objectContaining({ position: 0, targetValue: null, completed: false })],
    ]);
  });

  test('a rejected addSessionExercise leaves no exercise or set behind', () => {
    const { db } = setup();
    const session = startEmptySession(db, 'S');
    expect(reasonOf(() => addSessionExercise(db, session.id, exerciseId(db, 'free_throws')))).toBe(
      'target_mode_required',
    );
    expect(db.select({ n: count() }).from(sessionExercises).get()!.n).toBe(0);
    expect(db.select({ n: count() }).from(sessionSets).get()!.n).toBe(0);
  });

  test('sets: addSessionSet defaults to the last target, delete works', () => {
    const { db } = setup();
    const session = startEmptySession(db, 'S');
    const shooting = addSessionExercise(db, session.id, exerciseId(db, 'free_throws'), 'attempts');
    const check = addSessionExercise(db, session.id, exerciseId(db, 'figure_8'));
    const [first] = detailOf(db, session.id).exercises[0].sets;

    const second = addSessionSet(db, shooting.id);
    expect(second).toMatchObject({ targetValue: 10, position: 1 });
    expect(addSessionSet(db, shooting.id, 12)).toMatchObject({ targetValue: 12, position: 2 });
    expect(addSessionSet(db, shooting.id)).toMatchObject({ targetValue: 12, position: 3 });
    expect(reasonOf(() => addSessionSet(db, shooting.id, 0))).toBe('invalid_target_value');

    expect(addSessionSet(db, check.id)).toMatchObject({ targetValue: null, position: 1 });
    expect(reasonOf(() => addSessionSet(db, check.id, 5))).toBe('value_not_allowed');

    deleteSessionSet(db, first.id);
    expect(detailOf(db, session.id).exercises[0].sets.map((s) => s.id)[0]).toBe(second.id);
  });

  test('the last set of an exercise cannot be deleted', () => {
    const { db } = setup();
    const session = startEmptySession(db, 'S');
    addSessionExercise(db, session.id, exerciseId(db, 'free_throws'), 'attempts');
    addSessionExercise(db, session.id, exerciseId(db, 'figure_8'));
    const [shooting, check] = detailOf(db, session.id).exercises;

    expect(reasonOf(() => deleteSessionSet(db, shooting.sets[0].id))).toBe('invalid_set_count');
    expect(reasonOf(() => deleteSessionSet(db, check.sets[0].id))).toBe('invalid_set_count');
    expect(detailOf(db, session.id).exercises.map((e) => e.sets.length)).toEqual([1, 1]);

    const second = addSessionSet(db, shooting.id);
    deleteSessionSet(db, shooting.sets[0].id);
    expect(detailOf(db, session.id).exercises[0].sets.map((s) => s.id)).toEqual([second.id]);
    expect(reasonOf(() => deleteSessionSet(db, second.id))).toBe('invalid_set_count');
  });

  test('addSessionSet on an exercise with no sets uses the default target of the mode', () => {
    const { db } = setup();
    const session = startEmptySession(db, 'S');
    const attempts = addSessionExercise(db, session.id, exerciseId(db, 'free_throws'), 'attempts');
    const makes = addSessionExercise(db, session.id, exerciseId(db, 'mikan_drill'), 'makes');
    const check = addSessionExercise(db, session.id, exerciseId(db, 'figure_8'));
    // the app never leaves an exercise without sets; reach that state straight in the DB
    db.delete(sessionSets).run();

    expect(addSessionSet(db, attempts.id)).toMatchObject({ targetValue: 10, position: 0 });
    expect(addSessionSet(db, makes.id)).toMatchObject({ targetValue: 5, position: 0 });
    expect(addSessionSet(db, check.id)).toMatchObject({ targetValue: null, position: 0 });
  });

  test('reorderSessionExercises reorders, and rejects incomplete or foreign lists', () => {
    const { db, workout } = setup();
    const session = startSessionFromWorkout(db, workout.id);
    const [a, b, c] = detailOf(db, session.id).exercises.map((e) => e.id);

    reorderSessionExercises(db, session.id, [c, a, b]);
    expect(detailOf(db, session.id).exercises.map((e) => e.id)).toEqual([c, a, b]);

    const reject = (ids: number[]) => reasonOf(() => reorderSessionExercises(db, session.id, ids));
    expect(reject([a, b])).toBe('invalid_exercise_order');
    expect(reject([a, b, c, c])).toBe('invalid_exercise_order');
    expect(reject([a, a, b])).toBe('invalid_exercise_order');
    expect(reject([a, b, 999])).toBe('invalid_exercise_order');

    // an exercise from another (finished) session is foreign
    finishSession(db, session.id);
    const other = startEmptySession(db, 'Other');
    const mine = addSessionExercise(db, other.id, exerciseId(db, 'figure_8'));
    expect(reasonOf(() => reorderSessionExercises(db, other.id, [mine.id, a]))).toBe(
      'invalid_exercise_order',
    );
    expect(detailOf(db, other.id).exercises.map((e) => e.id)).toEqual([mine.id]);
  });

  test('updateSessionSet rejects makes > attempts in both modes', () => {
    const { db, workout } = setup();
    const session = startSessionFromWorkout(db, workout.id);
    const [attemptsMode, makesMode] = detailOf(db, session.id).exercises;
    const attemptsSet = attemptsMode.sets[0];
    const makesSet = makesMode.sets[0];

    // attempts mode (target 10): logged makes <= 10
    expect(updateSessionSet(db, attemptsSet.id, { loggedValue: 10 }).loggedValue).toBe(10);
    expect(reasonOf(() => updateSessionSet(db, attemptsSet.id, { loggedValue: 11 }))).toBe(
      'makes_exceed_attempts',
    );
    // lowering the target under the logged makes is also rejected
    expect(reasonOf(() => updateSessionSet(db, attemptsSet.id, { targetValue: 8 }))).toBe(
      'makes_exceed_attempts',
    );

    // makes mode (target 5): logged attempts >= 5
    expect(reasonOf(() => updateSessionSet(db, makesSet.id, { loggedValue: 4 }))).toBe(
      'makes_exceed_attempts',
    );
    expect(updateSessionSet(db, makesSet.id, { loggedValue: 5 }).loggedValue).toBe(5);

    expect(reasonOf(() => updateSessionSet(db, makesSet.id, { loggedValue: -1 }))).toBe(
      'invalid_logged_value',
    );
    // rejected writes leave the stored values untouched
    const stored = detailOf(db, session.id).exercises;
    expect(stored[0].sets[0]).toMatchObject({ targetValue: 10, loggedValue: 10 });
    expect(stored[1].sets[0]).toMatchObject({ targetValue: 5, loggedValue: 5 });
  });

  test('updateSessionSet can clear a logged value and toggle check sets', () => {
    const { db, workout } = setup();
    const session = startSessionFromWorkout(db, workout.id);
    const [shooting, , check] = detailOf(db, session.id).exercises;

    updateSessionSet(db, shooting.sets[0].id, { loggedValue: 6 });
    expect(updateSessionSet(db, shooting.sets[0].id, { loggedValue: null }).loggedValue).toBeNull();

    expect(updateSessionSet(db, check.sets[0].id, { completed: true }).completed).toBe(true);
    expect(reasonOf(() => updateSessionSet(db, check.sets[0].id, { loggedValue: 1 }))).toBe(
      'value_not_allowed',
    );
    expect(reasonOf(() => updateSessionSet(db, 999, { completed: true }))).toBe('not_found');
  });

  test('content edits on a finished session are rejected', () => {
    const { db, workout } = setup();
    const session = startSessionFromWorkout(db, workout.id);
    const [shooting] = detailOf(db, session.id).exercises;
    const setId = shooting.sets[0].id;
    finishSession(db, session.id);

    const notInProgress = 'session_not_in_progress';
    expect(reasonOf(() => addSessionExercise(db, session.id, exerciseId(db, 'figure_8')))).toBe(
      notInProgress,
    );
    expect(reasonOf(() => removeSessionExercise(db, shooting.id))).toBe(notInProgress);
    expect(reasonOf(() => reorderSessionExercises(db, session.id, []))).toBe(notInProgress);
    expect(reasonOf(() => updateSessionExerciseNote(db, shooting.id, 'x'))).toBe(notInProgress);
    expect(reasonOf(() => addSessionSet(db, shooting.id, 5))).toBe(notInProgress);
    expect(reasonOf(() => deleteSessionSet(db, setId))).toBe(notInProgress);
    expect(reasonOf(() => updateSessionSet(db, setId, { loggedValue: 1 }))).toBe(notInProgress);
    expect(reasonOf(() => finishSession(db, session.id))).toBe(notInProgress);
    expect(reasonOf(() => discardSession(db, session.id))).toBe(notInProgress);
    expect(detailOf(db, session.id).exercises[0].sets[0].loggedValue).toBeNull();
  });

  test('removing an exercise cascades to its sets', () => {
    const { db, workout } = setup();
    const session = startSessionFromWorkout(db, workout.id);
    const [shooting] = detailOf(db, session.id).exercises;
    removeSessionExercise(db, shooting.id);
    const remaining = db
      .select({ n: count() })
      .from(sessionSets)
      .where(eq(sessionSets.sessionExerciseId, shooting.id))
      .get()!.n;
    expect(remaining).toBe(0);
  });
});

describe('finishing and discarding', () => {
  test('finishSession returns the summary of a mixed session', () => {
    const { db, workout } = setup();
    const session = startSessionFromWorkout(db, workout.id);
    const [attemptsMode, makesMode, check] = detailOf(db, session.id).exercises;

    // attempts mode: 10 attempts each; log 7 makes on the first, leave the second empty
    updateSessionSet(db, attemptsMode.sets[0].id, { loggedValue: 7 });
    // makes mode: 5 makes; took 8 attempts
    updateSessionSet(db, makesMode.sets[0].id, { loggedValue: 8 });
    // check: 1 of 2 done
    updateSessionSet(db, check.sets[0].id, { completed: true });

    const summary = finishSession(db, session.id);
    expect(summary.shooting).toEqual({ makes: 12, attempts: 18, fgPct: 12 / 18 });
    expect(summary.check).toEqual({ completed: 1, total: 2 });

    const finished = listFinishedSessions(db);
    expect(finished).toHaveLength(1);
    expect(finished[0]).toMatchObject({ id: session.id, status: 'finished' });
    expect(finished[0].finishedAt).toBeInstanceOf(Date);
    expect(getInProgressSession(db)).toBeUndefined();
  });

  test('a finished session frees the in-progress slot; finished list is newest first', () => {
    const { db } = setup();
    const first = startEmptySession(db, 'First');
    finishSession(db, first.id);
    const second = startEmptySession(db, 'Second');
    finishSession(db, second.id);
    expect(listFinishedSessions(db).map((s) => s.name)).toEqual(['Second', 'First']);
  });

  test('an empty session finishes with an empty summary', () => {
    const { db } = setup();
    const session = startEmptySession(db, 'S');
    expect(finishSession(db, session.id)).toEqual({
      shooting: { makes: 0, attempts: 0, fgPct: null },
      check: { completed: 0, total: 0 },
    });
  });

  test('discarding removes the session and its exercises and sets', () => {
    const { db, workout } = setup();
    const session = startSessionFromWorkout(db, workout.id);
    discardSession(db, session.id);

    expect(getSessionDetail(db, session.id)).toBeUndefined();
    expect(getInProgressSession(db)).toBeUndefined();
    const exerciseRows = db.select({ n: count() }).from(sessionExercises).get()!.n;
    const setRows = db.select({ n: count() }).from(sessionSets).get()!.n;
    expect([exerciseRows, setRows]).toEqual([0, 0]);
    expect(reasonOf(() => discardSession(db, session.id))).toBe('not_found');
  });
});
