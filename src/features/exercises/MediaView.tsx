import { Icon } from '@/components/Icon';
import { colors } from '@/theme/colors';
import { size } from '@/theme/spacing';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import type { MediaSource } from './mediaSource';
import { useVideoThumbnail } from './videoThumbnail';

type Fit = 'cover' | 'contain';

type MediaViewProps = {
  /** `undefined` shows the placeholder. */
  media: MediaSource | undefined;
  /** Still: the image, a GIF's or a video's first frame (from a paused player if it can't be made). Playing: the GIF animates, the video plays muted in a loop. */
  playing: boolean;
  /** The box: its size and corner radius. */
  style: StyleProp<ImageStyle>;
  fit?: Fit;
  /** A playing video shows the native controls (the detail). */
  controls?: boolean;
  /** Size of the placeholder's and the video badge's icons. */
  iconSize?: number;
};

/**
 * One exercise media in a fixed box, or the placeholder when there is none or it fails to load.
 * Only local files and bundled assets, so it works offline.
 */
export function MediaView({
  media,
  playing,
  style,
  fit = 'cover',
  controls = false,
  iconSize = size.iconLarge,
}: MediaViewProps) {
  const [failed, setFailed] = useState<MediaSource['source'] | null>(null);
  if (!media || failed === media.source)
    return <MediaPlaceholder style={style} iconSize={iconSize} />;
  const onError = () => setFailed(media.source);

  if (media.kind === 'video') {
    return playing ? (
      <VideoPlayback source={media.source} style={style} fit={fit} controls={controls} />
    ) : (
      <VideoStill source={media.source} style={style} fit={fit} iconSize={iconSize} />
    );
  }
  return (
    <Image
      // A GIF restarts from its first frame on every play, and stops back on it.
      key={media.kind === 'gif' && playing ? 'playing' : 'still'}
      testID="media-image"
      source={media.source}
      autoplay={media.kind === 'gif' && playing}
      contentFit={fit}
      style={[styles.box, style]}
      onError={onError}
    />
  );
}

export function MediaPlaceholder({
  style,
  iconSize = size.iconLarge,
}: {
  style: StyleProp<ImageStyle>;
  iconSize?: number;
}) {
  return (
    <View
      testID="media-placeholder"
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, styles.center, style]}
    >
      <Icon name="sports_basketball" size={iconSize} color={colors.iconPlaceholder} />
    </View>
  );
}

function VideoStill({
  source,
  style,
  fit,
  iconSize,
}: {
  source: number | string;
  style: StyleProp<ImageStyle>;
  fit: Fit;
  iconSize: number;
}) {
  const thumbnail = useVideoThumbnail(source);
  const badge = Math.round(iconSize * 0.75);
  // No first frame could be made: a paused player shows it instead (heavier, so only as a fallback).
  if (thumbnail === null) {
    return <VideoPlayback source={source} style={style} fit={fit} controls={false} paused />;
  }
  return (
    <View
      testID="media-video-still"
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, styles.center, style]}
    >
      {thumbnail && <Image source={thumbnail} contentFit={fit} style={StyleSheet.absoluteFill} />}
      <View style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2 }]}>
        <Icon name="play_arrow" size={badge} color={colors.textPrimary} />
      </View>
    </View>
  );
}

function VideoPlayback({
  source,
  style,
  fit,
  controls,
  paused = false,
}: {
  source: number | string;
  style: StyleProp<ImageStyle>;
  fit: Fit;
  controls: boolean;
  /** Loaded but not played: shows the first frame. */
  paused?: boolean;
}) {
  const player = useVideoPlayer(source, (created) => {
    created.loop = true;
    created.muted = true;
    if (!paused) created.play();
  });
  return (
    <VideoView
      player={player}
      contentFit={fit}
      nativeControls={controls}
      // A TextureView clips to the rounded box and scrolls with the list.
      surfaceType="textureView"
      style={[styles.box, style]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: colors.background,
  },
});
