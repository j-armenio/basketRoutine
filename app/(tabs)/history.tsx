import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { groupByMonth } from '@/features/history/historyList';
import { useHistory } from '@/features/history/hooks';
import { HistoryRow } from '@/features/history/HistoryRow';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

export default function HistoryScreen() {
  const router = useRouter();
  const items = useHistory();
  const sections = useMemo(() => groupByMonth(items), [items]);
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
          ItemSeparatorComponent={Separator}
          renderSectionHeader={({ section }) => (
            <AppText variant="label" tone="muted" style={styles.sectionHeader}>
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
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  separator: {
    height: spacing.md,
  },
});
