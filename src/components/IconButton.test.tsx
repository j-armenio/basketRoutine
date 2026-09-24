import { render, screen, userEvent } from '@testing-library/react-native';
import { IconButton } from './IconButton';

test('is found by its label and calls onPress', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <IconButton icon="more_vert" accessibilityLabel="Exercise menu" onPress={onPress} />,
  );

  await user.press(screen.getByRole('button', { name: 'Exercise menu' }));

  expect(onPress).toHaveBeenCalledTimes(1);
});

test('does not call onPress when disabled', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(<IconButton icon="close" accessibilityLabel="Close" disabled onPress={onPress} />);

  const button = screen.getByRole('button', { name: 'Close' });
  await user.press(button);

  expect(onPress).not.toHaveBeenCalled();
  expect(button).toBeDisabled();
});
