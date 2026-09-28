import { db } from '@/db/client';
import {
  archiveCustomExercise,
  countWorkoutsUsingExercise,
  createCustomExercise,
  getExercise,
  updateCustomExercise,
  type CustomExerciseInput,
  type CustomExerciseUpdate,
} from '@/db/repositories/exercises';
import type { PickedMedia } from '@/domain/media';
import { run } from '../dataStore';
import { deleteMedia, storeMedia } from './mediaFiles';

// The media file is copied into the app's storage inside the write, so a failed copy comes back
// as a reason like any rule. A failed write deletes the copy; a successful one deletes the file
// it replaced.

/** Creates a custom exercise, with the picked media if any. */
export function createExercise(input: Omit<CustomExerciseInput, 'mediaUrl'>, media?: PickedMedia) {
  let stored: string | undefined;
  const result = run(() => {
    stored = media ? storeMedia(media) : undefined;
    return createCustomExercise(db, { ...input, mediaUrl: stored });
  });
  if (!result.ok) deleteMedia(stored);
  return result;
}

export type MediaChange =
  { type: 'keep' } | { type: 'remove' } | { type: 'replace'; media: PickedMedia };

/** The tracking type can't change: the update has no such field. */
export function updateExercise(
  id: number,
  input: Omit<CustomExerciseUpdate, 'mediaUrl'>,
  media: MediaChange = { type: 'keep' },
) {
  const previous = getExercise(db, id)?.mediaUrl;
  let stored: string | undefined;
  const result = run(() => {
    stored = media.type === 'replace' ? storeMedia(media.media) : undefined;
    const mediaUrl = media.type === 'keep' ? undefined : (stored ?? '');
    return updateCustomExercise(db, id, { ...input, mediaUrl });
  });
  if (!result.ok) deleteMedia(stored);
  else if (media.type !== 'keep') deleteMedia(previous);
  return result;
}

/**
 * Archives a custom exercise and removes it from the templates that use it. History is untouched.
 * Its media file goes: nothing shows a deleted exercise's media.
 */
export function deleteExercise(id: number) {
  const previous = getExercise(db, id)?.mediaUrl;
  const result = run(() => archiveCustomExercise(db, id));
  if (result.ok) deleteMedia(previous);
  return result;
}

/** How many active workouts use the exercise, for the delete confirmation. A read: doesn't notify. */
export function exerciseUsage(id: number) {
  return countWorkoutsUsingExercise(db, id);
}
