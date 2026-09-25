import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { reasonMessage } from '@/domain/messages';
import { saveWorkout } from '@/features/routines/actions';
import {
  closeDraft,
  openDraft,
  updateDraft,
  useDraft,
  useDraftDirty,
} from '@/features/routines/draftStore';
import { loadDraft } from '@/features/routines/loadDraft';
import { TemplateExerciseCard } from '@/features/routines/TemplateExerciseCard';
import { rename, toSaveInput } from '@/features/routines/templateDraft';
import { leaveScreen } from '@/features/workout/navigation';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

const parseId = (value: string | undefined) => (value === undefined ? undefined : Number(value));

/**
 * The template editor: `?routineId=` creates a workout in that routine, `?workoutId=` edits one.
 * Edits live in the in-memory draft (see `draftStore`) until Save. Cancel drops them.
 */
export default function EditWorkoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ routineId?: string; workoutId?: string }>();
  // Opens the draft while rendering for the first time, so the editor never renders without one.
  const [loaded] = useState(() => {
    const initial = loadDraft({
      workoutId: parseId(params.workoutId),
      routineId: parseId(params.routineId),
    });
    if (initial) openDraft(initial);
    return initial !== null;
  });
  const draft = useDraft();
  const dirty = useDraftDirty();
  // Set before the editor's own navigation (after Save or Discard). The guard's `dirty` comes from
  // the last render, so it would still block that navigation.
  const leaving = useRef(false);

  useEffect(() => closeDraft, []);

  usePreventRemove(dirty, ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert('Discard changes?', 'Your changes to this workout will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          leaving.current = true;
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  if (!loaded) {
    return (
      <Screen title="Edit Workout" bottomInset>
        <EmptyState
          icon="sports_basketball"
          title="Workout not found"
          message="This workout doesn't exist anymore."
          action={{ label: 'Back to Workout', onPress: () => leaveScreen(router) }}
        />
      </Screen>
    );
  }
  // After Save the draft is closed while the screen is still on its way out.
  if (!draft) return null;

  const close = () => {
    leaving.current = true;
    closeDraft();
    leaveScreen(router);
  };

  const save = () => {
    // Nothing changed on an existing workout: no write. A new one always goes through the
    // repository, which says what is missing.
    if (draft.workoutId !== undefined && !dirty) {
      close();
      return;
    }
    const result = saveWorkout(toSaveInput(draft));
    if (result.ok) close();
    else Alert.alert("Couldn't save workout", reasonMessage(result.reason));
  };

  return (
    <Screen
      title={draft.workoutId === undefined ? 'New Workout' : 'Edit Workout'}
      left={
        <IconButton icon="close" accessibilityLabel="Cancel" onPress={() => leaveScreen(router)} />
      }
      right={<Button label="Save" onPress={save} />}
      bottomInset
      keyboardAvoiding
    >
      <TextField
        accessibilityLabel="Workout name"
        placeholder="Workout name"
        value={draft.name}
        onChangeText={(name) => updateDraft((current) => rename(current, name))}
        autoFocus={draft.workoutId === undefined}
        returnKeyType="done"
      />
      {draft.exercises.length === 0 ? (
        <EmptyState
          icon="sports_basketball"
          title="Add your first exercise"
          message="Pick a drill from the catalog and set the target of every set."
        />
      ) : (
        draft.exercises.map((exercise, index) => (
          <TemplateExerciseCard
            key={exercise.key}
            exercise={exercise}
            index={index}
            count={draft.exercises.length}
          />
        ))
      )}
      <Button
        variant="secondary"
        icon="add"
        label="Add Exercise"
        fullWidth
        onPress={() => router.push('/add-exercise?to=template')}
      />
    </Screen>
  );
}
