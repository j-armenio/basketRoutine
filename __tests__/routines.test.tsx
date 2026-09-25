import { exercises, routines, sessions, workouts } from '@/db/schema';
import { getRoutine, listRoutines } from '@/db/repositories/routines';
import { getInProgressSession, getSessionDetail } from '@/db/repositories/sessions';
import { createRoutine } from '@/db/repositories/routines';
import {
  getWorkout,
  getWorkoutWithExercises,
  listWorkouts,
  saveWorkout,
} from '@/db/repositories/workouts';
import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import type { Db } from '@/db/types';
import { notifyDataChanged } from '@/features/dataStore';
import { closeDraft } from '@/features/routines/draftStore';
import { act, cleanup, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';

// Same setup as active-workout.test.tsx: a real in-memory DB with the real migrations, seeded
// like at startup, and no expo-sqlite migration hook.
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
  closeDraft();
  db.delete(sessions).run(); // exercises and sets cascade
  db.delete(workouts).run(); // exercises and template sets cascade
  db.delete(routines).run();
  notifyDataChanged();
});

async function launch() {
  const rendered = renderRouter('./app');
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

/** A routine with a workout, straight through the repositories. */
function seedRoutine(name = 'Push', workoutNames: string[] = ['Shooting day']) {
  const routine = createRoutine(db, name);
  const made = workoutNames.map((workoutName) =>
    saveWorkout(db, {
      routineId: routine.id,
      name: workoutName,
      exercises: [
        { exerciseId: exerciseId('free_throws'), targetMode: 'attempts', targetValues: [10, 10] },
        { exerciseId: exerciseId('figure_8'), targetMode: null, targetValues: [null] },
      ],
    }),
  );
  notifyDataChanged();
  return { routine, workouts: made };
}

const template = (id: number) => getWorkoutWithExercises(db, id)!;
const targets = (id: number) => template(id).exercises.map((e) => e.sets.map((s) => s.targetValue));

async function newRoutine(user: ReturnType<typeof setupUser>, name: string) {
  await user.press(screen.getByRole('button', { name: 'New Routine' }));
  await user.type(screen.getByLabelText('Name'), name);
  await user.press(screen.getByRole('button', { name: 'Create' }));
}

async function pickExercise(
  user: ReturnType<typeof setupUser>,
  name: string,
  mode?: 'attempts' | 'makes',
) {
  await user.press(screen.getByRole('button', { name: 'Add Exercise' }));
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

describe('routines on the Workout tab', () => {
  test('New Routine: the dialog asks for a name and the section shows', async () => {
    await launch();
    const user = setupUser();
    expect(screen.getByText('No routines yet')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'New Routine' }));
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    await user.type(screen.getByLabelText('Name'), 'Push');
    await user.press(screen.getByRole('button', { name: 'Create' }));

    expect(screen.queryByText('No routines yet')).toBeNull();
    expect(screen.getByText('Push')).toBeOnTheScreen();
    expect(listRoutines(db).map((r) => r.name)).toEqual(['Push']);
    expect(screen.getByRole('button', { name: 'New workout in Push' })).toBeOnTheScreen();
  });

  test('rename, move and delete a routine, each reflected on the tab and in the DB', async () => {
    const { routine: push } = seedRoutine('Push', ['W1', 'W2']);
    const { routine: pull } = seedRoutine('Pull', []);
    await launch();
    const user = setupUser();
    const names = () => screen.getAllByRole('header').length && listRoutines(db).map((r) => r.name);

    await user.press(screen.getByRole('button', { name: 'Push menu' }));
    await user.press(screen.getByRole('button', { name: 'Rename' }));
    expect(screen.getByLabelText('Name')).toHaveDisplayValue('Push');
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Legs');
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Legs')).toBeOnTheScreen();
    expect(screen.queryByText('Push')).toBeNull();
    expect(names()).toEqual(['Legs', 'Pull']);

    await user.press(screen.getByRole('button', { name: 'Legs menu' }));
    expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Move down' }));
    expect(names()).toEqual(['Pull', 'Legs']);

    await user.press(screen.getByRole('button', { name: 'Legs menu' }));
    await user.press(screen.getByRole('button', { name: 'Delete' }));
    expect(lastAlert().title).toBe('Delete "Legs"?');
    expect(lastAlert().message).toBe('Its 2 workouts will be deleted too. Your history stays.');
    expect(listRoutines(db)).toHaveLength(2);
    await pressAlert('Delete');

    expect(screen.queryByText('Legs')).toBeNull();
    expect(names()).toEqual(['Pull']);
    expect(getRoutine(db, push.id)?.archivedAt).toBeInstanceOf(Date);
    expect(listWorkouts(db, push.id)).toEqual([]);
    expect(getRoutine(db, pull.id)?.archivedAt).toBeNull();
  });

  test('a workout card lists its exercises; move and delete a workout', async () => {
    const { routine, workouts: made } = seedRoutine('Push', ['First', 'Second']);
    await launch();
    const user = setupUser();
    const order = () => listWorkouts(db, routine.id).map((w) => w.name);

    expect(screen.getAllByText('Free Throws, Figure 8')).toHaveLength(2);

    await user.press(screen.getByRole('button', { name: 'Second menu' }));
    await user.press(screen.getByRole('button', { name: 'Move up' }));
    expect(order()).toEqual(['Second', 'First']);

    await user.press(screen.getByRole('button', { name: 'First menu' }));
    await user.press(screen.getByRole('button', { name: 'Delete' }));
    expect(lastAlert()).toMatchObject({ title: 'Delete "First"?', message: 'Your history stays.' });
    await pressAlert('Delete');

    expect(order()).toEqual(['Second']);
    expect(screen.queryByText('First')).toBeNull();
    expect(getWorkout(db, made[0].id)?.archivedAt).toBeInstanceOf(Date);
  });
});

