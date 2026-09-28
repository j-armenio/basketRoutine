import type { Exercise } from '@/db/types';
import { mediaKind, type MediaKind } from '@/domain/media';
import { SEED_MEDIA } from './seedMedia';

/** Something `MediaView` can show: a bundled asset (a `require` number) or a file URI. */
export interface MediaSource {
  kind: MediaKind;
  source: number | string;
}

/**
 * The media to show for an exercise: the bundled file for a predefined one, the stored file for a
 * custom one, or `undefined` (the placeholder).
 */
export function exerciseMedia(
  exercise: Pick<Exercise, 'isCustom' | 'seedKey' | 'mediaUrl'>,
): MediaSource | undefined {
  if (!exercise.isCustom) {
    const bundled = exercise.seedKey ? SEED_MEDIA[exercise.seedKey] : undefined;
    const kind = bundled && mediaKind(bundled.file);
    return bundled && kind ? { kind, source: bundled.source } : undefined;
  }
  const kind = exercise.mediaUrl ? mediaKind(exercise.mediaUrl) : undefined;
  return exercise.mediaUrl && kind ? { kind, source: exercise.mediaUrl } : undefined;
}
