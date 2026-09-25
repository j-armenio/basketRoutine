import { createRoutine } from '@/db/repositories/routines';
import * as sessionRepo from '@/db/repositories/sessions';
import {
  addSessionExercise,
  addSessionSet,
  finishSession,
  getSessionDetail,
  startEmptySession,
  startSessionFromWorkout,
  updateSessionExerciseNote,
  updateSessionSet,
} from '@/db/repositories/sessions';
import { getWorkoutWithExercises, saveWorkout } from '@/db/repositories/workouts';
import {
  exercises,
  routines,
  sessionExercises,
  sessionSets,
  sessions,
  workouts,
} from '@/db/schema';
import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import type { Db } from '@/db/types';
import { notifyDataChanged } from '@/features/dataStore';
import { act, cleanup, fireEvent, screen, userEvent, within } from '@testing-library/react-native';
import { count, eq } from 'drizzle-orm';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';

// Same setup as routines.test.tsx: a real in-memory DB with the real migrations, seeded like at
// startup, and no expo-sqlite migration hook.
jest.mock('@/db/client', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { createTestDb } = require('@/db/test-utils');
  const { seedExercises } = require('@/db/seed/seed');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const db = createTestDb();
  seedExercises(db);
  return { db };
});
jest.mock('@/db/useDatabaseSetup', () => ({ useDatabaseSetup: jest.fn() }));

jest.setTimeout(30_000);

const { db } = jest.requireMock('@/db/client') as { db: Db };

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.mocked(useDatabaseSetup).mockReturnValue({ ready: true, error: null });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  db.delete(sessions).run(); // exercises and sets cascade
  db.delete(workouts).run(); // exercises and template sets cascade
  db.delete(routines).run();
  notifyDataChanged();
});

async function launch(initialUrl?: string) {
  const rendered = renderRouter('./app', { initialUrl });
  const result = await rendered;
  return {
    getPathname: () => rendered.getPathname(),
    unmount: () => result.unmount(),
  };
}

type AlertButton = { text: string; style?: string; onPress?: () => void };
const lastAlert = () => {
  const [title, message, buttons] = alertSpy.mock.calls.at(-1)!;
  return { title: title as string, message: message as string, buttons: buttons as AlertButton[] };
};

async function pressAlert(text: string) {
  const button = lastAlert().buttons.find((b) => b.text === text);
  if (!button) throw new Error(`no "${text}" button in ${JSON.stringify(lastAlert())}`);
  await act(async () => {
    button.onPress?.();
  });
}

const exerciseId = (seedKey: string) =>
  db.select().from(exercises).where(eq(exercises.seedKey, seedKey)).get()!.id;

type SetSpec = { target?: number; logged?: number; done?: boolean };
type DrillSpec = { key: string; mode?: 'attempts' | 'makes'; sets: SetSpec[]; note?: string };

/** Logs the values of `specs` into an in-progress session, finishes it, and pins its dates. */
function logAndFinish(sessionId: number, specs: DrillSpec[], startedAt: Date, minutes: number) {
  const existing = getSessionDetail(db, sessionId)!.exercises;
  specs.forEach((spec, index) => {
    // a session from a template already has its drills, an empty one gets them here
    const drill =
      existing[index] ?? addSessionExercise(db, sessionId, exerciseId(spec.key), spec.mode);
    spec.sets.forEach((set, i) => {
      const target = set.target;
      // a template's sets are already there, an empty session's drill has only its first
      const row =
        getSessionDetail(db, sessionId)!.exercises[index].sets[i] ??
        addSessionSet(db, drill.id, target);
      updateSessionSet(db, row.id, {
        ...(target === undefined ? {} : { targetValue: target }),
        ...(set.logged === undefined ? {} : { loggedValue: set.logged }),
        ...(set.done === undefined ? {} : { completed: set.done }),
      });
    });
    if (spec.note) updateSessionExerciseNote(db, drill.id, spec.note);
  });
  finishSession(db, sessionId);
  db.update(sessions)
    .set({ startedAt, finishedAt: new Date(startedAt.getTime() + minutes * 60_000) })
    .where(eq(sessions.id, sessionId))
    .run();
  notifyDataChanged();
}

