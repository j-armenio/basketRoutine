import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextField } from './TextField';

test('shows the value and reports changes', async () => {
  const onChangeText = jest.fn();
  await render(
    <TextField
      accessibilityLabel="Search"
      placeholder="Search exercises"
      value="free"
      onChangeText={onChangeText}
    />,
  );

  const field = screen.getByLabelText('Search');
  expect(field).toHaveDisplayValue('free');

  fireEvent.changeText(field, 'free t');
  expect(onChangeText).toHaveBeenCalledWith('free t');
});

test('renders as multiline', async () => {
  await render(<TextField accessibilityLabel="Note" multiline placeholder="Add a note" />);

  expect(screen.getByLabelText('Note')).toHaveProp('multiline', true);
});
