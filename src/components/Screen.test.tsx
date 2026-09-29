import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { Keyboard, type EmitterSubscription } from 'react-native';

import { BottomActionBar } from './BottomActionBar';
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

test('renders the left slot before the title', async () => {
  await render(
    <Screen title="Workout" left={<AppText>Left</AppText>}>
      <AppText>Body</AppText>
    </Screen>,
  );

  expect(screen.getByText('Left')).toBeOnTheScreen();
});

test('the scroll view keeps taps on buttons while the keyboard is open', async () => {
  await render(
    <Screen title="Workout">
      <AppText>Body</AppText>
    </Screen>,
  );

  expect(screen.getByTestId('screen-scroll')).toHaveProp('keyboardShouldPersistTaps', 'handled');
});

test('with keyboardAvoiding, the scroll view renders inside the KeyboardAvoidingView', async () => {
  await render(
    <Screen title="Workout" keyboardAvoiding bottomInset>
      <AppText>Body</AppText>
    </Screen>,
  );

  const avoiding = screen.getByTestId('screen-keyboard-avoiding');
  expect(within(avoiding).getByTestId('screen-scroll')).toBeOnTheScreen();
  expect(within(avoiding).getByText('Body')).toBeOnTheScreen();
});

test('without keyboardAvoiding there is no KeyboardAvoidingView', async () => {
  await render(
    <Screen title="Workout">
      <AppText>Body</AppText>
    </Screen>,
  );

  expect(screen.queryByTestId('screen-keyboard-avoiding')).toBeNull();
});

test('the footer holds the main action, and hides while the keyboard is open', async () => {
  const listeners: Record<string, () => void> = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    listeners[event] = listener as () => void;
    return { remove: jest.fn() } as unknown as EmitterSubscription;
  });
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <Screen
      title="New Exercise"
      footer={<BottomActionBar label="Save Exercise" onPress={onPress} />}
    >
      <AppText>Body</AppText>
    </Screen>,
  );

  await user.press(screen.getByRole('button', { name: 'Save Exercise' }));
  expect(onPress).toHaveBeenCalledTimes(1);

  await act(() => listeners.keyboardDidShow());
  expect(screen.queryByRole('button', { name: 'Save Exercise' })).toBeNull();

  await act(() => listeners.keyboardDidHide());
  expect(screen.getByRole('button', { name: 'Save Exercise' })).toBeOnTheScreen();
  jest.restoreAllMocks();
});
