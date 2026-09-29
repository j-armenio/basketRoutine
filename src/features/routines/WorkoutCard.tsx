import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import type { WorkoutInRoutine } from '@/db/repositories/routines';
import { formatExerciseList } from '@/domain/format';
import { colors } from '@/theme/colors';
import { opacity, size, spacing } from '@/theme/spacing';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { deleteWorkout } from './actions';

type WorkoutCardProps = {
  workout: WorkoutInRoutine;
  index: number;
  count: number;
  onStart: () => void;
  onEdit: () => void;
  onMove: (delta: -1 | 1) => void;
};

/** A template on the Workout tab: tap the body to edit it, the play button to begin a session from it. */
export function WorkoutCard({ workout, index, count, onStart, onEdit, onMove }: WorkoutCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const confirmDelete = () =>
    Alert.alert(`Delete "${workout.name}"?`, 'Your history stays.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout(workout.id) },
    ]);

  return (
    <Card variant="raised" style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${workout.name}`}
        onPress={onEdit}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <AppText weight="bold" numberOfLines={1}>
          {workout.name}
        </AppText>
        <AppText variant="subtitle" tone="secondary" numberOfLines={2}>
          {formatExerciseList(workout.exercises.map((item) => item.exercise.name))}
        </AppText>
      </Pressable>
      <IconButton
        icon="more_vert"
        color={colors.iconMuted}
        accessibilityLabel={`${workout.name} menu`}
        onPress={() => setMenuOpen(true)}
      />
      <IconButton
        variant="play"
        icon="play_arrow"
        accessibilityLabel={`Start ${workout.name}`}
        onPress={onStart}
      />
      <ActionSheet
        visible={menuOpen}
        title={workout.name}
        options={[
          { label: 'Edit', icon: 'edit', onPress: onEdit },
          {
            label: 'Move up',
            icon: 'arrow_upward',
            disabled: index === 0,
            onPress: () => onMove(-1),
          },
          {
            label: 'Move down',
            icon: 'arrow_downward',
            disabled: index === count - 1,
            onPress: () => onMove(1),
          },
          { label: 'Delete', icon: 'delete', destructive: true, onPress: confirmDelete },
        ]}
        onClose={() => setMenuOpen(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  body: {
    flex: 1,
    minHeight: size.minTouchTarget,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
