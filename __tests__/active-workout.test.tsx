import { sessions } from '@/db/schema';
import { getInProgressSession, getSessionDetail } from '@/db/repositories/sessions';
import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import type { Db } from '@/db/types';
import { notifySessionChanged } from '@/features/workout/sessionStore';
import { act, cleanup, fireEvent, screen, userEvent, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';

// Same mocks as shell.test.tsx: a real in-memory DB with the real migrations, seeded like at
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

// Rendering the real router is slow on a cold CI runner (the first test there took over 5 s).
jest.setTimeout(30_000);

const { db } = jest.requireMock('@/db/client') as { db: Db };

// renderRouter enables Jest fake timers, so the user must advance them or press hangs.
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
  notifySessionChanged();
});

// The route helpers (getPathname...) live on the returned Promise, not on the awaited result,
// so keep the Promise and hand them out through a small wrapper.
async function launch() {
  const rendered = renderRouter('./app');
  const result = await rendered;
  return {
    getPathname: () => rendered.getPathname(),
    unmount: () => result.unmount(),
  };
}

/** The buttons of the last confirmation shown, so a test can press the one it wants. */
const lastAlert = () => {
  const [title, message, buttons] = alertSpy.mock.calls.at(-1)!;
  return { title: title as string, message: message as string, buttons: buttons as AlertButton[] };
};
type AlertButton = { text: string; style?: string; onPress?: () => void };

async function pressAlert(text: string) {
  const button = lastAlert().buttons.find((b) => b.text === text);
  if (!button) throw new Error(`no "${text}" button in ${JSON.stringify(lastAlert())}`);
  await act(async () => {
    button.onPress?.();
  });
}

const session = () => getSessionDetail(db, getInProgressSession(db)!.id)!;

/** Start an empty workout from the Workout tab. */
async function startWorkout(user: ReturnType<typeof setupUser>) {
  await user.press(screen.getByRole('button', { name: 'Start Empty Workout' }));
}

/** From the active workout: open the picker and add an exercise by name. */
async function addExerciseByName(
  user: ReturnType<typeof setupUser>,
  name: string,
  mode?: 'attempts' | 'makes',
) {
  await user.press(screen.getByRole('button', { name: 'Add Exercise' }));
  // the list only renders its first rows, so find the exercise the way a user would
  await user.type(screen.getByLabelText('Search exercises'), name);
  await user.press(screen.getByText(name));
  if (mode) {
    await user.press(
      screen.getByRole('button', {
        name: mode === 'attempts' ? 'Fixed attempts — log makes' : 'Fixed makes — log attempts',
      }),
    );
  }
}

const fg = (n: number) => screen.getByLabelText(`Set ${n} FG%`);

test('start, add a drill and type a value: FG% and the DB follow before blur', async () => {
  const app = await launch();
  const user = setupUser();
  jest.setSystemTime(new Date(2026, 8, 24, 9, 30));

  await startWorkout(user);
  expect(app.getPathname()).toBe('/active-workout');
  expect(screen.getByRole('header', { name: 'Morning Workout' })).toBeOnTheScreen();
  expect(screen.getByText('Add your first exercise')).toBeOnTheScreen();

  await addExerciseByName(user, 'Free Throws', 'attempts');
  expect(app.getPathname()).toBe('/active-workout');
  expect(screen.getByText('Fixed attempts · log makes')).toBeOnTheScreen();
  expect(screen.getByLabelText('Set 1 attempts')).toHaveDisplayValue('10');
  expect(fg(1)).toHaveTextContent('—');

  const makes = screen.getByLabelText('Set 1 makes');
  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '7');

  expect(fg(1)).toHaveTextContent('70%');
  expect(session().exercises[0].sets[0].loggedValue).toBe(7);
  expect(screen.getByText('Total: 7 makes / 10 attempts · 70%')).toBeOnTheScreen();
});

test('an invalid entry is rolled back on blur, in the DB and on screen, with the reason', async () => {
  await launch();
  const user = setupUser();
  await startWorkout(user);
  await addExerciseByName(user, 'Free Throws', 'attempts');
  const makes = screen.getByLabelText('Set 1 makes');

  await user.clear(makes);
  await user.type(makes, '7');
  expect(session().exercises[0].sets[0].loggedValue).toBe(7);

  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '1');
  await fireEvent.changeText(makes, '11');
  // the "1" was saved on the way, "11" was not, and nothing is marked yet
  expect(session().exercises[0].sets[0].loggedValue).toBe(1);
  expect(screen.queryByText("Makes can't exceed attempts.")).toBeNull();

  await fireEvent(makes, 'blur');

  expect(session().exercises[0].sets[0].loggedValue).toBe(7);
  expect(makes).toHaveDisplayValue('7');
  expect(fg(1)).toHaveTextContent('70%');
  expect(screen.getByText("Makes can't exceed attempts.")).toBeOnTheScreen();
});

