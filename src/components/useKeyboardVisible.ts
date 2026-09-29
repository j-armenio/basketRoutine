import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Whether the keyboard is open. The tab bar and the bottom action bars hide while it is, so they
 * don't ride up on top of it and cover the field being typed in.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return visible;
}
