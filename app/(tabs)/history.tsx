import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { FgEvolutionCard } from '@/features/history/FgEvolutionCard';
import { fgEvolution, groupByMonth } from '@/features/history/historyList';
import { useHistory } from '@/features/history/hooks';
import { HistoryRow } from '@/features/history/HistoryRow';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

/** How many sessions the FG% evolution chart shows. */
const EVOLUTION_COUNT = 5;

export default function HistoryScreen() {
  const router = useRouter();
  const items = useHistory();
  const sections = useMemo(() => groupByMonth(items), [items]);
  // A component rather than an element: the list hands its header props to its scroll view.
  const header = useCallback(
    () => <FgEvolutionCard points={fgEvolution(items, EVOLUTION_COUNT)} />,
    [items],
  );
  const count = items.length;

  return (
    <Screen
      title="History"
      scroll={false}
      subtitle={count > 0 ? `${count} ${count === 1 ? 'workout' : 'workouts'} logged` : undefined}
    >
      {count === 0 ? (
        <EmptyState
          icon="history"
          title="No workouts yet"
          message="Finished workouts will show up here."
        />
      ) : (
        <SectionList
          style={styles.list}
          contentContainerStyle={styles.content}
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={header}
          ItemSeparatorComponent={Separator}
          renderSectionHeader={({ section }) => (
            <AppText
              variant="sectionHeader"
              tone="secondary"
              accessibilityRole="header"
              style={styles.sectionHeader}
            >
              {section.title}
            </AppText>
          )}
          renderItem={({ item }) => (
            <HistoryRow item={item} onPress={() => router.push(`/session/${item.id}`)} />
          )}
        />
      )}
    </Screen>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  separator: {
    height: spacing.itemGap,
  },
});
