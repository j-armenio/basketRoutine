import {
  archiveCustomExercise,
  createCustomExercise,
  getExercise,
} from '@/db/repositories/exercises';
import { createRoutine } from '@/db/repositories/routines';
import {
  addSessionExercise,
  addSessionSet,
  finishSession,
  getInProgressSession,
  getSessionDetail,
  startSessionFromWorkout,
  updateSessionSet,
} from '@/db/repositories/sessions';
import { getWorkoutWithExercises, saveWorkout } from '@/db/repositories/workouts';
import { exercises, routines, sessions, workouts } from '@/db/schema';
import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import type { Db, Exercise } from '@/db/types';
import { notifyDataChanged } from '@/features/dataStore';
import { colors } from '@/theme/colors';
import { act, cleanup, fireEvent, screen, userEvent, within } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { renderRouter } from 'expo-router/testing-library';
import { expectAccessibleControls } from '@/test-utils/a11y';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Alert } from 'react-native';

// Same setup as history.test.tsx: a real in-memory DB with the real migrations, seeded like at
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
type User = ReturnType<typeof setupUser>;

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
  db.delete(exercises).where(eq(exercises.isCustom, true)).run();
  files.clear();
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

const seeded = (seedKey: string) =>
  db.select().from(exercises).where(eq(exercises.seedKey, seedKey)).get()!;
const exerciseId = (seedKey: string) => seeded(seedKey).id;
const customByName = (name: string) =>
  db.select().from(exercises).where(eq(exercises.name, name)).get();

function makeCustom(overrides: Partial<Parameters<typeof createCustomExercise>[1]> = {}) {
  const created = createCustomExercise(db, {
    name: 'Deep Threes',
    category: 'shooting',
    trackingType: 'makes_attempts',
    ...overrides,
  });
  notifyDataChanged();
  return created;
}

/** A template of `Free Throws` and/or the custom exercise, straight through the repositories. */
function makeTemplate(name: string, custom: Exercise, withFreeThrows: boolean) {
  const routine = createRoutine(db, `Routine of ${name}`);
  const item = (exercise: Exercise) =>
    exercise.trackingType === 'check'
      ? { exerciseId: exercise.id, targetMode: null, targetValues: [null] }
      : { exerciseId: exercise.id, targetMode: 'attempts' as const, targetValues: [8] };
  const workout = saveWorkout(db, {
    routineId: routine.id,
    name,
    exercises: [...(withFreeThrows ? [item(seeded('free_throws'))] : []), item(custom)],
  });
  notifyDataChanged();
  return workout;
}

/** A finished session with the exercise, made before it is renamed or deleted. */
function makeFinishedSession(exercise: Exercise, name = 'Evening Workout') {
  const session = db
    .insert(sessions)
    .values({ name, status: 'in_progress', startedAt: new Date(2026, 8, 15, 10, 0) })
    .returning()
    .get();
  addSessionExercise(
    db,
    session.id,
    exercise.id,
    exercise.trackingType === 'check' ? null : 'attempts',
  );
  const [set] = getSessionDetail(db, session.id)!.exercises[0].sets;
  if (exercise.trackingType !== 'check') updateSessionSet(db, set.id, { loggedValue: 6 });
  finishSession(db, session.id);
  db.update(sessions)
    .set({ finishedAt: new Date(2026, 8, 15, 10, 30) })
    .where(eq(sessions.id, session.id))
    .run();
  notifyDataChanged();
  return session;
}

const tab = (name: string) => screen.getByRole('tab', { name });
const search = (user: User, text: string) =>
  user.type(screen.getByLabelText('Search exercises'), text);

async function openExercisesTab(user: User) {
  await user.press(tab('Exercises'));
}

/** From the Exercises tab: find the exercise by name and open its detail. */
async function openDetail(user: User, name: string) {
  await search(user, name);
  await user.press(screen.getByText(name));
}

async function pressMenu(user: User, option: string) {
  await user.press(screen.getByRole('button', { name: 'Exercise menu' }));
  expectAccessibleControls();
  await user.press(screen.getByRole('button', { name: option }));
}

// The app's media folder, as the mocked file system sees it (see jest.setup.js).
const files = (jest.requireMock('expo-file-system') as { __files: Set<string> }).__files;
const stored = (name: string) => `file:///docs/exercise-media/${name}`;

/** A custom exercise whose media file is already in the app's folder. */
function makeWithMedia(name: string, file: string) {
  files.add(stored(file));
  return makeCustom({ name, mediaUrl: stored(file) });
}

/** The next gallery pick returns this file (or is cancelled). */
function pickNext(
  asset: { uri: string; mimeType?: string; fileName?: string; duration?: number } | null,
) {
  jest
    .mocked(launchImageLibraryAsync)
    .mockResolvedValueOnce(
      (asset
        ? { canceled: false, assets: [{ width: 1, height: 1, ...asset }] }
        : { canceled: true, assets: null }) as Awaited<ReturnType<typeof launchImageLibraryAsync>>,
    );
}

