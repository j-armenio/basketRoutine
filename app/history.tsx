import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { groupByMonth } from '@/features/history/historyList';
import { useHistory } from '@/features/history/hooks';
import { HistoryRow } from '@/features/history/HistoryRow';
import { MonthHeader } from '@/features/history/MonthHeader';
import { workoutsLogged } from '@/features/profile/profileText';
import { leaveScreen } from '@/features/workout/navigation';
import { spacing } from '@/theme/spacing';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

/** Every finished session, by month, newest first: the Profile's "See all". */
export default function HistoryScreen() {
  const router = useRouter();
  const items = useHistory();
  const sections = useMemo(() => groupByMonth(items), [items]);

  return (
    <Screen
      title="History"
      titleVariant="titleLarge"
      subtitle={items.length > 0 ? workoutsLogged(items.length) : undefined}
      left={
        <IconButton
          icon="arrow_back"
          accessibilityLabel="Back"
          onPress={() => leaveScreen(router)}
        />
      }
      scroll={false}
      bottomInset
    >
      {items.length === 0 ? (
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
            <View style={[styles.sectionHeader, section === sections[0] && styles.firstHeader]}>
              <MonthHeader title={section.title} />
            </View>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  // Right under the title: no gap above.
  firstHeader: {
    paddingTop: spacing.xs,
  },
  separator: {
    height: spacing.itemGap,
  },
});
