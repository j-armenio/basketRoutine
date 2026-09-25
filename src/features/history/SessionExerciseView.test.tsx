import { render, screen } from '@testing-library/react-native';
import { SessionExerciseView } from './SessionExerciseView';
import type { SessionExerciseDetail } from '../workout/hooks';

function exercise(overrides: Partial<SessionExerciseDetail>): SessionExerciseDetail {
  return {
    id: 1,
    sessionId: 1,
    exerciseId: 1,
    position: 0,
    name: 'Free Throws',
    category: 'shooting',
    trackingType: 'makes_attempts',
    targetMode: 'attempts',
    note: '',
    sets: [],
    ...overrides,
  };
}

const set = (
  id: number,
  targetValue: number | null,
  loggedValue: number | null,
  completed = false,
) => ({
  id,
  sessionExerciseId: 1,
  position: id,
  targetValue,
  loggedValue,
  completed,
});

test('a fixed-attempts drill shows target, logged makes and FG% per set, and — for an empty set', async () => {
  await render(
    <SessionExerciseView exercise={exercise({ sets: [set(1, 10, 7), set(2, 10, null)] })} />,
  );

  expect(screen.getByText('Free Throws')).toBeOnTheScreen();
  expect(screen.getByText('Fixed attempts · log makes')).toBeOnTheScreen();
  expect(screen.getByText('ATTEMPTS')).toBeOnTheScreen();
  expect(screen.getByText('MAKES')).toBeOnTheScreen();
  expect(screen.getByLabelText('Set 1 attempts')).toHaveTextContent('10');
  expect(screen.getByLabelText('Set 1 makes')).toHaveTextContent('7');
  expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('70%');
  expect(screen.getByLabelText('Set 2 attempts')).toHaveTextContent('10');
  expect(screen.getByLabelText('Set 2 makes')).toHaveTextContent('—');
  expect(screen.getByLabelText('Set 2 FG%')).toHaveTextContent('—');
  // the empty set is left out of the total
  expect(screen.getByText('Total: 7 makes / 10 attempts · 70%')).toBeOnTheScreen();
});

test('a fixed-makes drill logs attempts', async () => {
  await render(
    <SessionExerciseView
      exercise={exercise({
        name: 'Mikan Drill',
        targetMode: 'makes',
        sets: [set(1, 5, 8)],
      })}
    />,
  );

  expect(screen.getByText('Fixed makes · log attempts')).toBeOnTheScreen();
  expect(screen.getByLabelText('Set 1 makes')).toHaveTextContent('5');
  expect(screen.getByLabelText('Set 1 attempts')).toHaveTextContent('8');
  expect(screen.getByLabelText('Set 1 FG%')).toHaveTextContent('63%');
  expect(screen.getByText('Total: 5 makes / 8 attempts · 63%')).toBeOnTheScreen();
});

test('a check drill shows ✓ for a done set and — for the rest, with no total', async () => {
  await render(
    <SessionExerciseView
      exercise={exercise({
        name: 'Figure 8',
        trackingType: 'check',
        targetMode: null,
        sets: [set(1, null, null, true), set(2, null, null, false)],
      })}
    />,
  );

  expect(screen.getByText('Check when done')).toBeOnTheScreen();
  expect(screen.getByLabelText('Set 1 done')).toHaveTextContent('✓');
  expect(screen.getByLabelText('Set 2 not done')).toHaveTextContent('—');
  expect(screen.queryByText(/Total:/)).toBeNull();
});

test('the note shows only when it is not empty', async () => {
  const { rerender } = await render(
    <SessionExerciseView exercise={exercise({ sets: [set(1, 10, 7)] })} />,
  );
  expect(screen.queryByLabelText('Free Throws note')).toBeNull();

  await rerender(
    <SessionExerciseView exercise={exercise({ sets: [set(1, 10, 7)], note: 'felt good' })} />,
  );
  expect(screen.getByLabelText('Free Throws note')).toHaveTextContent('felt good');
});

test('nothing in it can be edited', async () => {
  await render(
    <SessionExerciseView exercise={exercise({ sets: [set(1, 10, 7), set(2, 10, null)] })} />,
  );

  expect(screen.queryAllByRole('button')).toEqual([]);
  expect(screen.queryAllByRole('checkbox')).toEqual([]);
  expect(JSON.stringify(screen.toJSON())).not.toContain('"TextInput"');
});
