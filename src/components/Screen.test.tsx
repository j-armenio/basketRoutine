import { render, screen } from '@testing-library/react-native';
import { AppText } from './AppText';
import { Screen } from './Screen';

test('renders the title, subtitle, right slot and content', async () => {
  await render(
    <Screen title="Exercises" subtitle="38 exercises" right={<AppText>Right</AppText>}>
      <AppText>Body</AppText>
    </Screen>,
  );

  expect(screen.getByRole('header', { name: 'Exercises' })).toBeOnTheScreen();
  expect(screen.getByText('38 exercises')).toBeOnTheScreen();
  expect(screen.getByText('Right')).toBeOnTheScreen();
  expect(screen.getByText('Body')).toBeOnTheScreen();
});

test('renders content without a scroll view when scroll is false', async () => {
  await render(
    <Screen title="Fixed" scroll={false}>
      <AppText>Body</AppText>
    </Screen>,
  );

  expect(screen.getByText('Body')).toBeOnTheScreen();
});
