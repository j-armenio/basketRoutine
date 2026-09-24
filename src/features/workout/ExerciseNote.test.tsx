import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { updateNote } from './actions';
import { ExerciseNote } from './ExerciseNote';

jest.mock('./actions', () => ({ updateNote: jest.fn() }));

test('shows the placeholder, then edits and saves on every change', async () => {
  const user = userEvent.setup();
  await render(<ExerciseNote exerciseId={3} name="Free Throws" note="" />);
  expect(screen.getByText('Add a note')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Free Throws note' }));
  const field = screen.getByLabelText('Free Throws note');
  await fireEvent.changeText(field, 'elbow in');

  expect(updateNote).toHaveBeenLastCalledWith(3, 'elbow in');

  await fireEvent(field, 'blur');
  expect(screen.getByText('elbow in')).toBeOnTheScreen();
});

test('at rest, a long note is cut to two lines with an ellipsis', async () => {
  await render(<ExerciseNote exerciseId={3} name="Free Throws" note={'line\n'.repeat(6)} />);

  const text = screen.getByText(/line/);
  expect(text).toHaveProp('numberOfLines', 2);
  expect(text).toHaveProp('ellipsizeMode', 'tail');
});
