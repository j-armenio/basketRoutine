import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { NameDialog } from './NameDialog';

const setup = async (props: Partial<Parameters<typeof NameDialog>[0]> = {}) => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  const user = userEvent.setup();
  const view = await render(
    <NameDialog visible title="New Routine" onConfirm={onConfirm} onClose={onClose} {...props} />,
  );
  return { onConfirm, onClose, user, view };
};

test('shows the title and starts with the initial name', async () => {
  await setup({ title: 'Rename Routine', initialName: 'Push' });

  expect(screen.getByText('Rename Routine')).toBeOnTheScreen();
  expect(screen.getByLabelText('Name')).toHaveDisplayValue('Push');
});

test('renders nothing when not visible', async () => {
  await setup({ visible: false });

  expect(screen.queryByText('New Routine')).toBeNull();
});

test('Save is disabled while the name is blank', async () => {
  const { user, onConfirm } = await setup();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

  await user.type(screen.getByLabelText('Name'), '   ');
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Save' }));
  expect(onConfirm).not.toHaveBeenCalled();

  await user.type(screen.getByLabelText('Name'), 'Push');
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
});

test('confirming hands over the trimmed name, with a custom label', async () => {
  const { user, onConfirm } = await setup({ confirmLabel: 'Create' });

  await user.type(screen.getByLabelText('Name'), '  Push day ');
  await user.press(screen.getByRole('button', { name: 'Create' }));

  expect(onConfirm).toHaveBeenCalledWith('Push day');
});

test('the keyboard "done" key confirms too', async () => {
  const { user, onConfirm } = await setup();

  await user.type(screen.getByLabelText('Name'), 'Push');
  await fireEvent(screen.getByLabelText('Name'), 'submitEditing');

  expect(onConfirm).toHaveBeenCalledWith('Push');
});

test('Cancel, the backdrop and the back button close it', async () => {
  const { user, onClose, view } = await setup();

  await user.press(screen.getByRole('button', { name: 'Cancel' }));
  await user.press(screen.getByRole('button', { name: 'Close dialog' }));
  expect(onClose).toHaveBeenCalledTimes(2);

  // the Android back button reaches the Modal's onRequestClose
  await fireEvent(screen.getByLabelText('Name'), 'requestClose');
  expect(onClose).toHaveBeenCalledTimes(3);
  await view.unmount();
});

test('the field starts fresh when the dialog opens again', async () => {
  const { user, view } = await setup();
  await user.type(screen.getByLabelText('Name'), 'Draft');

  await view.rerender(
    <NameDialog visible={false} title="New Routine" onConfirm={jest.fn()} onClose={jest.fn()} />,
  );
  await view.rerender(
    <NameDialog visible title="New Routine" onConfirm={jest.fn()} onClose={jest.fn()} />,
  );

  expect(screen.getByLabelText('Name')).toHaveDisplayValue('');
});
