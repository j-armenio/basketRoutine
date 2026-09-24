import { render, screen, userEvent } from '@testing-library/react-native';
import { EmptyState } from './EmptyState';

test('renders the icon area, title and message without an action', async () => {
  await render(<EmptyState icon="history" title="No workouts yet" message="Nothing here." />);

  expect(screen.getByText('No workouts yet')).toBeOnTheScreen();
  expect(screen.getByText('Nothing here.')).toBeOnTheScreen();
  expect(screen.queryByRole('button')).toBeNull();
});

test('renders the action and fires it', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(<EmptyState icon="history" title="Empty" action={{ label: 'Add one', onPress }} />);

  await user.press(screen.getByRole('button', { name: 'Add one' }));

  expect(onPress).toHaveBeenCalledTimes(1);
});
