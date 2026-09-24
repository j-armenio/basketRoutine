import { render } from '@testing-library/react-native';
import { Keyboard, TextInput, type EmitterSubscription } from 'react-native';
import { useBlurOnKeyboardHide } from './useBlurOnKeyboardHide';

afterEach(() => {
  jest.restoreAllMocks();
});

function Harness() {
  useBlurOnKeyboardHide();
  return null;
}

test('blurs the focused input when the keyboard hides, and unsubscribes on unmount', async () => {
  let onHide: (() => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    if (event === 'keyboardDidHide') onHide = listener as () => void;
    return { remove } as unknown as EmitterSubscription;
  });
  const focused = {} as ReturnType<typeof TextInput.State.currentlyFocusedInput>;
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(focused);
  const blur = jest.spyOn(TextInput.State, 'blurTextInput').mockImplementation(() => {});

  const view = await render(<Harness />);
  onHide!();

  expect(blur).toHaveBeenCalledWith(focused);

  await view.unmount();
  expect(remove).toHaveBeenCalled();
});

test('does nothing when no input is focused', async () => {
  let onHide: (() => void) | undefined;
  jest.spyOn(Keyboard, 'addListener').mockImplementation((_event, listener) => {
    onHide = listener as () => void;
    return { remove: jest.fn() } as unknown as EmitterSubscription;
  });
  jest
    .spyOn(TextInput.State, 'currentlyFocusedInput')
    .mockReturnValue(null as unknown as ReturnType<typeof TextInput.State.currentlyFocusedInput>);
  const blur = jest.spyOn(TextInput.State, 'blurTextInput').mockImplementation(() => {});

  await render(<Harness />);
  onHide!();

  expect(blur).not.toHaveBeenCalled();
});