test('sets: Add Set copies the target, a set can be deleted by swiping it', async () => {
  await launch();
  const user = setupUser();
  await startWorkout(user);
  await addExerciseByName(user, 'Mikan Drill', 'makes');
  expect(screen.getByText('Fixed makes · log attempts')).toBeOnTheScreen();

  const target = screen.getByLabelText('Set 1 makes');
  expect(target).toHaveDisplayValue('5');
  // an empty target is invalid (rolled back on blur), so replace it in one change instead
  await fireEvent(target, 'focus');
  await fireEvent.changeText(target, '8');
  await fireEvent(target, 'blur');
  await user.press(screen.getByRole('button', { name: 'Add Set' }));

  expect(session().exercises[0].sets.map((s) => s.targetValue)).toEqual([8, 8]);
  expect(screen.getByLabelText('Set 2 makes')).toHaveDisplayValue('8');

  // The swipe is a native gesture Jest can't run: delete through the row's accessibility
  // action, which calls the same handler (see jest.setup.js).
  await fireEvent(screen.getByTestId('set-1'), 'accessibilityAction', {
    nativeEvent: { actionName: 'delete' },
  });

  expect(session().exercises[0].sets).toHaveLength(1);
  expect(screen.queryByLabelText('Set 2 makes')).toBeNull();

  // the last set stays: its row can't be swiped away
  expect(screen.getByTestId('set-1')).toHaveProp('accessibilityActions', []);
  await fireEvent(screen.getByTestId('set-1'), 'accessibilityAction', {
    nativeEvent: { actionName: 'delete' },
  });
  expect(session().exercises[0].sets).toHaveLength(1);
});

test('a check drill: ✓ toggles on and off', async () => {
  await launch();
  const user = setupUser();
  await startWorkout(user);
  await addExerciseByName(user, 'Figure 8');

  const toggle = screen.getByRole('checkbox', { name: 'Set 1 done' });
  expect(toggle).not.toBeChecked();

  await user.press(toggle);
  expect(session().exercises[0].sets[0].completed).toBe(true);
  expect(screen.getByRole('checkbox', { name: 'Set 1 done' })).toBeChecked();

  await user.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
  expect(session().exercises[0].sets[0].completed).toBe(false);
});

test('exercises: move one up and remove another after confirming', async () => {
  await launch();
  const user = setupUser();
  await startWorkout(user);
  await addExerciseByName(user, 'Free Throws', 'attempts');
  await addExerciseByName(user, 'Figure 8');
  const names = () => session().exercises.map((e) => e.name);
  expect(names()).toEqual(['Free Throws', 'Figure 8']);

  await user.press(screen.getByRole('button', { name: 'Figure 8 menu' }));
  await user.press(screen.getByRole('button', { name: 'Move up' }));
  expect(names()).toEqual(['Figure 8', 'Free Throws']);

  // at the top, "Move up" is disabled
  await user.press(screen.getByRole('button', { name: 'Figure 8 menu' }));
  expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Cancel' }));

  await user.press(screen.getByRole('button', { name: 'Free Throws menu' }));
  await user.press(screen.getByRole('button', { name: 'Remove exercise' }));
  expect(lastAlert().title).toBe('Remove exercise?');
  expect(names()).toEqual(['Figure 8', 'Free Throws']);
  await pressAlert('Remove');

  expect(names()).toEqual(['Figure 8']);
});

test('the picker searches by part of the name and the close button adds nothing', async () => {
  const app = await launch();
  const user = setupUser();
  await startWorkout(user);
  await user.press(screen.getByRole('button', { name: 'Add Exercise' }));

  await user.type(screen.getByLabelText('Search exercises'), 'FREE thr');
  expect(screen.getByText('Free Throws')).toBeOnTheScreen();
  expect(screen.queryByText('Figure 8')).toBeNull();

  await user.press(screen.getByRole('button', { name: 'Close' }));

  expect(app.getPathname()).toBe('/active-workout');
  expect(session().exercises).toHaveLength(0);
});

test('with the keyboard open, a new target counts when pressing Add Set', async () => {
  await launch();
  const user = setupUser();
  await startWorkout(user);
  await addExerciseByName(user, 'Free Throws', 'attempts');

  const target = screen.getByLabelText('Set 1 attempts');
  await fireEvent(target, 'focus');
  await fireEvent.changeText(target, '12'); // no blur: the keyboard is still open
  await user.press(screen.getByRole('button', { name: 'Add Set' }));

  expect(session().exercises[0].sets.map((s) => s.targetValue)).toEqual([12, 12]);
});

