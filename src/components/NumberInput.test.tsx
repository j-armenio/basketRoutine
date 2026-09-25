import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { NumberInput } from './NumberInput';

test('is a labelled number pad field that reports changes', async () => {
  const onChangeText = jest.fn();
  await render(
    <NumberInput accessibilityLabel="Set 1 makes" value="7" onChangeText={onChangeText} />,
  );

  const field = screen.getByLabelText('Set 1 makes');
  expect(field).toHaveProp('keyboardType', 'number-pad');
  expect(field).toHaveProp('returnKeyType', 'done');
  expect(field).toHaveProp('selectTextOnFocus', true);
  expect(field).toHaveDisplayValue('7');

  fireEvent.changeText(field, '8');
  expect(onChangeText).toHaveBeenCalledWith('8');
});

test.each(['large', 'compact'] as const)('the %s size renders', async (size) => {
  await render(<NumberInput accessibilityLabel="Target" size={size} value="10" />);

  expect(screen.getByLabelText('Target')).toBeOnTheScreen();
});

test('a tap on the covering layer focuses the field, which then drops the layer', async () => {
  const focus = jest.spyOn(TextInput.prototype, 'focus').mockImplementation(() => {});
  const onFocus = jest.fn();
  const onBlur = jest.fn();
  const user = userEvent.setup();
  await render(
    <NumberInput accessibilityLabel="Set 1 makes" value="7" onFocus={onFocus} onBlur={onBlur} />,
  );

  await user.press(screen.getByTestId('Set 1 makes tap area'));
  expect(focus).toHaveBeenCalledTimes(1);

  // the native focus event: the field takes touches itself while focused
  await fireEvent(screen.getByLabelText('Set 1 makes'), 'focus');
  expect(onFocus).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('Set 1 makes tap area')).toBeNull();

  await fireEvent(screen.getByLabelText('Set 1 makes'), 'blur');
  expect(onBlur).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('Set 1 makes tap area')).toBeOnTheScreen();
  focus.mockRestore();
});
