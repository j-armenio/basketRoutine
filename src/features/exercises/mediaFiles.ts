import { DomainError } from '@/domain/errors';
import type { PickedMedia } from '@/domain/media';
import { Directory, File, Paths } from 'expo-file-system';

// A custom exercise's media lives in the app's own storage, so it works offline and survives the
// original being deleted from the gallery. Uninstalling the app removes it, like the DB.

const mediaDirectory = () => new Directory(Paths.document, 'exercise-media');

/**
 * Copies a picked file into the app's media folder under a new name and returns its URI. A failed
 * copy becomes `media_not_saved`, so the action reports it like any rule.
 */
export function storeMedia(media: PickedMedia): string {
  try {
    const directory = mediaDirectory();
    directory.create({ idempotent: true, intermediates: true });
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${media.extension}`;
    const target = new File(directory, name);
    new File(media.uri).copySync(target);
    return target.uri;
  } catch {
    throw new DomainError('media_not_saved');
  }
}

/** Deletes a stored media file. Only inside the media folder; a failure leaves a harmless file. */
export function deleteMedia(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    if (!uri.startsWith(mediaDirectory().uri)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // an orphan file only takes space
  }
}
