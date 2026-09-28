import { ActionSheet, type ActionSheetOption } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { reasonMessage } from '@/domain/messages';
import { CATEGORY_LABELS, TRACKING_LABELS } from '@/domain/types';
import { deleteExercise, exerciseUsage } from '@/features/exercises/actions';
import { exerciseMedia } from '@/features/exercises/mediaSource';
import { MediaView } from '@/features/exercises/MediaView';
import { useExercise } from '@/features/exercises/hooks';
import { leaveScreen } from '@/features/workout/navigation';
import { radius } from '@/theme/spacing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

/** An exercise: its media, large and playing, and its description. Custom ones can be edited and deleted. */
export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercise(Number(id));
  const [menuOpen, setMenuOpen] = useState(false);
  // A stale link shows "not found". An exercise that goes away while mounted (deleted from here)
  // renders nothing, so "not found" doesn't flash on the way out.
  const [mountedWithExercise] = useState(exercise !== undefined);
  const back = (
    <IconButton icon="arrow_back" accessibilityLabel="Back" onPress={() => leaveScreen(router)} />
  );

  if (!exercise) {
    if (mountedWithExercise) return null;
    return (
      <Screen title="Exercise" left={back} bottomInset>
        <EmptyState
          icon="sports_basketball"
          title="Exercise not found"
          message="This exercise doesn't exist anymore."
          action={{ label: 'Back to Exercises', onPress: () => router.dismissTo('/exercises') }}
        />
      </Screen>
    );
  }

  const remove = () => {
    const result = deleteExercise(exercise.id);
    if (result.ok) leaveScreen(router);
    else Alert.alert("Couldn't delete exercise", reasonMessage(result.reason));
  };

  const confirmDelete = () => {
    const workouts = exerciseUsage(exercise.id);
    const removal =
      workouts > 0
        ? `It will be removed from ${workouts} ${workouts === 1 ? 'workout' : 'workouts'}. `
        : '';
    Alert.alert(`Delete "${exercise.name}"?`, `${removal}Your history stays.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  const options: ActionSheetOption[] = [
    {
      label: 'Edit',
      icon: 'edit',
      onPress: () => router.push(`/edit-exercise?exerciseId=${exercise.id}`),
    },
    { label: 'Delete', icon: 'delete', destructive: true, onPress: confirmDelete },
  ];

  return (
    <Screen
      title={exercise.name}
      subtitle={`${CATEGORY_LABELS[exercise.category]} · ${TRACKING_LABELS[exercise.trackingType]}`}
      left={back}
      right={
        // A predefined exercise is read-only: nothing to put in a menu.
        exercise.isCustom && (
          <IconButton
            icon="more_vert"
            accessibilityLabel="Exercise menu"
            onPress={() => setMenuOpen(true)}
          />
        )
      }
      bottomInset
    >
      <View testID="exercise-media">
        <MediaView
          media={exerciseMedia(exercise)}
          playing
          controls
          fit="contain"
          iconSize={48}
          style={styles.media}
        />
      </View>
      {exercise.description === '' ? (
        <AppText tone="muted">No description.</AppText>
      ) : (
        <AppText>{exercise.description}</AppText>
      )}
      {!exercise.isCustom && (
        <AppText variant="caption" tone="muted">
          Predefined exercise. It can&apos;t be edited.
        </AppText>
      )}
      <ActionSheet
        visible={menuOpen}
        title={exercise.name}
        options={options}
        onClose={() => setMenuOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  media: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
  },
});
