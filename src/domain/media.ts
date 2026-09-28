export type MediaKind = 'image' | 'gif' | 'video';

const KIND_BY_EXTENSION: Record<string, MediaKind> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  gif: 'gif',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  '3gp': 'video',
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/3gpp': '3gp',
};

/** A short video: anything longer is refused when it's picked. */
export const MAX_VIDEO_MS = 30_000;

/** The lowercased extension of a URI or file name, query and fragment ignored, or `undefined`. */
export function extensionOf(uri: string): string | undefined {
  const path = uri.trim().split(/[?#]/)[0];
  const file = path.slice(path.lastIndexOf('/') + 1);
  const dot = file.lastIndexOf('.');
  return dot > 0 ? file.slice(dot + 1).toLowerCase() : undefined;
}

/**
 * How a media file is shown, by its extension, or `undefined` for an unsupported one. String
 * operations rather than `new URL`, which Hermes doesn't implement in full.
 */
export function mediaKind(uri: string): MediaKind | undefined {
  const extension = extensionOf(uri);
  return extension === undefined ? undefined : KIND_BY_EXTENSION[extension];
}

/** What the gallery hands back for one file (the fields of `expo-image-picker`'s asset we read). */
export interface GalleryAsset {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  /** Milliseconds, videos only. */
  duration?: number | null;
}

export interface PickedMedia {
  uri: string;
  extension: string;
  kind: MediaKind;
}

export type PickResult =
  { ok: true; media: PickedMedia } | { ok: false; reason: 'too_long' | 'unsupported' };

/**
 * What the form keeps from a gallery pick: the extension comes from the MIME type, else from the
 * file name or the URI. A video over `MAX_VIDEO_MS` or an unsupported type is refused.
 */
export function pickedMedia(asset: GalleryAsset): PickResult {
  const extension =
    (asset.mimeType ? EXTENSION_BY_MIME[asset.mimeType.toLowerCase()] : undefined) ??
    extensionOf(asset.fileName ?? '') ??
    extensionOf(asset.uri);
  const kind = extension === undefined ? undefined : KIND_BY_EXTENSION[extension];
  if (extension === undefined || kind === undefined) return { ok: false, reason: 'unsupported' };
  if (kind === 'video' && (asset.duration ?? 0) > MAX_VIDEO_MS)
    return { ok: false, reason: 'too_long' };
  return { ok: true, media: { uri: asset.uri, extension, kind } };
}