describe('the template editor', () => {
  test('builds a workout through the picker and Save puts it on the tab', async () => {
    const { routine } = seedRoutine('Push', []);
    const app = await launch();
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'New workout in Push' }));
    expect(app.getPathname()).toBe('/edit-workout');
    expect(screen.getByRole('header', { name: 'New Workout' })).toBeOnTheScreen();
    expect(screen.getByText('Add your first exercise')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Workout name'), 'Shooting day');

    await pickExercise(user, 'Free Throws', 'attempts');
    expect(app.getPathname()).toBe('/edit-workout');
    expect(screen.getByText('Fixed attempts · log makes')).toBeOnTheScreen();
    const target = screen.getByLabelText('Set 1 attempts');
    expect(target).toHaveDisplayValue('10');
    await fireEvent(target, 'focus');
    await fireEvent.changeText(target, '2');
    await fireEvent.changeText(target, '20');
    await fireEvent(target, 'blur');
    await user.press(screen.getByRole('button', { name: 'Add Set' }));
    expect(screen.getByLabelText('Set 2 attempts')).toHaveDisplayValue('20');

    await pickExercise(user, 'Figure 8');
    expect(screen.getByText('Check when done')).toBeOnTheScreen();
    // nothing is written before Save
    expect(listWorkouts(db, routine.id)).toEqual([]);

    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(app.getPathname()).toBe('/');
    expect(alertSpy).not.toHaveBeenCalled();
    const [saved] = listWorkouts(db, routine.id);
    expect(saved.name).toBe('Shooting day');
    expect(template(saved.id).exercises.map((e) => e.exercise.name)).toEqual([
      'Free Throws',
      'Figure 8',
    ]);
    expect(targets(saved.id)).toEqual([[20, 20], [null]]);
    expect(screen.getByText('Shooting day')).toBeOnTheScreen();
    expect(screen.getByText('Free Throws, Figure 8')).toBeOnTheScreen();
  });

  test('Save with no name or no exercise shows the reason and writes nothing', async () => {
    const { routine } = seedRoutine('Push', []);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'New workout in Push' }));

    await user.type(screen.getByLabelText('Workout name'), 'Only a name');
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(lastAlert()).toMatchObject({
      title: "Couldn't save workout",
      message: 'Add at least one exercise.',
    });

    await user.clear(screen.getByLabelText('Workout name'));
    await pickExercise(user, 'Figure 8');
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(lastAlert().message).toBe("The name can't be empty.");

    expect(app.getPathname()).toBe('/edit-workout');
    expect(listWorkouts(db, routine.id)).toEqual([]);
  });

  test('editing and saving goes back with no "Discard changes?"', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    const app = await launch();
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));
    expect(app.getPathname()).toBe('/edit-workout');
    expect(screen.getByRole('header', { name: 'Edit Workout' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Workout name')).toHaveDisplayValue('Shooting day');
    await user.press(screen.getAllByRole('button', { name: 'Add Set' })[0]);
    expect(screen.getByLabelText('Set 3 attempts')).toHaveDisplayValue('10');

    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(app.getPathname()).toBe('/');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(targets(workout.id)).toEqual([[10, 10, 10], [null]]);
  });

  test('Save with no changes goes back without writing', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    const before = getWorkout(db, workout.id)!;
    const templateBefore = template(workout.id);
    const app = await launch();
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(app.getPathname()).toBe('/');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(getWorkout(db, workout.id)).toEqual(before);
    expect(template(workout.id)).toEqual(templateBefore);
  });

  test('Cancel with no changes leaves without asking', async () => {
    seedRoutine();
    const app = await launch();
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));
    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(app.getPathname()).toBe('/');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('Cancel with unsaved changes asks first; Keep editing stays, Discard drops them', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    const templateBefore = template(workout.id);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));
    await user.press(screen.getAllByRole('button', { name: 'Add Set' })[0]);

    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(lastAlert().title).toBe('Discard changes?');
    await pressAlert('Keep editing');
    expect(app.getPathname()).toBe('/edit-workout');

    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    await pressAlert('Discard');

    expect(app.getPathname()).toBe('/');
    expect(template(workout.id)).toEqual(templateBefore);
  });

  test('the Android back button is guarded the same way', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    const templateBefore = template(workout.id);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));
    await user.type(screen.getByLabelText('Workout name'), ' 2');

    await act(async () => router.back());
    expect(lastAlert().title).toBe('Discard changes?');
    expect(app.getPathname()).toBe('/edit-workout');
    await pressAlert('Discard');

    expect(app.getPathname()).toBe('/');
    expect(template(workout.id)).toEqual(templateBefore);
    expect(getWorkout(db, workout.id)!.name).toBe('Shooting day');
  });

  test('Cancel with a target cell left invalid and focused throws nothing', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    const templateBefore = template(workout.id);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));

    const target = screen.getByLabelText('Set 1 attempts');
    await fireEvent(target, 'focus');
    await fireEvent.changeText(target, '5');
    await fireEvent.changeText(target, '0');
    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    await pressAlert('Discard');

    expect(app.getPathname()).toBe('/');
    expect(template(workout.id)).toEqual(templateBefore);
  });

  test('exercises can be moved and removed after confirming, and Save keeps that order', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));

    await user.press(screen.getByRole('button', { name: 'Figure 8 menu' }));
    await user.press(screen.getByRole('button', { name: 'Move up' }));
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(template(workout.id).exercises.map((e) => e.exercise.name)).toEqual([
      'Figure 8',
      'Free Throws',
    ]);

    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));
    await user.press(screen.getByRole('button', { name: 'Figure 8 menu' }));
    await user.press(screen.getByRole('button', { name: 'Remove exercise' }));
    expect(lastAlert().title).toBe('Remove exercise?');
    await pressAlert('Remove');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(template(workout.id).exercises.map((e) => e.exercise.name)).toEqual(['Free Throws']);
  });

  test('a set is deleted by its accessibility action, and the last one stays', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));

    await fireEvent(screen.getAllByTestId('set-1')[0], 'accessibilityAction', {
      nativeEvent: { actionName: 'delete' },
    });
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(targets(workout.id)).toEqual([[10], [null]]);
  });

  test('a stale link shows "Workout not found"', async () => {
    const app = await launch();
    await act(async () => router.push('/edit-workout?workoutId=999'));

    expect(screen.getByText('Workout not found')).toBeOnTheScreen();
    await act(async () => router.back());
    expect(app.getPathname()).toBe('/');
  });
});

