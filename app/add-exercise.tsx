import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ListItem } from '@/components/ListItem';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { db } from '@/db/client';
import { listExercises } from '@/db/repositories/exercises';
import type { Exercise } from '@/db/types';
import { reasonMessage } from '@/domain/messages';
import { CATEGORIES, CATEGORY_LABELS, type TargetMode } from '@/domain/types';
import { addExercise } from '@/features/workout/actions';
import { useInProgressSession } from '@/features/workout/hooks';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet } from 'react-native';

export default function AddExerciseScreen() {
  const router = useRouter();
  const session = useInProgressSession();
  // Redirects only when it mounts with no session (see the active workout).
  const [mountedWithSession] = useState(session !== undefined);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Exercise | null>(null);

  const sections = useMemo(() => {
    const found = listExercises(db, { search });
    return CATEGORIES.map((category) => ({
      title: CATEGORY_LABELS[category],
      data: found.filter((exercise) => exercise.category === category),
    })).filter((section) => section.data.length > 0);
  }, [search]);

  if (!session) return mountedWithSession ? null : <Redirect href="/" />;

  const add = (exercise: Exercise, targetMode?: TargetMode) => {
    const result = addExercise(session.id, exercise.id, targetMode);
    if (result.ok) router.back();
    else Alert.alert("Couldn't add exercise", reasonMessage(result.reason));
  };

  const pick = (exercise: Exercise) => {
    if (exercise.trackingType === 'check') add(exercise);
    else setPending(exercise);
  };

  return (
    <Screen
      title="Add Exercise"
      scroll={false}
      bottomInset
      left={<IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />}
    >
      <TextField
        accessibilityLabel="Search exercises"
        placeholder="Search exercises"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        returnKeyType="search"
      />
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
          <ListItem
            title={item.name}
            subtitle={item.trackingType === 'check' ? 'Check' : 'Makes / Attempts'}
            rightIcon="add"
            onPress={() => pick(item)}
          />
        )}
        ListEmptyComponent={<EmptyState icon="search" title="No exercises found" />}
      />
      <ActionSheet
        visible={pending !== null}
        title={pending ? `${pending.name}: what do you fix?` : undefined}
        options={[
          {
            label: 'Fixed attempts — log makes',
            icon: 'sports_basketball',
            onPress: () => pending && add(pending, 'attempts'),
          },
          {
            label: 'Fixed makes — log attempts',
            icon: 'check',
            onPress: () => pending && add(pending, 'makes'),
          },
        ]}
        onClose={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Rows run edge to edge: the screen's own side padding is taken back.
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
