import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppText } from './AppText';
import { SwipeToDelete } from './SwipeToDelete';

const setup = async () => {
  const onDelete = jest.fn();
  await render(
    <SwipeToDelete deleteLabel="Delete set 1" onDelete={onDelete} testID="row">
      <AppText>Set 1</AppText>
    </SwipeToDelete>,
  );
  return onDelete;
};

test('renders the row', async () => {
  await setup();

  expect(screen.getByText('Set 1')).toBeOnTheScreen();
});

test('the delete accessibility action deletes', async () => {
  const onDelete = await setup();

  fireEvent(screen.getByTestId('row'), 'accessibilityAction', {
    nativeEvent: { actionName: 'delete' },
  });

  expect(onDelete).toHaveBeenCalledTimes(1);
});

test('when disabled, there is no delete action', async () => {
  const onDelete = jest.fn();
  await render(
    <SwipeToDelete deleteLabel="Delete set 1" onDelete={onDelete} enabled={false} testID="row">
      <AppText>Set 1</AppText>
    </SwipeToDelete>,
  );

  const row = screen.getByTestId('row');
  expect(row).toHaveProp('accessibilityActions', []);
  fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });

  expect(onDelete).not.toHaveBeenCalled();
});