test('minimize shows the banner on every tab, and it survives an app kill', async () => {
  const first = await launch();
  const user = setupUser();
  await startWorkout(user);
  await addExerciseByName(user, 'Free Throws', 'attempts');
  const makes = screen.getByLabelText('Set 1 makes');
  await fireEvent(makes, 'focus');
  await fireEvent.changeText(makes, '7'); // keyboard still open
  await user.press(screen.getByRole('button', { name: 'Free Throws note' }));
  await fireEvent.changeText(screen.getByLabelText('Free Throws note'), 'felt good');

  await user.press(screen.getByRole('button', { name: 'Minimize' }));

  expect(first.getPathname()).toBe('/');
  expect(screen.getByText('Workout in progress')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Resume Workout' })).toBeOnTheScreen();
  for (const tab of ['Exercises', 'History', 'Workout']) {
    await user.press(screen.getByRole('tab', { name: tab }));
    expect(screen.getByText('Workout in progress')).toBeOnTheScreen();
  }

  // kill the app: unmount, then start over on the same DB
  await first.unmount();
  const second = await launch();
  expect(second.getPathname()).toBe('/');
  expect(screen.getByText('Workout in progress')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Resume Workout' }));

  expect(second.getPathname()).toBe('/active-workout');
  expect(screen.getByLabelText('Set 1 makes')).toHaveDisplayValue('7');
  expect(screen.getByText('felt good')).toBeOnTheScreen();
});

test('finish: confirmation, then the summary, then Done', async () => {
  const app = await launch();
  const user = setupUser();
  await startWorkout(user);
  await addExerciseByName(user, 'Free Throws', 'attempts');
  await addExerciseByName(user, 'Figure 8');
  const makes = screen.getByLabelText('Set 1 makes');
  await user.clear(makes);
  await user.type(makes, '7');
  await user.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
  await user.press(screen.getAllByRole('button', { name: 'Add Set' })[0]); // an empty set

  await user.press(screen.getByRole('button', { name: 'Finish' }));

  expect(lastAlert().title).toBe('Finish workout?');
  expect(lastAlert().message).toBe("1 empty set won't count.");
  expect(getInProgressSession(db)).toBeDefined();
  await pressAlert('Finish');

  expect(app.getPathname()).toMatch(/^\/workout-summary\/\d+$/);
  expect(getInProgressSession(db)).toBeUndefined();
  expect(screen.getByText('70%')).toBeOnTheScreen();
  expect(screen.getByText('7 makes / 10 attempts')).toBeOnTheScreen();
  expect(screen.getByText('1 / 1')).toBeOnTheScreen();
  expect(screen.getByText('7 / 10 · 70%')).toBeOnTheScreen();
  expect(screen.getByText('1 / 1 done')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Done' }));

  expect(app.getPathname()).toBe('/');
  expect(screen.queryByText('Workout in progress')).toBeNull();
  expect(screen.getByRole('button', { name: 'Start Empty Workout' })).toBeOnTheScreen();
  await user.press(screen.getByRole('tab', { name: 'History' }));
  expect(screen.getByText('1 workout logged')).toBeOnTheScreen();
});

test('finish with nothing logged offers only Discard and Keep going', async () => {
  const app = await launch();
  const user = setupUser();
  await startWorkout(user);
  await addExerciseByName(user, 'Free Throws', 'attempts');

  await user.press(screen.getByRole('button', { name: 'Finish' }));

  expect(lastAlert().title).toBe('Nothing logged yet');
  expect(lastAlert().buttons.map((b) => b.text)).toEqual(['Keep going', 'Discard workout']);
  await pressAlert('Discard workout');
  expect(app.getPathname()).toBe('/');
  expect(getInProgressSession(db)).toBeUndefined();
});

test('discard from the active workout asks first and leaves no session', async () => {
  const app = await launch();
  const user = setupUser();
  await startWorkout(user);
  await addExerciseByName(user, 'Free Throws', 'attempts');

  await user.press(screen.getByRole('button', { name: 'Discard Workout' }));
  expect(lastAlert().title).toBe('Discard workout?');
  expect(getInProgressSession(db)).toBeDefined();
  await pressAlert('Discard');

  expect(app.getPathname()).toBe('/');
  expect(getInProgressSession(db)).toBeUndefined();
  expect(screen.queryByText('Workout in progress')).toBeNull();
});

test('discard from the banner asks first and leaves no session', async () => {
  await launch();
  const user = setupUser();
  await startWorkout(user);
  await user.press(screen.getByRole('button', { name: 'Minimize' }));

  await user.press(
    within(screen.getByText('Workout in progress').parent!.parent!).getByRole('button', {
      name: 'Discard workout',
    }),
  );
  expect(lastAlert().title).toBe('Discard workout?');
  expect(getInProgressSession(db)).toBeDefined();
  await pressAlert('Discard');

  expect(getInProgressSession(db)).toBeUndefined();
  expect(screen.queryByText('Workout in progress')).toBeNull();
  expect(screen.getByRole('button', { name: 'Start Empty Workout' })).toBeOnTheScreen();
});
