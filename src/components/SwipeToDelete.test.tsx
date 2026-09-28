import { fireEvent, render, screen } from '@testing-library/react-native';
import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import { AppText } from './AppText';
import { SwipeToDelete } from './SwipeToDelete';

const perform = jest.mocked(performAndroidHapticsAsync);

beforeEach(() => perform.mockClear());

const setup = async (deleted = true) => {
  const onDelete = jest.fn(() => deleted);
  await render(
    <SwipeToDelete deleteLabel="Delete set 1" onDelete={onDelete} testID="row">
      <AppText>Set 1</AppText>
    </SwipeToDelete>,
  );
  return onDelete;
};

const deleteAction = () =>
  fireEvent(screen.getByTestId('row'), 'accessibilityAction', {
    nativeEvent: { actionName: 'delete' },
  });

test('renders the row', async () => {
  await setup();

  expect(screen.getByText('Set 1')).toBeOnTheScreen();
});

test('the delete accessibility action deletes and confirms with a haptic', async () => {
  const onDelete = await setup();

  await deleteAction();

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(perform.mock.calls).toEqual([[AndroidHaptics.Confirm]]);
});

test('the swipe deletes and confirms with a haptic', async () => {
  const onDelete = await setup();

  await fireEvent(screen.getByTestId('row-swipe'), 'swipeableOpen');

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(perform.mock.calls).toEqual([[AndroidHaptics.Confirm]]);
});

test('a refused deletion plays no haptic', async () => {
  const onDelete = await setup(false);

  await deleteAction();

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(perform).not.toHaveBeenCalled();
});

test('when disabled, there is no delete action', async () => {
  const onDelete = jest.fn(() => true);
  await render(
    <SwipeToDelete deleteLabel="Delete set 1" onDelete={onDelete} enabled={false} testID="row">
      <AppText>Set 1</AppText>
    </SwipeToDelete>,
  );

  const row = screen.getByTestId('row');
  expect(row).toHaveProp('accessibilityActions', []);
  await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });

  expect(onDelete).not.toHaveBeenCalled();
  expect(perform).not.toHaveBeenCalled();
});
