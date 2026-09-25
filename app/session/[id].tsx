import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { formatDuration, formatWorkoutDate } from '@/domain/format';
import { reasonMessage } from '@/domain/messages';
import { summarizeSession } from '@/domain/summary';
import { deleteSession } from '@/features/history/actions';
import { useFinishedSession } from '@/features/history/hooks';
import { SessionExerciseView } from '@/features/history/SessionExerciseView';
import { SessionTotals } from '@/features/history/SessionTotals';
import { leaveScreen } from '@/features/workout/navigation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

/** A finished session, read-only: the totals and every exercise as they were stored at Finish. */
export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useFinishedSession(Number(id));
  // A stale link shows "not found". A session that goes away while mounted (deleted from here)
  // renders nothing, so "not found" doesn't flash on the way out.
  const [mountedWithSession] = useState(session !== undefined);
  const back = (
    <IconButton icon="arrow_back" accessibilityLabel="Back" onPress={() => leaveScreen(router)} />
  );

  if (!session) {
    if (mountedWithSession) return null;
    return (
      <Screen title="Workout" left={back} bottomInset>
        <EmptyState
          icon="history"
          title="Workout not found"
          message="This workout doesn't exist or isn't finished."
          action={{ label: 'Back to History', onPress: () => router.dismissTo('/history') }}
        />
      </Screen>
    );
  }

  const date = formatWorkoutDate(session.startedAt);
  const duration = session.finishedAt
    ? session.finishedAt.getTime() - session.startedAt.getTime()
    : 0;

  const remove = () => {
    const result = deleteSession(session.id);
    if (result.ok) leaveScreen(router);
    else Alert.alert("Couldn't delete workout", reasonMessage(result.reason));
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete workout?',
      `${session.name} from ${date} will be removed from your history. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ],
    );

  return (
    <Screen
      title={session.name}
      subtitle={`${date} · ${formatDuration(duration)}`}
      left={back}
      right={
        <IconButton icon="delete" accessibilityLabel="Delete workout" onPress={confirmDelete} />
      }
      bottomInset
    >
      <SessionTotals summary={summarizeSession(session.exercises)} />
      {session.exercises.map((exercise) => (
        <SessionExerciseView key={exercise.id} exercise={exercise} />
      ))}
    </Screen>
  );
}
