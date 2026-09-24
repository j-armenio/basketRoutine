import { render, screen, userEvent } from '@testing-library/react-native';
import { Button } from './Button';

test('calls onPress', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(<Button label="Start" onPress={onPress} />);

  await user.press(screen.getByRole('button', { name: 'Start' }));

  expect(onPress).toHaveBeenCalledTimes(1);
});

test('does not call onPress when disabled and exposes the state', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(<Button label="Start" disabled onPress={onPress} />);

  const button = screen.getByRole('button', { name: 'Start' });
  await user.press(button);

  expect(onPress).not.toHaveBeenCalled();
  expect(button).toBeDisabled();
});

test.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
  'the %s variant renders its label and fires onPress',
  async (variant) => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button variant={variant} label="Go" icon="history" onPress={onPress} />);

    await user.press(screen.getByText('Go'));

    expect(onPress).toHaveBeenCalledTimes(1);
  },
);