// The placeholder and the video still are decorative (hidden from accessibility).
const HIDDEN = { includeHiddenElements: true };
/** The media block of the exercise detail or the form (the tab's rows may still be mounted below). */
const bigMedia = () => within(screen.getByTestId('exercise-media'));
const rowOf = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

/** The seeded catalog's exercises in a category (before any custom one is made). */
const seededIn = (category: Exercise['category']) =>
  db.select().from(exercises).where(eq(exercises.category, category)).all().length;
/** A category card, by its full name ("Shooting, 10 exercises") or its label alone ("Shooting"). */
const card = (name: string) =>
  screen.getByRole('button', { name: name.includes(', ') ? name : new RegExp(`^${name}, `) });

describe('the Exercises tab', () => {
  test('shows a card per category and one for Custom, each with its count', async () => {
    await launch();
    const user = setupUser();

    await openExercisesTab(user);

    expect(screen.getByRole('header', { name: 'Exercises' })).toBeOnTheScreen();
    expect(screen.getByText('38 exercises')).toBeOnTheScreen();
    for (const [label, category] of [
      ['Finishing', 'finishing'],
      ['Ball Handling', 'ball_handling'],
      ['Dribbling', 'dribbling'],
      ['Shooting', 'shooting'],
      ['Footwork', 'footwork'],
    ] as const) {
      expect(card(`${label}, ${seededIn(category)} exercises`)).toBeOnTheScreen();
    }
    expect(card('Custom, 0 exercises')).toBeOnTheScreen();
    // no image yet: every card shows the placeholder, and no row is listed
    expect(screen.getAllByTestId('category-placeholder', HIDDEN)).toHaveLength(6);
    expect(screen.queryByText('Free Throws')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expectAccessibleControls();
  });

  test('search swaps the cards for the matching exercises; clearing it brings them back', async () => {
    await launch();
    const user = setupUser();
    await openExercisesTab(user);

    await search(user, 'FREE');

    expect(screen.getByText('Free Throws')).toBeOnTheScreen();
    expect(screen.getByText('Makes / Attempts')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Shooting' })).toBeOnTheScreen();
    expect(screen.queryByText('Mikan Drill')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Shooting, / })).toBeNull();
    // the count is the catalog's, not the result's
    expect(screen.getByText('38 exercises')).toBeOnTheScreen();
    expectAccessibleControls();

    await user.clear(screen.getByLabelText('Search exercises'));
    await search(user, 'nothing like this');
    expect(screen.getByText('No exercises found')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Search exercises'));
    expect(card('Shooting')).toBeOnTheScreen();
    expect(screen.queryByText('No exercises found')).toBeNull();
  });

  test('a category card opens its exercises, and a row there its detail', async () => {
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);

    await user.press(card('Shooting'));

    expect(app.getPathname()).toBe('/category/shooting');
    // the title only: one category needs no section header
    expect(screen.getAllByRole('header', { name: 'Shooting' })).toHaveLength(1);
    expect(screen.getByText(`${seededIn('shooting')} exercises`)).toBeOnTheScreen();
    expect(screen.getByText('Free Throws')).toBeOnTheScreen();
    expect(screen.queryByText('Mikan Drill')).toBeNull();
    expectAccessibleControls();

    await user.press(screen.getByText('Free Throws'));
    expect(app.getPathname()).toBe(`/exercise/${exerciseId('free_throws')}`);

    await user.press(screen.getByRole('button', { name: 'Back' }));
    expect(app.getPathname()).toBe('/category/shooting');
    await user.press(screen.getByRole('button', { name: 'Back' }));
    expect(app.getPathname()).toBe('/exercises');
  });

  test('the Custom card lists only custom exercises, of every category, grouped', async () => {
    makeCustom({ name: 'My Threes', category: 'shooting' });
    makeCustom({ name: 'My Slalom', category: 'footwork', trackingType: 'check' });
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);

    expect(screen.getByText('40 exercises')).toBeOnTheScreen();
    await user.press(card('Custom, 2 exercises'));

    expect(app.getPathname()).toBe('/category/custom');
    expect(screen.getByRole('header', { name: 'Custom' })).toBeOnTheScreen();
    expect(screen.getByText('2 exercises')).toBeOnTheScreen();
    expect(screen.getByText('My Threes')).toBeOnTheScreen();
    expect(screen.getByText('My Slalom')).toBeOnTheScreen();
    expect(screen.queryByText('Free Throws')).toBeNull();
    expect(screen.getByRole('header', { name: 'Shooting' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Footwork' })).toBeOnTheScreen();
    expectAccessibleControls();
  });

  test('the Custom card with no custom exercise says so', async () => {
    await launch();
    const user = setupUser();
    await openExercisesTab(user);

    await user.press(card('Custom, 0 exercises'));

    expect(screen.getByText('No custom exercises yet')).toBeOnTheScreen();
    expect(
      screen.getByText('Create one with the + button on the Exercises tab.'),
    ).toBeOnTheScreen();
    expectAccessibleControls();
  });

  test('a custom exercise shows the Custom marker, and the counts follow a new one', async () => {
    makeCustom();
    await launch();
    const user = setupUser();

    await openExercisesTab(user);

    expect(screen.getByText('39 exercises')).toBeOnTheScreen();
    // the seeded ones plus the new one
    expect(card(`Shooting, ${seededIn('shooting')} exercises`)).toBeOnTheScreen();
    expect(card('Custom, 1 exercise')).toBeOnTheScreen();
    await search(user, 'deep');
    expect(screen.getByText('Makes / Attempts · Custom')).toBeOnTheScreen();
  });

  test('an unknown category shows "Category not found"', async () => {
    const app = await launch('/category/nope');

    expect(screen.getByText('Category not found')).toBeOnTheScreen();
    expectAccessibleControls();

    await setupUser().press(screen.getByRole('button', { name: 'Back to Exercises' }));
    expect(app.getPathname()).toBe('/exercises');
  });
});

describe('media in the list', () => {
  test('every row shows its thumbnail or the placeholder', async () => {
    makeWithMedia('Clip Gif', 'a.gif');
    makeWithMedia('Clip Video', 'b.mp4');
    makeCustom({ name: 'Clip Plain' });
    await launch();
    const user = setupUser();
    await openExercisesTab(user);
    await search(user, 'clip');

    // still: the GIF doesn't animate, the video shows its first frame
    expect(within(rowOf('Clip Gif')).getByTestId('media-image').props).toMatchObject({
      source: stored('a.gif'),
      autoplay: false,
    });
    expect(within(rowOf('Clip Video')).getByTestId('media-video-still', HIDDEN)).toBeOnTheScreen();
    expect(within(rowOf('Clip Plain')).getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();
    expect(rowOf('Clip Gif').props.accessibilityHint).toBe('Hold to play its media');
    expect(rowOf('Clip Plain').props.accessibilityHint).toBeUndefined();
  });

  test('holding a row plays its media in place until the finger lifts, and opens nothing', async () => {
    makeWithMedia('Clip Gif', 'a.gif');
    makeWithMedia('Clip Video', 'b.mp4');
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);
    await search(user, 'clip');

    await fireEvent(rowOf('Clip Gif'), 'longPress');
    expect(within(rowOf('Clip Gif')).getByTestId('media-image').props.autoplay).toBe(true);
    await fireEvent(rowOf('Clip Gif'), 'pressOut');
    expect(within(rowOf('Clip Gif')).getByTestId('media-image').props.autoplay).toBe(false);

    await fireEvent(rowOf('Clip Video'), 'longPress');
    expect(within(rowOf('Clip Video')).getByTestId('video-view').props.player).toMatchObject({
      muted: true,
      loop: true,
    });
    await fireEvent(rowOf('Clip Video'), 'pressOut');
    expect(within(rowOf('Clip Video')).queryByTestId('video-view')).toBeNull();

    await user.longPress(rowOf('Clip Video'));
    expect(app.getPathname()).toBe('/exercises');

    await user.press(rowOf('Clip Video'));
    expect(app.getPathname()).toMatch(/^\/exercise\/\d+$/);
  });

  test('the picker shows the thumbnails too', async () => {
    makeWithMedia('Gif Drill', 'a.gif');
    await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Empty Workout' }));
    await user.press(screen.getByRole('button', { name: 'Add Exercise' }));
    await search(user, 'gif');

    expect(within(rowOf('Gif Drill')).getByTestId('media-image')).toBeOnTheScreen();
  });
});

describe('the exercise detail', () => {
  test('a predefined exercise shows its description and the placeholder, and has no menu', async () => {
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);

    await openDetail(user, 'Free Throws');

    expect(app.getPathname()).toBe(`/exercise/${exerciseId('free_throws')}`);
    expect(screen.getByRole('header', { name: 'Free Throws' })).toBeOnTheScreen();
    expect(screen.getByText('Shooting · Makes / Attempts')).toBeOnTheScreen();
    expect(screen.getByText(seeded('free_throws').description)).toBeOnTheScreen();
    expect(screen.queryByText(/Predefined exercise/)).toBeNull();
    expect(bigMedia().getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Exercise menu' })).toBeNull();
    expectAccessibleControls();
  });

  test('a custom exercise with no description says so', async () => {
    const custom = makeCustom();
    await launch(`/exercise/${custom.id}`);

    expect(screen.getByRole('header', { name: 'Deep Threes' })).toBeOnTheScreen();
    expect(screen.getByText('No description.')).toBeOnTheScreen();
  });

  test('an unknown or deleted id shows "Exercise not found"', async () => {
    const gone = makeCustom({ name: 'Gone' });
    db.update(exercises).set({ archivedAt: new Date() }).where(eq(exercises.id, gone.id)).run();
    notifyDataChanged();

    await launch(`/exercise/${gone.id}`);
    expect(screen.getByText('Exercise not found')).toBeOnTheScreen();
    await cleanup();

    await launch('/exercise/9999');
    expect(screen.getByText('Exercise not found')).toBeOnTheScreen();
    expectAccessibleControls();
  });

  test('media plays large: an image, a GIF animating, a video with controls; none is the placeholder', async () => {
    const image = makeWithMedia('Image drill', 'a.jpg');
    const gif = makeWithMedia('Gif drill', 'b.gif');
    const video = makeWithMedia('Video drill', 'c.mp4');
    const plain = makeCustom({ name: 'Plain drill', description: 'Just words' });

    await launch(`/exercise/${image.id}`);
    expect(screen.getByTestId('media-image').props.source).toBe(stored('a.jpg'));
    await cleanup();

    await launch(`/exercise/${gif.id}`);
    expect(screen.getByTestId('media-image').props).toMatchObject({
      source: stored('b.gif'),
      autoplay: true,
    });
    await cleanup();

    await launch(`/exercise/${video.id}`);
    expect(screen.getByTestId('video-view').props).toMatchObject({ nativeControls: true });
    expect(screen.getByTestId('video-view').props.player.source).toBe(stored('c.mp4'));
    expectAccessibleControls();
    await cleanup();

    await launch(`/exercise/${plain.id}`);
    expect(screen.getByText('Just words')).toBeOnTheScreen();
    expect(screen.getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();
  });
});

describe('creating', () => {
  test('an empty name is refused with a message and the form stays', async () => {
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);
    await user.press(screen.getByRole('button', { name: 'New exercise' }));
    expect(app.getPathname()).toBe('/edit-exercise');
    expect(bigMedia().getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();
    expectAccessibleControls();

    await user.press(screen.getByRole('button', { name: 'Save Exercise' }));

    expect(screen.getByText("The name can't be empty.")).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/edit-exercise');
    await user.type(screen.getByLabelText('Exercise name'), 'Deep Threes');
    expect(screen.queryByText("The name can't be empty.")).toBeNull();
  });

  test('a video over 30 s or an unsupported file is refused at pick time; a cancelled pick changes nothing', async () => {
    await launch('/edit-exercise');
    const user = setupUser();

    pickNext({ uri: 'file:///cache/long', mimeType: 'video/mp4', duration: 31_000 });
    await user.press(screen.getByRole('button', { name: 'Choose media' }));
    expect(screen.getByText('Choose a video of 30 seconds or less.')).toBeOnTheScreen();
    expect(screen.getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();

    pickNext({ uri: 'file:///cache/photo', mimeType: 'image/heic', fileName: 'photo.heic' });
    await user.press(screen.getByRole('button', { name: 'Choose media' }));
    expect(screen.getByText(/This file type isn't supported/)).toBeOnTheScreen();

    pickNext(null);
    await user.press(screen.getByRole('button', { name: 'Choose media' }));
    expect(screen.getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove media' })).toBeNull();
  });

  test('a valid form is saved with everything, its media copied into the app, and lands on the list', async () => {
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);
    await user.press(screen.getByRole('button', { name: 'New exercise' }));

    await user.type(screen.getByLabelText('Exercise name'), '  Cone Slalom ');
    pickNext({ uri: 'file:///cache/picked/slalom', mimeType: 'video/mp4', duration: 12_000 });
    await user.press(screen.getByRole('button', { name: 'Choose media' }));
    // the picked video previews in the form; nothing is copied before Save
    expect(screen.getByTestId('video-view').props.player.source).toBe(
      'file:///cache/picked/slalom',
    );
    expect(files.size).toBe(0);
    await user.press(screen.getByRole('radio', { name: 'Footwork' }));
    await user.press(screen.getByRole('radio', { name: 'Check' }));
    await user.type(screen.getByLabelText('Description'), 'Weave through five cones');
    await user.press(screen.getByRole('button', { name: 'Save Exercise' }));

    expect(app.getPathname()).toBe('/exercises');
    const created = customByName('Cone Slalom')!;
    expect(created).toMatchObject({
      category: 'footwork',
      trackingType: 'check',
      description: 'Weave through five cones',
      isCustom: true,
    });
    expect(created.mediaUrl).toMatch(/^file:\/\/\/docs\/exercise-media\/.+\.mp4$/);
    expect([...files]).toEqual([created.mediaUrl]);
    expect(screen.getByText('39 exercises')).toBeOnTheScreen();
    await search(user, 'slalom');
    expect(screen.getByText('Check · Custom')).toBeOnTheScreen();
    expect(within(rowOf('Cone Slalom')).getByTestId('media-video-still', HIDDEN)).toBeOnTheScreen();
  });

  test('Cancel leaves without saving', async () => {
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);
    await user.press(screen.getByRole('button', { name: 'New exercise' }));
    await user.type(screen.getByLabelText('Exercise name'), 'Never saved');

    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(app.getPathname()).toBe('/exercises');
    expect(customByName('Never saved')).toBeUndefined();
  });
});

describe('editing', () => {
  test('changes name, category, description and media; the tracking type is locked', async () => {
    const custom = makeWithMedia('Deep Threes', 'old.gif');
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);
    await openDetail(user, 'Deep Threes');

    await pressMenu(user, 'Edit');

    expect(app.getPathname()).toBe('/edit-exercise');
    expect(screen.getByRole('header', { name: 'Edit Exercise' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Exercise name')).toHaveDisplayValue('Deep Threes');
    expect(screen.getByTestId('media-image').props.source).toBe(stored('old.gif'));
    expect(screen.getByRole('radio', { name: 'Makes / Attempts' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Check' })).toBeDisabled();
    expect(
      screen.getByText("Tracking type can't be changed after the exercise is created"),
    ).toBeOnTheScreen();
    expectAccessibleControls();

    await user.clear(screen.getByLabelText('Exercise name'));
    await user.type(screen.getByLabelText('Exercise name'), 'Logo Threes');
    await user.press(screen.getByRole('radio', { name: 'Finishing' }));
    await user.type(screen.getByLabelText('Description'), 'From the logo');
    pickNext({ uri: 'file:///cache/picked/new', mimeType: 'image/png' });
    await user.press(screen.getByRole('button', { name: 'Change media' }));
    await user.press(screen.getByRole('button', { name: 'Save Exercise' }));

    expect(app.getPathname()).toBe(`/exercise/${custom.id}`);
    expect(screen.getByRole('header', { name: 'Logo Threes' })).toBeOnTheScreen();
    expect(screen.getByText('Finishing · Makes / Attempts')).toBeOnTheScreen();
    expect(screen.getByText('From the logo')).toBeOnTheScreen();
    expectAccessibleControls();
    const edited = getExercise(db, custom.id)!;
    expect(edited).toMatchObject({
      name: 'Logo Threes',
      category: 'finishing',
      trackingType: 'makes_attempts',
      description: 'From the logo',
    });
    expect(edited.mediaUrl).toMatch(/\.png$/);
    expect(screen.getByTestId('media-image').props.source).toBe(edited.mediaUrl);
    // the old file is gone, the new one is there
    expect([...files]).toEqual([edited.mediaUrl]);
  });

  test('Remove media deletes the file and leaves the placeholder', async () => {
    const custom = makeWithMedia('Deep Threes', 'old.gif');
    await launch(`/edit-exercise?exerciseId=${custom.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'Remove media' }));
    expect(screen.getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Choose media' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save Exercise' }));

    expect(getExercise(db, custom.id)?.mediaUrl).toBeNull();
    expect(files.size).toBe(0);
  });

  test('a rejected edit shows the reason and changes nothing', async () => {
    const custom = makeCustom();
    await launch(`/edit-exercise?exerciseId=${custom.id}`);
    const user = setupUser();

    await user.clear(screen.getByLabelText('Exercise name'));
    await user.press(screen.getByRole('button', { name: 'Save Exercise' }));

    expect(screen.getByText("The name can't be empty.")).toBeOnTheScreen();
    expect(getExercise(db, custom.id)?.name).toBe('Deep Threes');
  });

  test('a predefined or unknown exercise cannot be edited', async () => {
    await launch(`/edit-exercise?exerciseId=${exerciseId('free_throws')}`);
    expect(screen.getByText('Exercise not found')).toBeOnTheScreen();
    await cleanup();

    await launch('/edit-exercise?exerciseId=9999');
    expect(screen.getByText('Exercise not found')).toBeOnTheScreen();
  });

  test('templates show the new name, and history keeps the one it was logged with', async () => {
    const custom = makeCustom();
    makeTemplate('Shooting day', custom, true);
    const session = makeFinishedSession(custom);
    await launch();
    const user = setupUser();

    await openExercisesTab(user);
    await openDetail(user, 'Deep Threes');
    await pressMenu(user, 'Edit');
    await user.clear(screen.getByLabelText('Exercise name'));
    await user.type(screen.getByLabelText('Exercise name'), 'Logo Threes');
    await user.press(screen.getByRole('button', { name: 'Save Exercise' }));
    await user.press(screen.getByRole('button', { name: 'Back' }));

    await user.press(tab('Workout'));
    expect(screen.getByText('Free Throws, Logo Threes')).toBeOnTheScreen();

    await user.press(tab('Profile'));
    await user.press(screen.getByRole('button', { name: /^Evening Workout, / }));
    expect(screen.getByText('Deep Threes')).toBeOnTheScreen();
    expect(screen.queryByText('Logo Threes')).toBeNull();
    expect(getSessionDetail(db, session.id)!.exercises[0].name).toBe('Deep Threes');
  });
});

describe('deleting', () => {
  test('Cancel changes nothing; Delete removes it from the list and the template, and history keeps it', async () => {
    const custom = makeWithMedia('Deep Threes', 'a.gif');
    const workout = makeTemplate('Shooting day', custom, true);
    const session = makeFinishedSession(custom);
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);
    await openDetail(user, 'Deep Threes');

    await pressMenu(user, 'Delete');

    expect(lastAlert().title).toBe('Delete "Deep Threes"?');
    expect(lastAlert().message).toBe('It will be removed from 1 workout. Your history stays.');
    expect(lastAlert().buttons.find((b) => b.text === 'Delete')?.style).toBe('destructive');
    await pressAlert('Cancel');
    expect(app.getPathname()).toBe(`/exercise/${custom.id}`);
    expect(getExercise(db, custom.id)?.archivedAt).toBeNull();
    expect(getWorkoutWithExercises(db, workout.id)!.exercises).toHaveLength(2);

    await pressMenu(user, 'Delete');
    await pressAlert('Delete');

    expect(app.getPathname()).toBe('/exercises');
    expect(screen.queryByText('Exercise not found')).toBeNull();
    expect(screen.getByText('38 exercises')).toBeOnTheScreen();
    expect(screen.queryByText('Deep Threes')).toBeNull();
    expect(getExercise(db, custom.id)?.archivedAt).toBeInstanceOf(Date);
    expect(getWorkoutWithExercises(db, workout.id)!.exercises.map((e) => e.exercise.name)).toEqual([
      'Free Throws',
    ]);
    expect(getSessionDetail(db, session.id)!.exercises[0]).toMatchObject({ name: 'Deep Threes' });

    await user.press(tab('Workout'));
    expect(screen.getByText('Free Throws')).toBeOnTheScreen();
    await user.press(tab('Profile'));
    await user.press(screen.getByRole('button', { name: /^Evening Workout, / }));
    expect(screen.getByText('Deep Threes')).toBeOnTheScreen();
  });

  test('a template left with nothing reads "No exercises"', async () => {
    const custom = makeCustom();
    makeTemplate('Solo', custom, false);
    await launch();
    const user = setupUser();
    expect(screen.getByText('Deep Threes')).toBeOnTheScreen();

    await user.press(tab('Exercises'));
    await openDetail(user, 'Deep Threes');
    await pressMenu(user, 'Delete');
    await pressAlert('Delete');
    await user.press(tab('Workout'));

    expect(screen.getByText('No exercises')).toBeOnTheScreen();
    expect(screen.queryByText('Deep Threes')).toBeNull();
  });

  test('an exercise no workout uses skips that sentence, and the picker stops listing it', async () => {
    const custom = makeCustom();
    await launch();
    const user = setupUser();
    await openExercisesTab(user);
    await openDetail(user, 'Deep Threes');

    await pressMenu(user, 'Delete');

    expect(lastAlert().message).toBe('Your history stays.');
    await pressAlert('Delete');
    expect(getExercise(db, custom.id)?.archivedAt).toBeInstanceOf(Date);

    await user.press(tab('Workout'));
    await user.press(screen.getByRole('button', { name: 'Start Empty Workout' }));
    await user.press(screen.getByRole('button', { name: 'Add Exercise' }));
    await search(user, 'Deep Threes');
    expect(screen.getByText('No exercises found')).toBeOnTheScreen();
  });

  test('an exercise deleted from elsewhere while its detail is open renders nothing, not "not found"', async () => {
    const custom = makeCustom();
    await launch(`/exercise/${custom.id}`);
    expect(screen.getByRole('header', { name: 'Deep Threes' })).toBeOnTheScreen();

    await act(async () => {
      db.update(exercises).set({ archivedAt: new Date() }).where(eq(exercises.id, custom.id)).run();
      notifyDataChanged();
    });

    expect(screen.queryByText('Exercise not found')).toBeNull();
    expect(screen.queryByRole('header', { name: 'Deep Threes' })).toBeNull();
  });
});

describe('the picker', () => {
  test('New exercise opens the form and comes back with it listed, not added', async () => {
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: 'Start Empty Workout' }));
    const session = getInProgressSession(db)!;
    await user.press(screen.getByRole('button', { name: 'Add Exercise' }));
    await search(user, 'Deep Threes');
    expect(screen.getByText('No exercises found')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'New exercise' }));
    expect(app.getPathname()).toBe('/edit-exercise');
    await user.type(screen.getByLabelText('Exercise name'), 'Deep Threes');
    await user.press(screen.getByRole('button', { name: 'Save Exercise' }));

    expect(app.getPathname()).toBe('/add-exercise');
    expect(screen.getByText('Deep Threes')).toBeOnTheScreen();
    expect(screen.getByText('Makes / Attempts · Custom')).toBeOnTheScreen();
    expect(getSessionDetail(db, session.id)!.exercises).toHaveLength(0);

    await user.press(screen.getByText('Deep Threes'));
    await user.press(screen.getByRole('button', { name: 'Fixed attempts — log makes' }));

    expect(app.getPathname()).toBe('/active-workout');
    expect(screen.getByText('Deep Threes')).toBeOnTheScreen();
    expect(getSessionDetail(db, session.id)!.exercises.map((e) => e.name)).toEqual(['Deep Threes']);
  });

  test('a new exercise also reaches a template being built', async () => {
    const routine = createRoutine(db, 'Push');
    notifyDataChanged();
    const app = await launch();
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: `New workout in ${routine.name}` }));
    await user.press(screen.getByRole('button', { name: 'Add Exercise' }));
    await search(user, 'Cone Slalom'); // the list is long: search keeps the new row on screen
    await user.press(screen.getByRole('button', { name: 'New exercise' }));
    await user.type(screen.getByLabelText('Exercise name'), 'Cone Slalom');
    await user.press(screen.getByRole('radio', { name: 'Check' }));
    await user.press(screen.getByRole('button', { name: 'Save Exercise' }));

    expect(app.getPathname()).toBe('/add-exercise');
    await user.press(screen.getByText('Cone Slalom'));

    expect(app.getPathname()).toBe('/edit-workout');
    expect(screen.getByText('Cone Slalom')).toBeOnTheScreen();
  });
});

describe('finishing after an exercise was deleted mid-session', () => {
  // Seeded before the app launches, so the Workout tab already lists the template.
  function seedMixed() {
    const custom = makeCustom({ name: 'Cone Slalom', category: 'footwork', trackingType: 'check' });
    return { custom, workout: makeTemplate('Mixed', custom, true) };
  }

  /** Starts the template, deletes the custom exercise meanwhile, and is back in the workout. */
  async function startAndDelete(user: User, custom: Exercise) {
    await user.press(screen.getByRole('button', { name: 'Start Mixed' }));
    await user.press(screen.getByRole('button', { name: 'Minimize' }));
    await act(async () => {
      archiveCustomExercise(db, custom.id); // the session keeps its snapshot
      notifyDataChanged();
    });
    await user.press(screen.getByRole('button', { name: 'Resume Workout' }));
    expect(screen.getByText('Cone Slalom')).toBeOnTheScreen();
  }

  test('asks nothing when that is the only difference', async () => {
    const { custom, workout } = seedMixed();
    const app = await launch();
    const user = setupUser();
    await startAndDelete(user, custom);
    const before = getWorkoutWithExercises(db, workout.id);

    const makes = screen.getByLabelText('Set 1 makes');
    await user.clear(makes);
    await user.type(makes, '7');
    await user.press(screen.getByRole('button', { name: 'Finish Workout' }));
    await pressAlert('Finish');

    expect(app.getPathname()).toMatch(/^\/workout-summary\/\d+$/);
    expect(alertSpy.mock.calls.map(([title]) => title)).toEqual(['Finish workout?']);
    expect(getWorkoutWithExercises(db, workout.id)).toEqual(before);
  });

  test('offers a real difference, and Update template copies the rest without it', async () => {
    const { custom, workout } = seedMixed();
    const app = await launch();
    const user = setupUser();
    await startAndDelete(user, custom);

    await user.press(screen.getAllByRole('button', { name: 'Add Set' })[0]);
    const makes = screen.getByLabelText('Set 1 makes');
    await user.clear(makes);
    await user.type(makes, '7');
    await user.press(screen.getByRole('button', { name: 'Finish Workout' }));
    await pressAlert('Finish');

    expect(app.getPathname()).toMatch(/^\/workout-summary\/\d+$/);
    expect(lastAlert().title).toBe('Update "Mixed"?');
    await pressAlert('Update template');

    const template = getWorkoutWithExercises(db, workout.id)!;
    expect(template.exercises.map((e) => e.exercise.name)).toEqual(['Free Throws']);
    expect(template.exercises[0].sets).toHaveLength(2);
    expect(alertSpy.mock.calls.map(([title]) => title)).toEqual([
      'Finish workout?',
      'Update "Mixed"?',
    ]);
  });
});

/** A finished session holding the exercise, on `day` of September, with these sets. */
function finishedWith(
  exercise: Exercise,
  day: number,
  sets: { logged?: number; done?: boolean }[],
) {
  const session = db
    .insert(sessions)
    .values({ name: 'Practice', status: 'in_progress', startedAt: new Date(2026, 8, day, 10, 0) })
    .returning()
    .get();
  const drill = addSessionExercise(
    db,
    session.id,
    exercise.id,
    exercise.trackingType === 'check' ? null : 'attempts',
  );
  sets.forEach((set, index) => {
    const row =
      getSessionDetail(db, session.id)!.exercises[0].sets[index] ?? addSessionSet(db, drill.id);
    updateSessionSet(db, row.id, {
      ...(set.logged === undefined ? {} : { loggedValue: set.logged }),
      ...(set.done === undefined ? {} : { completed: set.done }),
    });
  });
  finishSession(db, session.id);
  notifyDataChanged();
}

describe('your stats', () => {
  test('an exercise never logged says so', async () => {
    await launch(`/exercise/${exerciseId('free_throws')}`);

    expect(screen.getByRole('header', { name: 'Your stats' })).toBeOnTheScreen();
    expect(screen.getByText('No sessions yet.')).toBeOnTheScreen();
  });

  test('a shooting drill: best session, the overall FG%, the count and the recent sessions', async () => {
    // 10 attempts per set (the default), makes logged
    finishedWith(seeded('free_throws'), 20, [{ logged: 7 }]); // 70%
    finishedWith(seeded('free_throws'), 25, [{ logged: 3 }]); // 30%
    finishedWith(seeded('mikan_drill'), 26, [{ logged: 1 }]); // another exercise: left out
    await launch(`/exercise/${exerciseId('free_throws')}`);

    expect(screen.getByText('Best FG%')).toBeOnTheScreen();
    expect(screen.getAllByText('70%')[0]).toHaveStyle({ color: colors.success });
    expect(screen.getByText('Average')).toBeOnTheScreen();
    // Σmakes / Σattempts = 10 / 20
    expect(screen.getByText('50%')).toHaveStyle({ color: colors.neutralStat });
    expect(screen.getByText('Sessions')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    // newest first
    expect(screen.getAllByText(/^(Fri|Sun), Sep \d+$/).map((node) => node.props.children)).toEqual([
      'Fri, Sep 25',
      'Sun, Sep 20',
    ]);
    expect(screen.getByText('3 / 10')).toBeOnTheScreen();
    expect(screen.getByText('30%')).toHaveStyle({ color: colors.error });
    expectAccessibleControls();
  });

  test('a check drill: the sessions and the done sets', async () => {
    finishedWith(seeded('figure_8'), 20, [{ done: true }, { done: false }]);
    await launch(`/exercise/${exerciseId('figure_8')}`);

    expect(screen.getByText('Done')).toBeOnTheScreen();
    expect(screen.getByText('1 / 2')).toBeOnTheScreen();
    expect(screen.getByText('1 / 2 done')).toBeOnTheScreen();
    expect(screen.queryByText('Best FG%')).toBeNull();
  });
});

describe('Add to Routine', () => {
  const addToRoutine = () => screen.getByRole('button', { name: 'Add to Routine' });

  test('with no routine, the chooser says so', async () => {
    const app = await launch(`/exercise/${exerciseId('free_throws')}`);
    const user = setupUser();

    await user.press(addToRoutine());

    expect(app.getPathname()).toBe('/add-to-routine');
    expect(screen.getByText('No routines yet')).toBeOnTheScreen();
    expectAccessibleControls();
  });

  test('a shooting drill asks its mode, then lands in the editor with it added; Save keeps it', async () => {
    const morning = makeTemplate('Morning', seeded('figure_8'), false);
    const app = await launch(`/exercise/${exerciseId('free_throws')}`);
    const user = setupUser();

    await user.press(addToRoutine());
    expect(screen.getByRole('header', { name: 'Routine of Morning' })).toBeOnTheScreen();
    expectAccessibleControls();
    await user.press(screen.getByRole('button', { name: 'Add to Morning' }));
    expect(screen.getByText('Free Throws: what do you fix?')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Fixed makes — log attempts' }));

    expect(app.getPathname()).toBe('/edit-workout');
    expect(screen.getByRole('header', { name: 'Edit Workout' })).toBeOnTheScreen();
    expect(screen.getByText('Fixed makes · log attempts')).toBeOnTheScreen();
    // nothing is written until Save
    expect(getWorkoutWithExercises(db, morning.id)!.exercises).toHaveLength(1);

    await user.press(screen.getByRole('button', { name: 'Save' }));

    const saved = getWorkoutWithExercises(db, morning.id)!.exercises;
    expect(saved.map((item) => [item.exercise.seedKey, item.targetMode])).toEqual([
      ['figure_8', null],
      ['free_throws', 'makes'],
    ]);
    // back on the exercise, the chooser gone
    expect(app.getPathname()).toBe(`/exercise/${exerciseId('free_throws')}`);
  });

  test('Cancel in the editor asks first, and discarding leaves the template alone', async () => {
    const morning = makeTemplate('Morning', seeded('figure_8'), false);
    await launch(`/exercise/${exerciseId('free_throws')}`);
    const user = setupUser();

    await user.press(addToRoutine());
    await user.press(screen.getByRole('button', { name: 'Add to Morning' }));
    await user.press(screen.getByRole('button', { name: 'Fixed attempts — log makes' }));
    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(lastAlert().title).toBe('Discard changes?');
    await pressAlert('Discard');
    expect(getWorkoutWithExercises(db, morning.id)!.exercises).toHaveLength(1);
  });

  test('a check drill skips the mode, and New Workout starts a template with it', async () => {
    makeTemplate('Morning', seeded('free_throws'), false);
    const app = await launch(`/exercise/${exerciseId('figure_8')}`);
    const user = setupUser();

    await user.press(addToRoutine());
    await user.press(screen.getByRole('button', { name: 'New workout in Routine of Morning' }));

    expect(app.getPathname()).toBe('/edit-workout');
    expect(screen.getByRole('header', { name: 'New Workout' })).toBeOnTheScreen();
    expect(screen.getByText('Figure 8')).toBeOnTheScreen();
    expect(screen.getByText('Check when done')).toBeOnTheScreen();
  });
});
