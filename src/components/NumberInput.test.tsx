import { fireEvent, render, screen } from '@testing-library/react-native';
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
