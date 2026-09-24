import { render, screen, userEvent } from '@testing-library/react-native';
import { ActionSheet } from './ActionSheet';

const setup = (options: Parameters<typeof ActionSheet>[0]['options'], visible = true) => {
  const onClose = jest.fn();
  const user = userEvent.setup();
  const view = render(
    <ActionSheet visible={visible} title="Set 1" options={options} onClose={onClose} />,
  );
  return { onClose, user, view };
};

test('renders the title, the options and Cancel', async () => {
  const { view } = setup([
    { label: 'Move up', onPress: jest.fn() },
    { label: 'Remove exercise', destructive: true, onPress: jest.fn() },
  ]);
  await view;

  expect(screen.getByText('Set 1')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Move up' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Remove exercise' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
});

test('renders nothing when not visible', async () => {
  const { view } = setup([{ label: 'Move up', onPress: jest.fn() }], false);
  await view;

  expect(screen.queryByText('Move up')).toBeNull();
});

test('an option fires and then closes the sheet', async () => {
  const calls: string[] = [];
  const onPress = jest.fn(() => calls.push('press'));
  const { onClose, user, view } = setup([{ label: 'Delete set', onPress }]);
  onClose.mockImplementation(() => calls.push('close'));
  await view;

  await user.press(screen.getByRole('button', { name: 'Delete set' }));

  expect(onPress).toHaveBeenCalledTimes(1);
  expect(calls).toEqual(['press', 'close']);
});

test('a disabled option does not fire', async () => {
  const onPress = jest.fn();
  const { onClose, user, view } = setup([{ label: 'Move up', disabled: true, onPress }]);
  await view;

  const option = screen.getByRole('button', { name: 'Move up' });
  await user.press(option);

  expect(option).toBeDisabled();
  expect(onPress).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test('Cancel and the backdrop close the sheet', async () => {
  const { onClose, user, view } = setup([{ label: 'Move up', onPress: jest.fn() }]);
  await view;

  await user.press(screen.getByRole('button', { name: 'Cancel' }));
  await user.press(screen.getByRole('button', { name: 'Close menu' }));

  expect(onClose).toHaveBeenCalledTimes(2);
});
