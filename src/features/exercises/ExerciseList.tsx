import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import type { Exercise } from '@/db/types';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { SectionList, StyleSheet } from 'react-native';
import type { CategorySection } from './catalogList';
import { ExerciseRow } from './ExerciseRow';

type ExerciseListProps = {
  sections: CategorySection<Exercise>[];
  onPressExercise: (exercise: Exercise) => void;
  rightIcon?: AndroidSymbol;
  /** What the empty list says (default: "No exercises found"). */
  empty?: { title: string; message?: string };
};

/**
 * The catalog grouped by category, edge to edge (the screen's own side padding is taken back).
 * Taps go through while the keyboard is open, for a search field above it.
 */
export function ExerciseList({
  sections,
  onPressExercise,
  rightIcon,
  empty = { title: 'No exercises found' },
}: ExerciseListProps) {
  return (
    <SectionList
      style={styles.list}
      sections={sections}
      keyExtractor={(exercise) => String(exercise.id)}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <AppText variant="label" tone="muted" style={styles.sectionHeader}>
          {section.title}
        </AppText>
      )}
      renderItem={({ item }) => (
        <ExerciseRow exercise={item} rightIcon={rightIcon} onPress={() => onPressExercise(item)} />
      )}
      ListEmptyComponent={<EmptyState icon="search" title={empty.title} message={empty.message} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    marginHorizontal: -spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
});
