import { createVideoPlayer, type VideoThumbnail } from 'expo-video';
import { useEffect, useState } from 'react';

// A video's first frame, for the still thumbnail. Generating one opens a player, so each source is
// done once per app run and kept in memory (a few dozen small images at most).
const cache = new Map<number | string, Promise<VideoThumbnail | null>>();

/**
 * expo-video reads a file's frames from its path by only stripping `file://`, without decoding the
 * URI. expo-file-system hands out encoded URIs, and in Expo Go the app's folder has a `%` in its name
 * (`%2540jarmenio…` in the URI), so the path must be decoded first or the file isn't found.
 */
export function thumbnailSource(source: number | string): number | string {
  if (typeof source === 'number' || !source.startsWith('file://')) return source;
  try {
    return `file://${decodeURIComponent(source.slice('file://'.length))}`;
  } catch {
    return source;
  }
}

function loadThumbnail(source: number | string): Promise<VideoThumbnail | null> {
  let pending = cache.get(source);
  if (!pending) {
    pending = (async () => {
      const player = createVideoPlayer(thumbnailSource(source));
      try {
        const [thumbnail] = await player.generateThumbnailsAsync(0);
        return thumbnail ?? null;
      } catch {
        return null;
      } finally {
        player.release();
      }
    })();
    cache.set(source, pending);
  }
  return pending;
}

/** The first frame of a video: `undefined` while it loads, `null` when it can't be made. */
export function useVideoThumbnail(source: number | string): VideoThumbnail | null | undefined {
  const [loaded, setLoaded] = useState<{
    source: number | string;
    thumbnail: VideoThumbnail | null;
  }>();

  useEffect(() => {
    let live = true;
    loadThumbnail(source).then((thumbnail) => {
      if (live) setLoaded({ source, thumbnail });
    });
    return () => {
      live = false;
    };
  }, [source]);

  return loaded?.source === source ? loaded.thumbnail : undefined;
}
