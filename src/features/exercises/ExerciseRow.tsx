import { ListItem } from '@/components/ListItem';
import type { Exercise } from '@/db/types';
import { TRACKING_LABELS } from '@/domain/types';
import { radius } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { exerciseMedia } from './mediaSource';
import { MediaView } from './MediaView';

type ExerciseRowProps = {
  exercise: Pick<Exercise, 'name' | 'trackingType' | 'isCustom' | 'seedKey' | 'mediaUrl'>;
  onPress: () => void;
  rightIcon?: AndroidSymbol;
};

/**
 * An exercise in the catalog list (the Exercises tab and the picker): its media as a still
 * thumbnail, its name, tracking type and a Custom marker. Holding the row plays the media in
 * place until the finger lifts, like a video thumbnail on hover; a hold doesn't count as a tap.
 */
export function ExerciseRow({ exercise, onPress, rightIcon = 'chevron_right' }: ExerciseRowProps) {
  const [previewing, setPreviewing] = useState(false);
  const tracking = TRACKING_LABELS[exercise.trackingType];
  const subtitle = exercise.isCustom ? `${tracking} · Custom` : tracking;
  const media = exerciseMedia(exercise);
  return (
    <ListItem
      accessibilityLabel={`${exercise.name}, ${subtitle}`}
      accessibilityHint={media ? 'Hold to play its media' : undefined}
      left={<MediaView media={media} playing={previewing} style={styles.thumb} iconSize={24} />}
      title={exercise.name}
      subtitle={subtitle}
      rightIcon={rightIcon}
      onPress={onPress}
      delayLongPress={250}
      onLongPress={() => setPreviewing(true)}
      onPressOut={() => setPreviewing(false)}
    />
  );
}

const THUMB_SIZE = 64;

const styles = StyleSheet.create({
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
  },
});