/** A template "Morning Workout": Free Throws (2 sets, 10 attempts) and Figure 8 (2 sets). */
function seedTemplate() {
  const routine = createRoutine(db, 'Push');
  return saveWorkout(db, {
    routineId: routine.id,
    name: 'Morning Workout',
    exercises: [
      { exerciseId: exerciseId('free_throws'), targetMode: 'attempts', targetValues: [10, 10] },
      { exerciseId: exerciseId('figure_8'), targetMode: null, targetValues: [null, null] },
    ],
  });
}

/**
 * Three finished sessions in two months, middle of the month so a time zone can't move them:
 * Sep 15 (from the template, mixed, with a note and an empty set), Aug 20 (shooting only, fixed
 * makes) and Aug 12 (checks only).
 */
function seedHistory() {
  const template = seedTemplate();
  const morning = startSessionFromWorkout(db, template.id);
  logAndFinish(
    morning.id,
    [
      {
        key: 'free_throws',
        sets: [{ logged: 7 }, {}], // the second set stays empty
        note: 'elbow in',
      },
      { key: 'figure_8', sets: [{ done: true }, { done: false }] },
    ],
    new Date(2026, 8, 15, 10, 0),
    42,
  );

  const layups = startEmptySession(db, 'Layups');
  logAndFinish(
    layups.id,
    [{ key: 'mikan_drill', mode: 'makes', sets: [{ target: 5, logged: 8 }] }],
    new Date(2026, 7, 20, 18, 0),
    65,
  );

  const footwork = startEmptySession(db, 'Footwork');
  logAndFinish(
    footwork.id,
    [{ key: 'figure_8', sets: [{ done: true }] }],
    new Date(2026, 7, 12, 9, 0),
    20,
  );
  return { template, morning, layups, footwork };
}

const historyTab = () => screen.getByRole('tab', { name: 'History' });
const workoutTab = () => screen.getByRole('tab', { name: 'Workout' });

const MORNING = 'Morning Workout, Tue, Sep 15, 2026';

describe('the History list', () => {
  test('no finished session shows the empty state', async () => {
    await launch();
    const user = setupUser();

    await user.press(historyTab());

    expect(screen.getByText('No workouts yet')).toBeOnTheScreen();
    expect(screen.queryByText(/workouts? logged/)).toBeNull();
  });

  test('lists sessions by month, newest first, with date, duration and result', async () => {
    seedHistory();
    const running = startEmptySession(db, 'Still going');
    addSessionExercise(db, running.id, exerciseId('crossover'));
    notifyDataChanged();
    await launch();
    const user = setupUser();

    await user.press(historyTab());

    expect(screen.getByText('3 workouts logged')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Still going, / })).toBeNull();
    const months = screen
      .getAllByText(/^(September|August) 2026$/)
      .map((node) => node.props.children);
    expect(months).toEqual(['September 2026', 'August 2026']);
    const rows = screen.getAllByRole('button', { name: /, (Tue|Thu|Wed), / });
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
      MORNING,
      'Layups, Thu, Aug 20, 2026',
      'Footwork, Wed, Aug 12, 2026',
    ]);

    // mixed: shooting FG% (the empty set is left out) and checks
    const mixed = within(rows[0]);
    expect(mixed.getByText('Tue, Sep 15, 2026 · 42 min')).toBeOnTheScreen();
    expect(mixed.getByText('Free Throws, Figure 8')).toBeOnTheScreen();
    expect(mixed.getByText('70%')).toBeOnTheScreen();
    expect(mixed.getByText('1 / 2 done')).toBeOnTheScreen();
    // shooting only: 5 makes / 8 attempts
    const shooting = within(rows[1]);
    expect(shooting.getByText('Thu, Aug 20, 2026 · 1 h 05 min')).toBeOnTheScreen();
    expect(shooting.getByText('63%')).toBeOnTheScreen();
    expect(shooting.queryByText(/done/)).toBeNull();
    // checks only
    const checks = within(rows[2]);
    expect(checks.getByText('Wed, Aug 12, 2026 · 20 min')).toBeOnTheScreen();
    expect(checks.getByText('1 / 1 done')).toBeOnTheScreen();
    expect(checks.queryByText(/%/)).toBeNull();
  });

  test('the count is singular for one workout', async () => {
    const template = seedTemplate();
    const session = startSessionFromWorkout(db, template.id);
    logAndFinish(
      session.id,
      [{ key: 'free_throws', sets: [{ logged: 3 }] }],
      new Date(2026, 8, 15),
      5,
    );
    await launch();
    const user = setupUser();

    await user.press(historyTab());

    expect(screen.getByText('1 workout logged')).toBeOnTheScreen();
  });
});

