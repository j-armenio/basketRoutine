import { ActionSheet } from '@/components/ActionSheet';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import type { Exercise } from '@/db/types';
import { reasonMessage } from '@/domain/messages';
import type { TargetMode } from '@/domain/types';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { useExercises } from '@/features/exercises/hooks';
import { getDraft, updateDraft } from '@/features/routines/draftStore';
import { addExercise as addToTemplate } from '@/features/routines/templateDraft';
import { addExercise } from '@/features/workout/actions';
import { useInProgressSession } from '@/features/workout/hooks';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

export default function AddExerciseScreen() {
  const router = useRouter();
  // `?to=template` adds to the template being edited instead of the session in progress.
  const { to } = useLocalSearchParams<{ to?: string }>();
  const toTemplate = to === 'template';
  const session = useInProgressSession();
  // Redirects only when it mounts with nothing to add to (see the active workout).
  const [mountedWithTarget] = useState(toTemplate ? getDraft() !== null : session !== undefined);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Exercise | null>(null);

  // Follows the data version: an exercise created from here shows up on return.
  const sections = useExercises({ search });

  if (!toTemplate && !session) return mountedWithTarget ? null : <Redirect href="/" />;
  if (toTemplate && !mountedWithTarget) return <Redirect href="/" />;

  const add = (exercise: Exercise, targetMode?: TargetMode) => {
    if (toTemplate) {
      updateDraft((draft) => addToTemplate(draft, exercise, targetMode ?? null));
      router.back();
      return;
    }
    if (!session) return;
    const result = addExercise(session.id, exercise.id, targetMode);
    if (result.ok) router.back();
    else Alert.alert("Couldn't add exercise", reasonMessage(result.reason));
  };

  const pick = (exercise: Exercise) => {
    if (exercise.trackingType === 'check') add(exercise);
    else setPending(exercise);
  };

  return (
    <Screen
      title="Add Exercise"
      scroll={false}
      bottomInset
      left={<IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />}
      right={
        <IconButton
          icon="add"
          accessibilityLabel="New exercise"
          onPress={() => router.push('/edit-exercise')}
        />
      }
    >
      <TextField
        accessibilityLabel="Search exercises"
        placeholder="Search exercises"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        returnKeyType="search"
      />
      <ExerciseList sections={sections} rightIcon="add" onPressExercise={pick} />
      <ActionSheet
        visible={pending !== null}
        title={pending ? `${pending.name}: what do you fix?` : undefined}
        options={[
          {
            label: 'Fixed attempts — log makes',
            icon: 'sports_basketball',
            onPress: () => pending && add(pending, 'attempts'),
          },
          {
            label: 'Fixed makes — log attempts',
            icon: 'check',
            onPress: () => pending && add(pending, 'makes'),
          },
        ]}
        onClose={() => setPending(null)}
      />
    </Screen>
  );
}
