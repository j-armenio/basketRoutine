import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { useFinishedSessionCount } from '@/features/workout/hooks';

export default function HistoryScreen() {
  const count = useFinishedSessionCount();

  return (
    <Screen
      title="History"
      subtitle={count > 0 ? `${count} ${count === 1 ? 'workout' : 'workouts'} logged` : undefined}
    >
      {count === 0 ? (
        <EmptyState
          icon="history"
          title="No workouts yet"
          message="Finished workouts will show up here."
        />
      ) : (
        <EmptyState
          icon="history"
          title="Your history is coming"
          message="Your finished workouts are saved. The list is coming soon."
        />
      )}
    </Screen>
  );
}
