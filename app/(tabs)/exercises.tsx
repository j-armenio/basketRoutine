import { ChipRow } from '@/components/ChipRow';
import { Fab, FAB_CLEARANCE } from '@/components/Fab';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '@/domain/types';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { useExerciseCount, useExercises } from '@/features/exercises/hooks';
import { useRouter } from 'expo-router';
import { useState } from 'react';

/** One chip at a time: everything, only the user's own exercises, or one category. */
type CatalogFilter = Category | 'all' | 'custom';

const FILTER_OPTIONS: { value: CatalogFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' },
  ...CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] })),
];

export default function ExercisesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const sections = useExercises({
    search,
    category: filter === 'all' || filter === 'custom' ? undefined : filter,
    customOnly: filter === 'custom',
  });
  // The whole catalog, so the subtitle doesn't change while searching.
  const count = useExerciseCount();

  return (
    <Screen
      title="Exercises"
      subtitle={`${count} ${count === 1 ? 'exercise' : 'exercises'}`}
      scroll={false}
    >
      <TextField
        icon="search"
        accessibilityLabel="Search exercises"
        placeholder="Search exercises"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        returnKeyType="search"
      />
      <ChipRow options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      <ExerciseList
        sections={sections}
        empty={
          filter === 'custom' && search.trim() === ''
            ? { title: 'No custom exercises yet', message: 'Create one with New Exercise.' }
            : undefined
        }
        bottomClearance={FAB_CLEARANCE}
        onPressExercise={(exercise) => router.push(`/exercise/${exercise.id}`)}
      />
      <Fab
        label="New Exercise"
        icon="add"
        accessibilityLabel="New exercise"
        onPress={() => router.push('/edit-exercise')}
      />
    </Screen>
  );
}
