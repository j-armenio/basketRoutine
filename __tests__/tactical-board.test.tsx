import { exercises, routines, sessions, workouts } from '@/db/schema';
import { createRoutine } from '@/db/repositories/routines';
import { getInProgressSession, getSessionDetail } from '@/db/repositories/sessions';
import { getWorkoutWithExercises, saveWorkout } from '@/db/repositories/workouts';
import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import type { Db } from '@/db/types';
import type { TacticalBoard } from '@/domain/tacticalBoard';
import { notifyDataChanged } from '@/features/dataStore';
import { closeDraft } from '@/features/routines/draftStore';
import { pointFromView, viewFromPoint } from '@/features/tacticalBoard/courtGeometry';
import { spacing } from '@/theme/spacing';
import { expectAccessibleControls } from '@/test-utils/a11y';
import { act, cleanup, screen, userEvent } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

// Same setup as the other flow tests: a real in-memory DB with the real migrations, seeded like
// at startup, and no expo-sqlite migration hook.
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
type User = ReturnType<typeof setupUser>;

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
  await rendered;
  return { getPathname: () => rendered.getPathname() };
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

/** A routine with one workout, Free Throws then Figure 8, straight through the repositories. */
function seedWorkout(board: TacticalBoard | null = null) {
  const routine = createRoutine(db, 'Push');
  const workout = saveWorkout(db, {
    routineId: routine.id,
    name: 'Shooting day',
    exercises: [
      {
        exerciseId: exerciseId('free_throws'),
        targetMode: 'attempts',
        targetValues: [10],
        tacticalBoard: board,
      },
      { exerciseId: exerciseId('figure_8'), targetMode: null, targetValues: [null] },
    ],
  });
  notifyDataChanged();
  return workout;
}

const templateBoards = (workoutId: number) =>
  getWorkoutWithExercises(db, workoutId)!.exercises.map((e) => e.tacticalBoard);
const sessionBoards = () =>
  getSessionDetail(db, getInProgressSession(db)!.id)!.exercises.map((e) => e.tacticalBoard);

/**
 * The editor's canvas never gets a real `onLayout` in the test renderer, so it always falls back
 * to the window's width (mocked at 750) minus its own side margin — the same width the app itself
 * would use in that case.
 */
const CANVAS_WIDTH = 750 - 2 * spacing.sm;
/** A normalized point, converted to where it sits on the canvas in dp, to touch it precisely. */
const at = (point: [number, number]) => viewFromPoint(point, CANVAS_WIDTH);
/** The dp point's normalized position, as the app itself would read the same touch. */
const normalized = (x: number, y: number) => pointFromView(x, y, CANVAS_WIDTH);

/** One finger on the court: lands on the first point (dp), moves through the rest, lifts. */
async function drag(points: [number, number][]) {
  const [first, ...rest] = points;
  await act(async () => {
    fireGestureHandler(getByGestureTestId('board-canvas'), [
      { state: State.BEGAN, x: first[0], y: first[1] },
      { state: State.ACTIVE, x: first[0], y: first[1] },
      ...rest.map(([x, y]) => ({ state: State.ACTIVE, x, y })),
      { state: State.END, x: rest.at(-1)?.[0] ?? first[0], y: rest.at(-1)?.[1] ?? first[1] },
    ]);
  });
}

const tap = (x: number, y: number) => drag([[x, y]]);

const canvas = () => screen.getByTestId('board-canvas');

async function pickTool(user: User, name: 'Hand' | 'X mark' | 'Arrow' | 'Pen' | 'Eraser') {
  await user.press(screen.getByRole('radio', { name }));
  expect(screen.getByRole('radio', { name })).toBeSelected();
}

const addButton = (name: string) =>
  screen.getByRole('button', { name: `Add tactical board for ${name}` });

const board: TacticalBoard = {
  version: 1,
  elements: [
    { type: 'x', at: [0.3, 0.3] },
    { type: 'arrow', from: [0.3, 0.3], to: [0.6, 0.1] },
  ],
};

