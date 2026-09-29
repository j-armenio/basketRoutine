import { render, screen, userEvent } from '@testing-library/react-native';
import { Fab } from './Fab';

test('shows its label and calls onPress', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(<Fab label="New Exercise" icon="add" onPress={onPress} />);

  await user.press(screen.getByRole('button', { name: 'New Exercise' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByText('New Exercise')).toBeOnTheScreen();
});
