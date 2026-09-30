import { render, screen, userEvent } from '@testing-library/react-native';
import { colors } from '@/theme/colors';
import { border, size } from '@/theme/spacing';
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

test('outlined: a dashed green ring around the icon, like New Workout, inside the 48 dp target', async () => {
  await render(
    <IconButton
      icon="add"
      variant="outlined"
      accessibilityLabel="New exercise"
      onPress={() => {}}
    />,
  );

  expect(screen.getByRole('button', { name: 'New exercise' })).toHaveStyle({
    width: size.iconButton,
    height: size.iconButton,
  });
  expect(screen.getByTestId('icon-button-ring')).toHaveStyle({
    width: size.iconButtonRing,
    borderRadius: size.iconButtonRing / 2,
    borderWidth: border.outline,
    borderStyle: 'dashed',
    borderColor: colors.secondaryOutline,
  });
});