describe('in the active workout', () => {
  test('the header icon opens the editor; Save is off until something is drawn', async () => {
    seedWorkout();
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));
    expect(addButton('Free Throws')).toBeOnTheScreen();
    expect(addButton('Figure 8')).toBeOnTheScreen();

    await user.press(addButton('Free Throws'));
    expect(app.getPathname()).toBe('/tactical-board');
    expect(screen.getByRole('header', { name: 'Tactical board' })).toBeOnTheScreen();
    expect(screen.getByText('Free Throws')).toBeOnTheScreen();
    expect(canvas()).toHaveAccessibleName('Empty tactical board');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear board' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expectAccessibleControls();

    // X is the tool it opens with: a tap places one
    expect(screen.getByRole('radio', { name: 'X mark' })).toBeSelected();
    await tap(100, 100);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    // an arrow too short to be meant is dropped, a real one stays
    await pickTool(user, 'Arrow');
    await drag([
      [100, 100],
      [103, 102],
    ]);
    await drag([
      [100, 100],
      [150, 60],
      [200, 40],
    ]);
    // a freehand line, drawn with many points, is simplified
    await pickTool(user, 'Pen');
    const zigzag = Array.from({ length: 60 }, (_, i): [number, number] => [
      60 + i * 4,
      300 + (i % 20 < 10 ? i % 10 : 10 - (i % 10)) * 8,
    ]);
    await drag(zigzag);
    expect(canvas()).toHaveAccessibleName('Tactical board: 1 X mark, 1 arrow, 1 line');

    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(app.getPathname()).toBe('/active-workout');
    expect(alertSpy).not.toHaveBeenCalled();
    const [saved, none] = sessionBoards();
    expect(none).toBeNull();
    expect(saved!.elements.map((e) => e.type)).toEqual(['x', 'arrow', 'pen']);
    const pen = saved!.elements[2];
    expect(pen.type === 'pen' && pen.points.length).toBeLessThan(zigzag.length);
    expect(pen.type === 'pen' && pen.points.length).toBeGreaterThan(2);
    const thumbnail = screen.getByRole('button', { name: 'Open tactical board for Free Throws' });
    expect(thumbnail.props.accessibilityHint).toBe('Tactical board: 1 X mark, 1 arrow, 1 line');
    expect(addButton('Figure 8')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Add tactical board for Free Throws' })).toBeNull();
    expectAccessibleControls();
  });

  test('the Hand tool moves an element and curves a selected arrow', async () => {
    seedWorkout();
    await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));
    await user.press(addButton('Free Throws'));

    await pickTool(user, 'Arrow');
    await drag([
      [100, 300],
      [300, 300],
    ]);
    await pickTool(user, 'Hand');

    // dragging anywhere on the arrow's line moves the whole thing by the same amount
    await drag([
      [150, 300],
      [170, 300],
    ]);
    expect(canvas()).toHaveAccessibleName('Tactical board: 1 arrow');

    // touching the (now shifted) middle selects it and shows the curve handle
    await tap(220, 300);
    expect(
      screen.getAllByTestId('board-arrow-handle', { includeHiddenElements: true }),
    ).toHaveLength(1);

    // dragging the handle bends the arrow through that point
    await drag([
      [220, 300],
      [220, 200],
    ]);
    await user.press(screen.getByRole('button', { name: 'Save' }));

    const arrow = sessionBoards()[0]!.elements[0];
    expect(arrow).toEqual({
      type: 'arrow',
      from: normalized(120, 300),
      to: normalized(320, 300),
      via: normalized(220, 200),
    });
  });

  test('the Eraser removes whatever it touches, as one undo step', async () => {
    seedWorkout();
    await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));
    await user.press(addButton('Free Throws'));

    await tap(100, 100);
    await drag([
      [280, 280],
      [280, 280],
    ]);
    expect(canvas()).toHaveAccessibleName('Tactical board: 2 X marks');

    await pickTool(user, 'Eraser');
    await tap(100, 100);
    expect(canvas()).toHaveAccessibleName('Tactical board: 1 X mark');

    await user.press(screen.getByRole('button', { name: 'Undo' }));
    expect(canvas()).toHaveAccessibleName('Tactical board: 2 X marks');
  });

  test('reopening shows the saved board; erasing and Cancel ask before dropping the change', async () => {
    seedWorkout(board);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));

    await user.press(screen.getByRole('button', { name: 'Open tactical board for Free Throws' }));
    expect(canvas()).toHaveAccessibleName('Tactical board: 1 X mark, 1 arrow');

    await pickTool(user, 'Eraser');
    // the arrow's far end, away from the X mark it shares a start point with
    const [x, y] = at([0.6, 0.1]);
    await tap(x, y);
    expect(canvas()).toHaveAccessibleName('Tactical board: 1 X mark');

    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(lastAlert().title).toBe('Discard changes?');
    await pressAlert('Keep editing');
    expect(app.getPathname()).toBe('/tactical-board');
    expect(canvas()).toHaveAccessibleName('Tactical board: 1 X mark');

    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    await pressAlert('Discard');

    expect(app.getPathname()).toBe('/active-workout');
    expect(sessionBoards()).toEqual([board, null]);
  });

  test('Cancel with no change leaves without asking; the back button is guarded', async () => {
    seedWorkout(board);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));

    await user.press(screen.getByRole('button', { name: 'Open tactical board for Free Throws' }));
    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(app.getPathname()).toBe('/active-workout');
    expect(alertSpy).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Open tactical board for Free Throws' }));
    await tap(50, 50);
    await act(async () => router.back());
    expect(lastAlert().title).toBe('Discard changes?');
    expect(app.getPathname()).toBe('/tactical-board');
    await pressAlert('Discard');

    expect(app.getPathname()).toBe('/active-workout');
    expect(sessionBoards()).toEqual([board, null]);
  });

  test('Clear asks first and disables Save: the board is never left empty', async () => {
    seedWorkout(board);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));
    await user.press(screen.getByRole('button', { name: 'Open tactical board for Free Throws' }));

    await user.press(screen.getByRole('button', { name: 'Clear board' }));
    expect(lastAlert().title).toBe('Clear the board?');
    await pressAlert('Cancel');
    expect(canvas()).toHaveAccessibleName('Tactical board: 1 X mark, 1 arrow');
    await user.press(screen.getByRole('button', { name: 'Clear board' }));
    await pressAlert('Clear');
    expect(canvas()).toHaveAccessibleName('Empty tactical board');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    await pressAlert('Discard');

    expect(app.getPathname()).toBe('/active-workout');
    expect(sessionBoards()).toEqual([board, null]);
  });

  test('the menu removes the board after confirming, only when there is one', async () => {
    seedWorkout(board);
    await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));

    await user.press(screen.getByRole('button', { name: 'Figure 8 menu' }));
    expect(screen.queryByRole('button', { name: 'Remove tactical board' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    await user.press(screen.getByRole('button', { name: 'Free Throws menu' }));
    expectAccessibleControls();
    await user.press(screen.getByRole('button', { name: 'Remove tactical board' }));
    expect(lastAlert().title).toBe('Remove tactical board?');
    expect(sessionBoards()).toEqual([board, null]);
    await pressAlert('Remove');

    expect(sessionBoards()).toEqual([null, null]);
    expect(addButton('Free Throws')).toBeOnTheScreen();
  });

  test('a stale link shows "Board not found"', async () => {
    const app = await launch();
    const user = setupUser();
    await act(async () => router.push('/tactical-board?sessionExerciseId=999'));

    expect(screen.getByText('Board not found')).toBeOnTheScreen();
    expectAccessibleControls();
    await user.press(screen.getByRole('button', { name: 'Go back' }));
    expect(app.getPathname()).toBe('/');
  });
});

