import { useDatabaseSetup } from '@/db/useDatabaseSetup';
import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

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

  await user.press(screen.getByRole('tab', { name: 'Exercises' }));
  expect(app.getPathname()).toBe('/exercises');
  expect(screen.getByText('38 exercises')).toBeOnTheScreen();

  await user.press(screen.getByRole('tab', { name: 'History' }));
  expect(app.getPathname()).toBe('/history');
  expect(screen.getByText('No workouts yet')).toBeOnTheScreen();

  await user.press(screen.getByRole('tab', { name: 'Workout' }));
  expect(app.getPathname()).toBe('/');
});

test('shows the database error and no tab bar', async () => {
  mockedSetup.mockReturnValue({ ready: false, error: new Error('boom') });
  await renderApp();

  expect(screen.getByText('Database error: boom')).toBeOnTheScreen();
  expect(screen.queryByRole('tab')).toBeNull();
});
