import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import {
  discardWorkout,
  finishWorkout,
  moveExercise,
  templateUpdateCandidate,
  updateTemplateFromSession,
} from '@/features/workout/actions';
import { ExerciseCard } from '@/features/workout/ExerciseCard';
import { useInProgressSession, useSessionDetail } from '@/features/workout/hooks';
import { leaveScreen } from '@/features/workout/navigation';
import { reasonMessage } from '@/domain/messages';
import { moveItem } from '@/domain/order';
import { countEmptySets, hasLoggedData, summarizeSession } from '@/domain/summary';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard } from 'react-native';

/**
 * After a Finish, offers to copy the session's structure to the template it came from, when that
 * differs. Reads by the captured id: the screen has no in-progress session left by then.
 */
function offerTemplateUpdate(sessionId: number) {
  const workout = templateUpdateCandidate(sessionId);
  if (!workout) return;
  Alert.alert(
    `Update "${workout.name}"?`,
    "Save this workout's exercises and sets to the template. Logged values and notes aren't copied.",
    [
      { text: 'Keep template', style: 'cancel' },
      {
        text: 'Update template',
        onPress: () => {
          const result = updateTemplateFromSession(sessionId);
          if (!result.ok) Alert.alert("Couldn't update template", reasonMessage(result.reason));
        },
      },
    ],
  );
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const session = useInProgressSession();
  const detail = useSessionDetail(session?.id);
  // A stale link redirects. A session that goes away while mounted (Finish, Discard) renders
  // nothing instead: a <Redirect> would race with the action's own navigation and could
  // replace the summary with `/`.
  const [mountedWithSession] = useState(session !== undefined);

  if (!session || !detail) return mountedWithSession ? null : <Redirect href="/" />;

  const discard = () => {
    if (discardWorkout(session.id).ok) leaveScreen(router);
  };

  const confirmDiscard = () =>
    Alert.alert('Discard workout?', 'Everything logged in this workout will be deleted.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discard },
    ]);

  const finish = () => {
    // Blurs a focused cell, so an invalid entry is rolled back before the user answers.
    Keyboard.dismiss();
    if (!hasLoggedData(summarizeSession(detail.exercises))) {
      Alert.alert(
        'Nothing logged yet',
        'Log at least one set to finish, or discard this workout.',
        [
          { text: 'Keep going', style: 'cancel' },
          { text: 'Discard workout', style: 'destructive', onPress: discard },
        ],
      );
      return;
    }
    const empty = countEmptySets(detail.exercises);
    Alert.alert(
      'Finish workout?',
      empty > 0
        ? `${empty} empty ${empty === 1 ? 'set' : 'sets'} won't count.`
        : 'It will be saved to your history.',
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => {
            if (!finishWorkout(session.id).ok) return;
            // The summary goes first, so it shows behind the question.
            router.replace(`/workout-summary/${session.id}`);
            offerTemplateUpdate(session.id);
          },
        },
      ],
    );
  };

  const ids = detail.exercises.map((exercise) => exercise.id);

  return (
    <Screen
      title={session.name}
      left={
        <IconButton
          icon="keyboard_arrow_down"
          accessibilityLabel="Minimize"
          onPress={() => leaveScreen(router)}
        />
      }
      right={<Button label="Finish" onPress={finish} />}
      bottomInset
      keyboardAvoiding
    >
      {detail.exercises.length === 0 ? (
        <EmptyState
          icon="sports_basketball"
          title="Add your first exercise"
          message="Pick a drill from the catalog and log every set."
        />
      ) : (
        detail.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index}
            count={ids.length}
            onMove={(delta) => moveExercise(session.id, moveItem(ids, index, delta))}
          />
        ))
      )}
      <Button
        variant="secondary"
        icon="add"
        label="Add Exercise"
        fullWidth
        onPress={() => router.push('/add-exercise')}
      />
      <Button variant="danger" label="Discard Workout" fullWidth onPress={confirmDiscard} />
    </Screen>
  );
}
