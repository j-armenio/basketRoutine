import { render, screen, userEvent } from '@testing-library/react-native';
import { ListItem } from './ListItem';

test('shows the title and subtitle and calls onPress', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <ListItem title="Free Throws" subtitle="Makes / Attempts" rightIcon="add" onPress={onPress} />,
  );

  expect(screen.getByText('Makes / Attempts')).toBeOnTheScreen();
  await user.press(screen.getByText('Free Throws'));

  expect(onPress).toHaveBeenCalledTimes(1);
});

test('renders with only a title', async () => {
  await render(<ListItem title="Figure 8" />);

  expect(screen.getByText('Figure 8')).toBeOnTheScreen();
});
