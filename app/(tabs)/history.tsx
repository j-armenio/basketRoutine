import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function HistoryScreen() {
  return (
    <Screen title="History">
      <EmptyState
        icon="history"
        title="No workouts yet"
        message="Finished workouts will show up here."
      />
    </Screen>
  );
}
