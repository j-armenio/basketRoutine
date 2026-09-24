import { render, screen, userEvent } from '@testing-library/react-native';
import { AppText } from './AppText';
import { Card } from './Card';

test('is a plain view without onPress', async () => {
  await render(
    <Card>
      <AppText>Content</AppText>
    </Card>,
  );

  expect(screen.getByText('Content')).toBeOnTheScreen();
  expect(screen.queryByRole('button')).toBeNull();
});

test('is pressable when given onPress', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <Card onPress={onPress}>
      <AppText>Content</AppText>
    </Card>,
  );

  await user.press(screen.getByRole('button'));

  expect(onPress).toHaveBeenCalledTimes(1);
});
