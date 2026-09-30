import { useIsFocused } from 'expo-router';
import { useMemo } from 'react';
import { useDataVersionWhile } from '../dataStore';
import { readProfile } from './profileStorage';

/**
 * The user's name and photo. Like `useHistory`, it follows the data version only while its screen
 * is focused (the Profile tab stays mounted), and catches up when it is focused again.
 */
export function useProfile() {
  const version = useDataVersionWhile(useIsFocused());
  return useMemo(() => {
    void version; // re-read after any write
    return readProfile();
  }, [version]);
}
