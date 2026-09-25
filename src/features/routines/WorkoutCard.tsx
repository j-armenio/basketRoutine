import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import type { WorkoutInRoutine } from '@/db/repositories/routines';
import { formatExerciseList } from '@/domain/format';
import { colors } from '@/theme/colors';
import { radius, spacing, touch } from '@/theme/spacing';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { deleteWorkout } from './actions';

type WorkoutCardProps = {
  workout: WorkoutInRoutine;
  index: number;
  count: number;
  onStart: () => void;
  onEdit: () => void;
  onMove: (delta: -1 | 1) => void;
};

/** A template on the Workout tab: tap the body to edit it, "Start" to begin a session from it. */
export function WorkoutCard({ workout, index, count, onStart, onEdit, onMove }: WorkoutCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const confirmDelete = () =>
    Alert.alert(`Delete "${workout.name}"?`, 'Your history stays.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout(workout.id) },
    ]);

  return (
    <Card>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${workout.name}`}
          onPress={onEdit}
          style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        >
          <AppText variant="heading" numberOfLines={1}>
            {workout.name}
          </AppText>
          <AppText tone="muted" numberOfLines={2}>
            {formatExerciseList(workout.exercises.map((item) => item.exercise.name))}
          </AppText>
        </Pressable>
        <IconButton
          icon="more_vert"
          accessibilityLabel={`${workout.name} menu`}
          onPress={() => setMenuOpen(true)}
        />
      </View>
      <Button
        label="Start"
        icon="play_arrow"
        accessibilityLabel={`Start ${workout.name}`}
        fullWidth
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  body: {
    flex: 1,
    minHeight: touch.min,
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceElevated,
  },
});
