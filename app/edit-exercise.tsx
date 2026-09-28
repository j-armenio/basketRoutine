import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipRow } from '@/components/ChipRow';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import type { Exercise } from '@/db/types';
import { pickedMedia, type PickedMedia } from '@/domain/media';
import { reasonMessage } from '@/domain/messages';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  TRACKING_LABELS,
  TRACKING_TYPES,
  type Category,
  type TrackingType,
} from '@/domain/types';
import { createExercise, updateExercise, type MediaChange } from '@/features/exercises/actions';
import { useExercise } from '@/features/exercises/hooks';
import { exerciseMedia } from '@/features/exercises/mediaSource';
import { MediaView } from '@/features/exercises/MediaView';
import { leaveScreen } from '@/features/workout/navigation';
import { radius, spacing } from '@/theme/spacing';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

const CATEGORY_OPTIONS = CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));
const TRACKING_OPTIONS = TRACKING_TYPES.map((value) => ({ value, label: TRACKING_LABELS[value] }));

const PICK_MESSAGES = {
  too_long: 'Choose a video of 30 seconds or less.',
  unsupported: "This file type isn't supported. Choose an image, a GIF or a video.",
};

const parseId = (value: string | undefined) => (value === undefined ? undefined : Number(value));

/** The exercise form: no param creates, `?exerciseId=` edits a custom exercise. */
export default function EditExerciseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const editingId = parseId(params.exerciseId);
  const exercise = useExercise(editingId);

  // A predefined exercise is read-only.
  if (editingId !== undefined && !exercise?.isCustom) {
    return (
      <Screen
        title="Edit Exercise"
        left={
          <IconButton
            icon="close"
            accessibilityLabel="Cancel"
            onPress={() => leaveScreen(router)}
          />
        }
        bottomInset
      >
        <EmptyState
          icon="sports_basketball"
          title="Exercise not found"
          message="This exercise doesn't exist anymore, or can't be edited."
          action={{ label: 'Back', onPress: () => leaveScreen(router) }}
        />
      </Screen>
    );
  }
  // The form keeps the values it opened with: later changes to the exercise don't reset it.
  return <ExerciseForm exercise={exercise} />;
}

function ExerciseForm({ exercise }: { exercise: Exercise | undefined }) {
  const router = useRouter();
  const editing = exercise !== undefined;
  const [name, setName] = useState(exercise?.name ?? '');
  const [category, setCategory] = useState<Category>(exercise?.category ?? 'shooting');
  const [trackingType, setTrackingType] = useState<TrackingType>(
    exercise?.trackingType ?? 'makes_attempts',
  );
  const [description, setDescription] = useState(exercise?.description ?? '');
  const [media, setMedia] = useState<MediaChange>({ type: 'keep' });
  const [error, setError] = useState<string | null>(null);

  const shownMedia =
    media.type === 'replace'
      ? { kind: media.media.kind, source: media.media.uri }
      : media.type === 'remove' || !exercise
        ? undefined
        : exerciseMedia(exercise);

  const change =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setError(null);
    };

  const chooseMedia = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 1,
    });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return;
    const picked = pickedMedia(asset);
    if (picked.ok) {
      setMedia({ type: 'replace', media: picked.media });
      setError(null);
    } else {
      setError(PICK_MESSAGES[picked.reason]);
    }
  };

  const save = () => {
    const replacement: PickedMedia | undefined = media.type === 'replace' ? media.media : undefined;
    const result = exercise
      ? updateExercise(exercise.id, { name, category, description }, media)
      : createExercise({ name, category, trackingType, description }, replacement);
    if (result.ok) leaveScreen(router);
    else setError(reasonMessage(result.reason));
  };

  return (
    <Screen
      title={editing ? 'Edit Exercise' : 'New Exercise'}
      left={
        <IconButton icon="close" accessibilityLabel="Cancel" onPress={() => leaveScreen(router)} />
      }
      right={<Button label="Save" onPress={save} />}
      bottomInset
      keyboardAvoiding
    >
      <Field label="Name">
        <TextField
          accessibilityLabel="Exercise name"
          placeholder="Exercise name"
          value={name}
          onChangeText={change(setName)}
          autoFocus={!editing}
          returnKeyType="done"
        />
      </Field>
      <Field label="Media">
        <View testID="exercise-media">
          <MediaView media={shownMedia} playing fit="contain" iconSize={40} style={styles.media} />
        </View>
        <View style={styles.mediaButtons}>
          <Button
            variant="secondary"
            icon="photo_library"
            label={shownMedia ? 'Change media' : 'Choose media'}
            onPress={chooseMedia}
          />
          {shownMedia && (
            <Button
              variant="danger"
              label="Remove media"
              onPress={() => {
                setMedia({ type: 'remove' });
                setError(null);
              }}
            />
          )}
        </View>
      </Field>
      <Field label="Category">
        <ChipRow options={CATEGORY_OPTIONS} value={category} onChange={change(setCategory)} />
      </Field>
      <Field label="Tracking type">
        <ChipRow
          options={TRACKING_OPTIONS}
          value={trackingType}
          onChange={change(setTrackingType)}
          disabled={editing}
        />
        {editing && (
          <AppText variant="caption" tone="muted">
            Tracking type can&apos;t be changed after the exercise is created
          </AppText>
        )}
      </Field>
      <Field label="Description">
        <TextField
          accessibilityLabel="Description"
          placeholder="How to do the drill"
          value={description}
          onChangeText={change(setDescription)}
          multiline
          maxLines={8}
        />
      </Field>
      {error && (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      )}
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  media: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
  },
  mediaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
