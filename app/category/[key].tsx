import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { categoryKeyLabel, exerciseCount, isCategoryKey } from '@/features/exercises/catalogList';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { useExercises } from '@/features/exercises/hooks';
import { leaveScreen } from '@/features/workout/navigation';
import { useLocalSearchParams, useRouter } from 'expo-router';

/**
 * The exercises of one category card: a category's (under its title, no section header), or
 * the user's own ones (`custom`), grouped by category.
 */
export default function CategoryScreen() {
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();
  const valid = isCategoryKey(key);
  const sections = useExercises(
    !valid ? {} : key === 'custom' ? { customOnly: true } : { category: key },
  );
  const back = (
    <IconButton icon="arrow_back" accessibilityLabel="Back" onPress={() => leaveScreen(router)} />
  );

  if (!valid) {
    return (
      <Screen title="Category" titleVariant="titleLarge" left={back} bottomInset>
        <EmptyState
          icon="search"
          title="Category not found"
          message="This category doesn't exist."
          action={{ label: 'Back to Exercises', onPress: () => router.dismissTo('/exercises') }}
        />
      </Screen>
    );
  }

  const count = sections.reduce((total, section) => total + section.data.length, 0);
  return (
    <Screen
      title={categoryKeyLabel(key)}
      titleVariant="titleLarge"
      subtitle={exerciseCount(count)}
      left={back}
      scroll={false}
      bottomInset
    >
      <ExerciseList
        sections={sections}
        sectionHeaders={key === 'custom'}
        empty={
          key === 'custom'
            ? {
                title: 'No custom exercises yet',
                message: 'Create one with the + button on the Exercises tab.',
              }
            : { title: 'No exercises yet' }
        }
        onPressExercise={(exercise) => router.push(`/exercise/${exercise.id}`)}
      />
    </Screen>
  );
}
