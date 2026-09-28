import {
  archiveCustomExercise,
  createCustomExercise,
  getExercise,
} from '@/db/repositories/exercises';
import { createRoutine } from '@/db/repositories/routines';
import {
  addSessionExercise,
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
import { act, cleanup, fireEvent, screen, userEvent, within } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { renderRouter } from 'expo-router/testing-library';
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

describe('the Exercises tab', () => {
  test('lists the catalog with its size in the subtitle, and search narrows it', async () => {
    await launch();
    const user = setupUser();

    await openExercisesTab(user);

    expect(screen.getByRole('header', { name: 'Exercises' })).toBeOnTheScreen();
    expect(screen.getByText('38 exercises')).toBeOnTheScreen();
    // the chip and the section header
    expect(screen.getAllByText('Finishing')).toHaveLength(2);

    await search(user, 'FREE');

    expect(screen.getByText('Free Throws')).toBeOnTheScreen();
    expect(screen.getByText('Makes / Attempts')).toBeOnTheScreen();
    expect(screen.queryByText('Mikan Drill')).toBeNull();
    // the count is the catalog's, not the result's
    expect(screen.getByText('38 exercises')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Search exercises'));
    await search(user, 'nothing like this');

    expect(screen.getByText('No exercises found')).toBeOnTheScreen();
    expect(screen.getByText('38 exercises')).toBeOnTheScreen();
  });

  test('a category chip filters, All clears it, and it combines with search', async () => {
    await launch();
    const user = setupUser();
    await openExercisesTab(user);
    expect(screen.getByRole('radio', { name: 'All' })).toBeSelected();

    await user.press(screen.getByRole('radio', { name: 'Shooting' }));

    expect(screen.getByRole('radio', { name: 'Shooting' })).toBeSelected();
    expect(screen.getByText('Free Throws')).toBeOnTheScreen();
    expect(screen.queryByText('Mikan Drill')).toBeNull();
    expect(screen.queryByText('Figure 8')).toBeNull();

    await search(user, 'layups');
    expect(screen.getByText('No exercises found')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Search exercises'));
    await search(user, 'spot');
    expect(screen.getByText('Spot-Up Jumpers')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Search exercises'));
    await user.press(screen.getByRole('radio', { name: 'All' }));
    expect(screen.getByText('Mikan Drill')).toBeOnTheScreen();
  });

  test('the Custom chip lists only custom exercises, of every category, and combines with search', async () => {
    makeCustom({ name: 'My Threes', category: 'shooting' });
    makeCustom({ name: 'My Slalom', category: 'footwork', trackingType: 'check' });
    await launch();
    const user = setupUser();
    await openExercisesTab(user);

    await user.press(screen.getByRole('radio', { name: 'Custom' }));

    expect(screen.getByRole('radio', { name: 'Custom' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'All' })).not.toBeSelected();
    expect(screen.getByText('My Threes')).toBeOnTheScreen();
    expect(screen.getByText('My Slalom')).toBeOnTheScreen();
    expect(screen.queryByText('Free Throws')).toBeNull();
    // grouped by category like the rest
    expect(screen.getAllByText('Shooting')).toHaveLength(2); // the chip and the section
    expect(screen.getAllByText('Footwork')).toHaveLength(2);
    expect(screen.getByText('40 exercises')).toBeOnTheScreen(); // the count stays the catalog's

    await search(user, 'slalom');
    expect(screen.getByText('My Slalom')).toBeOnTheScreen();
    expect(screen.queryByText('My Threes')).toBeNull();

    await search(user, 'zzz');
    expect(screen.getByText('No exercises found')).toBeOnTheScreen();
  });

  test('the Custom chip with no custom exercise says so', async () => {
    await launch();
    const user = setupUser();
    await openExercisesTab(user);

    await user.press(screen.getByRole('radio', { name: 'Custom' }));

    expect(screen.getByText('No custom exercises yet')).toBeOnTheScreen();
    expect(screen.getByText('Create one with the + button.')).toBeOnTheScreen();
  });

  test('a custom exercise shows the Custom marker, and the count follows a new one', async () => {
    makeCustom();
    await launch();
    const user = setupUser();

    await openExercisesTab(user);

    expect(screen.getByText('39 exercises')).toBeOnTheScreen();
    await search(user, 'deep');
    expect(screen.getByText('Makes / Attempts · Custom')).toBeOnTheScreen();
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
  test('a predefined exercise shows its description, the placeholder, a read-only note and no menu', async () => {
    const app = await launch();
    const user = setupUser();
    await openExercisesTab(user);

    await openDetail(user, 'Free Throws');

    expect(app.getPathname()).toBe(`/exercise/${exerciseId('free_throws')}`);
    expect(screen.getByRole('header', { name: 'Free Throws' })).toBeOnTheScreen();
    expect(screen.getByText('Shooting · Makes / Attempts')).toBeOnTheScreen();
    expect(screen.getByText(seeded('free_throws').description)).toBeOnTheScreen();
    expect(screen.getByText("Predefined exercise. It can't be edited.")).toBeOnTheScreen();
    expect(bigMedia().getByTestId('media-placeholder', HIDDEN)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Exercise menu' })).toBeNull();
  });

  test('a custom exercise has no note and no description shows a placeholder', async () => {
    const custom = makeCustom();
    await launch(`/exercise/${custom.id}`);

    expect(screen.getByRole('header', { name: 'Deep Threes' })).toBeOnTheScreen();
    expect(screen.getByText('No description.')).toBeOnTheScreen();
    expect(screen.queryByText(/Predefined exercise/)).toBeNull();
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

    await user.press(screen.getByRole('button', { name: 'Save' }));

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
    await user.press(screen.getByRole('button', { name: 'Save' }));

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

    await user.clear(screen.getByLabelText('Exercise name'));
    await user.type(screen.getByLabelText('Exercise name'), 'Logo Threes');
    await user.press(screen.getByRole('radio', { name: 'Finishing' }));
    await user.type(screen.getByLabelText('Description'), 'From the logo');
    pickNext({ uri: 'file:///cache/picked/new', mimeType: 'image/png' });
    await user.press(screen.getByRole('button', { name: 'Change media' }));
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(app.getPathname()).toBe(`/exercise/${custom.id}`);
    expect(screen.getByRole('header', { name: 'Logo Threes' })).toBeOnTheScreen();
    expect(screen.getByText('Finishing · Makes / Attempts')).toBeOnTheScreen();
    expect(screen.getByText('From the logo')).toBeOnTheScreen();
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
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(getExercise(db, custom.id)?.mediaUrl).toBeNull();
    expect(files.size).toBe(0);
  });

  test('a rejected edit shows the reason and changes nothing', async () => {
    const custom = makeCustom();
    await launch(`/edit-exercise?exerciseId=${custom.id}`);
    const user = setupUser();

    await user.clear(screen.getByLabelText('Exercise name'));
    await user.press(screen.getByRole('button', { name: 'Save' }));

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
    await user.press(screen.getByRole('button', { name: 'Save' }));
    await user.press(screen.getByRole('button', { name: 'Back' }));

    await user.press(tab('Workout'));
    expect(screen.getByText('Free Throws, Logo Threes')).toBeOnTheScreen();

    await user.press(tab('History'));
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
    await user.press(tab('History'));
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
    await user.press(screen.getByRole('button', { name: 'Save' }));

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
    await user.press(screen.getByRole('button', { name: 'Save' }));

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
    await user.press(screen.getByRole('button', { name: 'Finish' }));
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
    await user.press(screen.getByRole('button', { name: 'Finish' }));
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
