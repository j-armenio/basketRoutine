import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { exerciseCount } from '@/features/exercises/catalogList';
import { CategoryGrid } from '@/features/exercises/CategoryCard';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { useCategoryCards, useExerciseCount, useExercises } from '@/features/exercises/hooks';
import { spacing } from '@/theme/spacing';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

/**
 * The catalog: a card per category (and one for the user's own exercises), each opening its
 * list. Typing in the search swaps the cards for the matching exercises of every category.
 */
export default function ExercisesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const searching = search.trim() !== '';
  const results = useExercises({ search });
  const cards = useCategoryCards();
  // The whole catalog, so the subtitle doesn't change while searching.
  const count = useExerciseCount();

  return (
    <Screen
      title="Exercises"
      subtitle={exerciseCount(count)}
      // Rarely needed, so a plain button up here rather than a FAB.
      right={
        <IconButton
          icon="add"
          variant="outlined"
          accessibilityLabel="New exercise"
          onPress={() => router.push('/edit-exercise')}
        />
      }
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
      {searching ? (
        <ExerciseList
          sections={results}
          onPressExercise={(exercise) => router.push(`/exercise/${exercise.id}`)}
        />
      ) : (
        <ScrollView
          style={styles.cards}
          contentContainerStyle={styles.cardsContent}
          keyboardShouldPersistTaps="handled"
        >
          <CategoryGrid
            cards={cards}
            onPressCard={(card) => router.push(`/category/${card.key}`)}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: {
    flex: 1,
  },
  cardsContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
});
