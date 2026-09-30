import { run } from '../dataStore';
import type { MediaChange } from '../exercises/actions';
import { deleteMedia, storeMedia } from '../exercises/mediaFiles';
import { readProfile, writeProfile } from './profileStorage';

// Same media handling as an exercise's: the photo is copied into the app's storage inside the
// write, a failed write deletes the copy, and a successful one deletes the photo it replaced.

/** Saves the name (trimmed, may be empty) and the photo change. */
export function saveProfile(name: string, photo: MediaChange = { type: 'keep' }) {
  const previous = readProfile().photoUri;
  let stored: string | undefined;
  const result = run(() => {
    stored = photo.type === 'replace' ? storeMedia(photo.media, 'profile-photo') : undefined;
    const photoUri = photo.type === 'keep' ? previous : (stored ?? null);
    writeProfile({ name: name.trim(), photoUri });
  });
  if (!result.ok) deleteMedia(stored, 'profile-photo');
  else if (photo.type !== 'keep') deleteMedia(previous, 'profile-photo');
  return result;
}
