import Storage from 'expo-sqlite/kv-store';

// The profile is two values, not rows: it sits in expo-sqlite's key-value store (its own database
// file, next to the app's), so the app's schema doesn't change. Only this file imports it.

export interface Profile {
  /** As typed, trimmed; empty when the user hasn't set one. */
  name: string;
  /** The photo copied into `<documents>/profile-photo/`, or `null`. */
  photoUri: string | null;
}

const NAME_KEY = 'profile.name';
const PHOTO_KEY = 'profile.photoUri';

export function readProfile(): Profile {
  return {
    name: Storage.getItemSync(NAME_KEY) ?? '',
    photoUri: Storage.getItemSync(PHOTO_KEY) || null,
  };
}

export function writeProfile(profile: Profile): void {
  Storage.setItemSync(NAME_KEY, profile.name);
  if (profile.photoUri) Storage.setItemSync(PHOTO_KEY, profile.photoUri);
  else Storage.removeItemSync(PHOTO_KEY);
}