describe('in the template editor', () => {
  test('the board joins the draft, and only the workout Save writes it', async () => {
    const workout = seedWorkout();
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));

    await user.press(addButton('Figure 8'));
    expect(app.getPathname()).toBe('/tactical-board');
    expect(screen.getByText('Figure 8')).toBeOnTheScreen();
    expectAccessibleControls();
    await tap(120, 80);
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(app.getPathname()).toBe('/edit-workout');
    expect(
      screen.getByRole('button', { name: 'Open tactical board for Figure 8' }).props
        .accessibilityHint,
    ).toBe('Tactical board: 1 X mark');
    expect(templateBoards(workout.id)).toEqual([null, null]);

    // the draft is dirty now: Cancel would ask
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(app.getPathname()).toBe('/');
    const [none, saved] = templateBoards(workout.id);
    expect(none).toBeNull();
    expect(saved!.elements.map((e) => e.type)).toEqual(['x']);
  });

  test('removing the board from the menu is a change to the draft', async () => {
    const workout = seedWorkout(board);
    await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Edit Shooting day' }));

    await user.press(screen.getByRole('button', { name: 'Free Throws menu' }));
    await user.press(screen.getByRole('button', { name: 'Remove tactical board' }));
    await pressAlert('Remove');
    expect(addButton('Free Throws')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(lastAlert().title).toBe('Discard changes?');
    await pressAlert('Keep editing');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(templateBoards(workout.id)).toEqual([null, null]);
  });
});

describe('from the template to History', () => {
  test('Start copies the board; a board edited in the workout is offered back at Finish', async () => {
    const workout = seedWorkout(board);
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Shooting day' }));
    expect(sessionBoards()).toEqual([board, null]);
    expect(
      screen.getByRole('button', { name: 'Open tactical board for Free Throws' }),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Open tactical board for Free Throws' }));
    await tap(200, 200);
    await user.press(screen.getByRole('button', { name: 'Save' }));
    // the session changed, the template didn't
    expect(templateBoards(workout.id)).toEqual([board, null]);

    await user.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
    await user.press(screen.getByRole('button', { name: 'Finish Workout' }));
    await pressAlert('Finish');

    expect(lastAlert().title).toBe('Update "Shooting day"?');
    expect(lastAlert().message).toContain('tactical boards');
    await pressAlert('Update template');
    const [updated] = templateBoards(workout.id);
    expect(updated!.elements.map((e) => e.type)).toEqual(['x', 'arrow', 'x']);

    // the History detail shows the session's board, read only
    const summaryPath = app.getPathname();
    const sessionId = summaryPath.split('/').at(-1);
    await act(async () => router.push(`/session/${sessionId}`));
    expect(
      screen.getByRole('image', { name: 'Tactical board: 2 X marks, 1 arrow' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Open tactical board/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add tactical board/ })).toBeNull();
    expectAccessibleControls();
  });
});
