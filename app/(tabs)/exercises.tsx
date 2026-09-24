import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { db } from '@/db/client';
import { listExercises } from '@/db/repositories/exercises';

export default function ExercisesScreen() {
  const count = listExercises(db).length;

  return (
    <Screen title="Exercises" subtitle={`${count} exercises`}>
      <EmptyState
        icon="format_list_bulleted"
        title="Catalog coming soon"
        message="Browsing and search are coming."
      />
    </Screen>
  );
}