describe('starting from a template', () => {
  test('Start opens the active workout with the template name, exercises and targets', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    const app = await launch();
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));

    expect(app.getPathname()).toBe('/active-workout');
    expect(screen.getByRole('header', { name: 'Shooting day' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Set 1 attempts')).toHaveDisplayValue('10');
    expect(screen.getByLabelText('Set 2 attempts')).toHaveDisplayValue('10');
    expect(screen.getByText('Figure 8')).toBeOnTheScreen();
    expect(getInProgressSession(db)).toMatchObject({ workoutId: workout.id });
  });

  test('finishing with no structural change asks nothing', async () => {
    seedRoutine();
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));

    const makes = screen.getByLabelText('Set 1 makes');
    await user.clear(makes);
    await user.type(makes, '7');
    await user.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
    await user.press(screen.getByRole('button', { name: 'Finish' }));
    await pressAlert('Finish');

    expect(app.getPathname()).toMatch(/^\/workout-summary\/\d+$/);
    expect(alertSpy.mock.calls.map(([title]) => title)).toEqual(['Finish workout?']);
  });

  async function startAndChange(user: ReturnType<typeof setupUser>) {
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));
    const target = screen.getByLabelText('Set 1 attempts');
    await fireEvent(target, 'focus');
    await fireEvent.changeText(target, '15');
    await fireEvent(target, 'blur');
    await user.press(screen.getAllByRole('button', { name: 'Add Set' })[0]);
    const makes = screen.getByLabelText('Set 1 makes');
    await user.clear(makes);
    await user.type(makes, '7');
    await user.press(screen.getByRole('button', { name: 'Finish' }));
    await pressAlert('Finish');
  }

  test('a changed structure is offered at Finish, behind the summary; Keep template leaves it', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    const templateBefore = template(workout.id);
    const app = await launch();
    const user = setupUser();

    await startAndChange(user);

    expect(app.getPathname()).toMatch(/^\/workout-summary\/\d+$/);
    expect(lastAlert().title).toBe('Update "Shooting day"?');
    expect(lastAlert().buttons.map((b) => b.text)).toEqual(['Keep template', 'Update template']);
    await pressAlert('Keep template');

    expect(template(workout.id)).toEqual(templateBefore);
  });

  test('Update template copies the structure, not the logged values', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    const app = await launch();
    const user = setupUser();

    await startAndChange(user);
    expect(lastAlert().title).toBe('Update "Shooting day"?');
    await pressAlert('Update template');

    expect(targets(workout.id)).toEqual([[15, 10, 10], [null]]);
    await user.press(screen.getByRole('button', { name: 'Done' }));
    expect(app.getPathname()).toBe('/');

    // the next Start reflects the choice, with nothing logged
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));
    expect(screen.getByLabelText('Set 3 attempts')).toHaveDisplayValue('10');
    expect(screen.getByLabelText('Set 1 makes')).toHaveDisplayValue('');
  });

  test('with a workout in progress, Start asks: Resume opens it, Cancel does nothing', async () => {
    seedRoutine('Push', ['First', 'Second']);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start First' }));
    const running = getInProgressSession(db)!;
    await user.press(screen.getByRole('button', { name: 'Minimize' }));

    await user.press(screen.getByRole('button', { name: 'Start Second' }));
    expect(lastAlert().title).toBe('Workout in progress');
    expect(lastAlert().buttons.map((b) => b.text)).toEqual([
      'Cancel',
      'Resume',
      'Discard and start',
    ]);
    await pressAlert('Cancel');
    expect(app.getPathname()).toBe('/');

    await pressAlert('Resume');

    expect(app.getPathname()).toBe('/active-workout');
    expect(getInProgressSession(db)!.id).toBe(running.id);
    expect(screen.getByRole('header', { name: 'First' })).toBeOnTheScreen();
  });

  test('"Discard and start" replaces the running workout', async () => {
    const {
      workouts: [first, second],
    } = seedRoutine('Push', ['First', 'Second']);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start First' }));
    const old = getInProgressSession(db)!;
    await user.press(screen.getByRole('button', { name: 'Minimize' }));

    await user.press(screen.getByRole('button', { name: 'Start Second' }));
    await pressAlert('Discard and start');

    expect(app.getPathname()).toBe('/active-workout');
    const current = getInProgressSession(db)!;
    expect(current.id).not.toBe(old.id);
    expect(current.workoutId).toBe(second.id);
    expect(getSessionDetail(db, old.id)).toBeUndefined();
    expect(screen.getByRole('header', { name: 'Second' })).toBeOnTheScreen();
    expect(first.id).not.toBe(second.id);
  });

  test('deleting the workout while its session runs: Finish works and asks nothing more', async () => {
    const {
      workouts: [workout],
    } = seedRoutine();
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));
    await user.press(screen.getByRole('button', { name: 'Minimize' }));

    await user.press(screen.getByRole('button', { name: 'Shooting day menu' }));
    await user.press(screen.getByRole('button', { name: 'Delete' }));
    await pressAlert('Delete');
    expect(getWorkout(db, workout.id)!.archivedAt).toBeInstanceOf(Date);

    await user.press(screen.getByRole('button', { name: 'Resume Workout' }));
    await user.press(screen.getAllByRole('button', { name: 'Add Set' })[0]);
    const makes = screen.getByLabelText('Set 1 makes');
    await user.clear(makes);
    await user.type(makes, '7');
    await user.press(screen.getByRole('button', { name: 'Finish' }));
    await pressAlert('Finish');

    expect(app.getPathname()).toMatch(/^\/workout-summary\/\d+$/);
    expect(alertSpy.mock.calls.map(([title]) => title)).toEqual([
      'Delete "Shooting day"?',
      'Finish workout?',
    ]);
  });
});
