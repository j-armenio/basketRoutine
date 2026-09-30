import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import { size } from '@/theme/spacing';
import { fireEvent, screen, userEvent, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { expectAccessibleControls } from '@/test-utils/a11y';

// expo-sqlite can't run in Jest, so the app's DB is swapped for a real one
// (better-sqlite3 in memory, with the real migrations) and seeded like at startup.
jest.mock('@/db/client', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { createTestDb } = require('@/db/test-utils');
  const { seedExercises } = require('@/db/seed/seed');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const db = createTestDb();
  seedExercises(db);
  return { db };
});

// Drizzle's useMigrations needs expo-sqlite; migrations + seed are covered by the DB tests.
jest.mock('@/db/useDatabaseSetup', () => ({ useDatabaseSetup: jest.fn() }));

// Rendering the real router is slow on a cold CI runner (the first test there took over 5 s).
jest.setTimeout(30_000);

const mockedSetup = jest.mocked(useDatabaseSetup);

// renderRouter enables Jest fake timers, so the user must advance them or press hangs.
const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

// Real route files, root layout included: covers the DB + font gate, the theme and the tabs.
const renderApp = () => renderRouter('./app');

test('starts on Workout and switches between the three tabs', async () => {
  mockedSetup.mockReturnValue({ ready: true, error: null });
  const user = setupUser();
  // renderRouter's route helpers (getPathname...) live on the returned Promise, not on the
  // awaited result (Testing Library v14's render is async), so await it separately.
  const app = renderApp();
  await app;

  expect(app.getPathname()).toBe('/');
  expect(screen.getByText('Quick Start')).toBeOnTheScreen();
  const start = screen.getByRole('button', { name: 'Start Empty Workout' });
  expect(start).toBeEnabled();
  expect(screen.queryByText('Workout in progress')).toBeNull();
  expectAccessibleControls();

  await user.press(screen.getByRole('tab', { name: 'Exercises' }));
  expect(app.getPathname()).toBe('/exercises');
  expect(screen.getByText('38 exercises')).toBeOnTheScreen();
  expectAccessibleControls();

  await user.press(screen.getByRole('tab', { name: 'Profile' }));
  expect(app.getPathname()).toBe('/profile');
  expect(screen.getByText('No workouts yet')).toBeOnTheScreen();
  expectAccessibleControls();

  await user.press(screen.getByRole('tab', { name: 'Workout' }));
  expect(app.getPathname()).toBe('/');
});

// The native pager can't be dragged in Jest: a test fires the page it would settle on, as the
// drag ends on the phone. The tab view forwards no testID, so the pager is found by its handler.
const settlePagerOn = async (position: number) => {
  const [pager] = screen.container.queryAll(
    (node) => typeof node.props.onPageSelected === 'function',
  );
  await fireEvent(pager, 'pageSelected', { nativeEvent: { position } });
};

test('dragging the pages sideways switches tabs', async () => {
  mockedSetup.mockReturnValue({ ready: true, error: null });
  const app = renderApp();
  await app;

  // the green pill sits in the focused tab only, and moves with it
  const pillIn = (name: string) =>
    within(screen.getByRole('tab', { name })).queryByTestId('tab-pill');
  expect(pillIn('Workout')).toBeOnTheScreen();
  expect(pillIn('Exercises')).toBeNull();

  await settlePagerOn(1);
  expect(app.getPathname()).toBe('/exercises');
  expect(screen.getByRole('tab', { name: 'Exercises' })).toBeSelected();
  expect(pillIn('Exercises')).toHaveStyle({ borderRadius: size.navPillHeight / 2 });
  expect(pillIn('Workout')).toBeNull();

  await settlePagerOn(2);
  expect(app.getPathname()).toBe('/profile');
  expect(screen.getByRole('tab', { name: 'Profile' })).toBeSelected();

  await settlePagerOn(0);
  expect(app.getPathname()).toBe('/');
  expect(screen.getByRole('tab', { name: 'Workout' })).toBeSelected();
});

test('shows the database error and no tab bar', async () => {
  mockedSetup.mockReturnValue({ ready: false, error: new Error('boom') });
  await renderApp();

  expect(screen.getByText('Database error: boom')).toBeOnTheScreen();
  expect(screen.queryByRole('tab')).toBeNull();
  expectAccessibleControls();
});