describe('the session detail', () => {
  test('a row opens the totals, every set and the notes, with nothing editable', async () => {
    const { morning } = seedHistory();
    const app = await launch();
    const user = setupUser();
    await user.press(historyTab());

    await user.press(screen.getByRole('button', { name: MORNING }));

    expect(app.getPathname()).toBe(`/session/${morning.id}`);
    expect(screen.getByRole('header', { name: 'Morning Workout' })).toBeOnTheScreen();
    expect(screen.getByText('Tue, Sep 15, 2026 · 42 min')).toBeOnTheScreen();
    // totals
    expect(screen.getByText('7 makes / 10 attempts')).toBeOnTheScreen();
    expect(screen.getByText('1 / 2')).toBeOnTheScreen();
    // sets as stored, the empty one as —
    expect(screen.getByText('Fixed attempts · log makes')).toBeOnTheScreen();
    expect(screen.getByLabelText('Set 1 attempts')).toHaveTextContent('10');
    expect(screen.getByLabelText('Set 1 makes')).toHaveTextContent('7');
    expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('70%');
    expect(screen.getByLabelText('Set 2 attempts')).toHaveTextContent('10');
    expect(screen.getByLabelText('Set 2 makes')).toHaveTextContent('—');
    expect(screen.getByLabelText('Set 2 FG%')).toHaveTextContent('—');
    expect(screen.getByText('Total: 7 makes / 10 attempts · 70%')).toBeOnTheScreen();
    expect(screen.getByText('Check when done')).toBeOnTheScreen();
    expect(screen.getByLabelText('Set 1 done')).toHaveTextContent('✓');
    // the note, and nothing to edit
    expect(screen.getByLabelText('Free Throws note')).toHaveTextContent('elbow in');
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain('"TextInput"');

    await user.press(screen.getByRole('button', { name: 'Back' }));

    expect(app.getPathname()).toBe('/history');
  });

  test('a fixed-makes session shows attempts as the logged column', async () => {
    const { layups } = seedHistory();
    await launch(`/session/${layups.id}`);

    expect(screen.getByText('Fixed makes · log attempts')).toBeOnTheScreen();
    expect(screen.getByLabelText('Set 1 makes')).toHaveTextContent('5');
    expect(screen.getByLabelText('Set 1 attempts')).toHaveTextContent('8');
    expect(screen.getByText('5 makes / 8 attempts')).toBeOnTheScreen();
    expect(screen.queryByText('Checks')).toBeNull();
  });

  test('an unknown or in-progress id shows "Workout not found"', async () => {
    seedHistory();
    const running = startEmptySession(db, 'Still going');
    notifyDataChanged();

    await launch(`/session/${running.id}`);
    expect(screen.getByText('Workout not found')).toBeOnTheScreen();
    expect(screen.queryByText('Still going')).toBeNull();
    await cleanup();

    await launch('/session/9999');
    expect(screen.getByText('Workout not found')).toBeOnTheScreen();
  });
});

