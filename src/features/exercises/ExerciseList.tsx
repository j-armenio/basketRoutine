import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import type { Exercise } from '@/db/types';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { SectionList, StyleSheet, View } from 'react-native';
import type { CategorySection } from './catalogList';
import { ExerciseRow } from './ExerciseRow';

type ExerciseListProps = {
  sections: CategorySection<Exercise>[];
  onPressExercise: (exercise: Exercise) => void;
  rightIcon?: AndroidSymbol;
  /** What the empty list says (default: "No exercises found"). */
  empty?: { title: string; message?: string };
  /** Room at the bottom, so the last row can scroll out from under a FAB. */
  bottomClearance?: number;
  /** A category's header over its rows (default). Off for a list of one category under its title. */
  sectionHeaders?: boolean;
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
  bottomClearance = 0,
  sectionHeaders = true,
}: ExerciseListProps) {
  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={{ paddingBottom: spacing.lg + bottomClearance }}
      sections={sections}
      keyExtractor={(exercise) => String(exercise.id)}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      ItemSeparatorComponent={Separator}
      renderSectionHeader={sectionHeaders ? SectionHeader : undefined}
      renderItem={({ item }) => (
        <ExerciseRow exercise={item} rightIcon={rightIcon} onPress={() => onPressExercise(item)} />
      )}
      ListEmptyComponent={<EmptyState icon="search" title={empty.title} message={empty.message} />}
    />
  );
}

const Separator = () => <View style={styles.separator} />;

const SectionHeader = ({ section }: { section: { title: string } }) => (
  <AppText
    variant="sectionHeader"
    tone="secondary"
    accessibilityRole="header"
    style={styles.sectionHeader}
  >
    {section.title}
  </AppText>
);

const styles = StyleSheet.create({
  list: {
    flex: 1,
    marginHorizontal: -spacing.screenPadding,
  },
  sectionHeader: {
    paddingHorizontal: spacing.screenPadding + spacing.xs,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xsPlus,
    backgroundColor: colors.background,
  },
  separator: {
    height: spacing.xsPlus,
  },
});
