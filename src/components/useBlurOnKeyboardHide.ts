import { useEffect } from 'react';
import { Keyboard, TextInput } from 'react-native';

/**
 * Android's back button hides the keyboard but leaves the field focused, so its "done" logic
 * (rolling back an invalid number, closing the note editor) wouldn't run. Blurring whatever is
 * focused when the keyboard goes away makes hiding the keyboard the same as leaving the field.
 * Used once, in the root layout, so it covers every input.
 */
export function useBlurOnKeyboardHide(): void {
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      const focused = TextInput.State.currentlyFocusedInput();
      if (focused) TextInput.State.blurTextInput(focused);
    });
    return () => subscription.remove();
  }, []);
}