describe('deleting a session', () => {
  test('Delete asks first; Cancel changes nothing', async () => {
    const { morning } = seedHistory();
    const app = await launch();
    const user = setupUser();
    await user.press(historyTab());
    await user.press(screen.getByRole('button', { name: MORNING }));

    await user.press(screen.getByRole('button', { name: 'Delete workout' }));

    expect(lastAlert().title).toBe('Delete workout?');
    expect(lastAlert().message).toBe(
      "Morning Workout from Tue, Sep 15, 2026 will be removed from your history. This can't be undone.",
    );
    expect(lastAlert().buttons.find((b) => b.text === 'Delete')?.style).toBe('destructive');
    await pressAlert('Cancel');

    expect(app.getPathname()).toBe(`/session/${morning.id}`);
    expect(getSessionDetail(db, morning.id)).toBeDefined();
  });

  test('confirming removes the session, goes back to History and leaves the template alone', async () => {
    const { template, morning } = seedHistory();
    const templateBefore = getWorkoutWithExercises(db, template.id);
    const app = await launch();
    const user = setupUser();
    await user.press(historyTab());
    await user.press(screen.getByRole('button', { name: MORNING }));
    await user.press(screen.getByRole('button', { name: 'Delete workout' }));

    await pressAlert('Delete');

    expect(app.getPathname()).toBe('/history');
    expect(screen.queryByRole('button', { name: MORNING })).toBeNull();
    expect(screen.queryByText('Workout not found')).toBeNull();
    expect(screen.getByText('2 workouts logged')).toBeOnTheScreen();
    expect(screen.queryByText('September 2026')).toBeNull();
    expect(getSessionDetail(db, morning.id)).toBeUndefined();
    // its exercises and sets went with it, the other sessions' stayed
    expect(db.select({ n: count() }).from(sessionExercises).get()!.n).toBe(2);
    expect(db.select({ n: count() }).from(sessionSets).get()!.n).toBe(2);
    expect(getWorkoutWithExercises(db, template.id)).toEqual(templateBefore);
  });
});

async function logFreeThrowsAndFinish(user: ReturnType<typeof setupUser>) {
  await user.press(screen.getByRole('button', { name: 'Start Empty Workout' }));
  await user.press(screen.getByRole('button', { name: 'Add Exercise' }));
  await user.type(screen.getByLabelText('Search exercises'), 'Free Throws');
  await user.press(screen.getByText('Free Throws'));
  await user.press(screen.getByRole('button', { name: 'Fixed attempts — log makes' }));
  const makes = screen.getByLabelText('Set 1 makes');
  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '7');
  await user.press(screen.getByRole('button', { name: 'Finish' }));
  await pressAlert('Finish');
  await user.press(screen.getByRole('button', { name: 'Done' }));
}

describe('finishing a workout', () => {
  test('a session finished from the active workout shows up with the values it was finished with', async () => {
    const app = await launch();
    const user = setupUser();
    jest.setSystemTime(new Date(2026, 8, 24, 9, 30));

    await logFreeThrowsAndFinish(user);
    expect(app.getPathname()).toBe('/');
    await user.press(historyTab());

    expect(screen.getByText('1 workout logged')).toBeOnTheScreen();
    const row = within(
      screen.getByRole('button', { name: /^Morning Workout, Thu, Sep 24, 2026$/ }),
    );
    expect(row.getByText('70%')).toBeOnTheScreen();
    expect(row.getByText('Free Throws')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /^Morning Workout/ }));
    expect(screen.getByLabelText('Set 1 makes')).toHaveTextContent('7');
    expect(screen.getByLabelText('Set 1 attempts')).toHaveTextContent('10');
  });

  test('a mounted History tab catches up when opened again, and sits out writes meanwhile', async () => {
    const listSpy = jest.spyOn(sessionRepo, 'listFinishedSessionsWithExercises');
    await launch();
    const user = setupUser();
    await user.press(historyTab());
    expect(screen.getByText('No workouts yet')).toBeOnTheScreen();
    await user.press(workoutTab());
    listSpy.mockClear();

    await logFreeThrowsAndFinish(user);

    // a whole workout of writes happened with History unfocused: no re-read
    expect(listSpy).not.toHaveBeenCalled();
    await user.press(historyTab());

    expect(listSpy).toHaveBeenCalled();
    expect(screen.queryByText('No workouts yet')).toBeNull();
    expect(screen.getByText('1 workout logged')).toBeOnTheScreen();
  });
});
