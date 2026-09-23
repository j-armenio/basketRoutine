import { render, screen, userEvent } from '@testing-library/react-native';

import Index from '../app/index';

// expo-sqlite can't run in Jest, so the app's DB is swapped for a real one
// (better-sqlite3 in memory, with the real migrations) and seeded like at startup.
jest.mock('@/db/client', () => {
  const { createTestDb } = require('@/db/test-utils');
  const { seedExercises } = require('@/db/seed/seed');
  const db = createTestDb();
  seedExercises(db);
  return { db };
});

test('renders the placeholder screen with the DB check', async () => {
  await render(<Index />);

  expect(screen.getByText('Basket Routine')).toBeOnTheScreen();
  expect(screen.getByText('Catalog: 38 exercises')).toBeOnTheScreen();
  expect(screen.getByText('Routines: 0')).toBeOnTheScreen();
});

test('adds a test routine', async () => {
  const user = userEvent.setup();
  await render(<Index />);

  await user.press(screen.getByText('Add test routine'));

  expect(screen.getByText('Routines: 1')).toBeOnTheScreen();
});
