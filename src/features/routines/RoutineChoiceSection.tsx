import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import type { RoutineWithWorkouts } from '@/db/repositories/routines';
import { formatExerciseList } from '@/domain/format';
import { colors } from '@/theme/colors';
import { opacity, radius, size, spacing } from '@/theme/spacing';
import { Pressable, StyleSheet, View } from 'react-native';

type RoutineChoiceSectionProps = {
  routine: RoutineWithWorkouts;
  onPickWorkout: (workoutId: number) => void;
  onNewWorkout: () => void;
};

/**
 * A routine in the Add to Routine chooser, laid out like its section on the Workout tab: its
 * workouts to pick from, and "New Workout".
 */
export function RoutineChoiceSection({
  routine,
  onPickWorkout,
  onNewWorkout,
}: RoutineChoiceSectionProps) {
  return (
    <Card style={styles.section}>
      <AppText
        variant="sectionTitle"
        accessibilityRole="header"
        numberOfLines={1}
        style={styles.name}
      >
        {routine.name}
      </AppText>
      {routine.workouts.length === 0 && (
        <AppText variant="bodySmall" tone="secondary" style={styles.name}>
          No workouts in this routine yet.
        </AppText>
      )}
      {routine.workouts.map((workout) => (
        <Pressable
          key={workout.id}
          accessibilityRole="button"
          accessibilityLabel={`Add to ${workout.name}`}
          onPress={() => onPickWorkout(workout.id)}
          style={({ pressed }) => [styles.workout, pressed && styles.pressed]}
        >
          <View style={styles.texts}>
            <AppText weight="bold" numberOfLines={1}>
              {workout.name}
            </AppText>
            <AppText variant="subtitle" tone="secondary" numberOfLines={2}>
              {formatExerciseList(workout.exercises.map((item) => item.exercise.name))}
            </AppText>
          </View>
          <Icon name="add" size={size.icon} color={colors.primary} />
        </Pressable>
      ))}
      <Button
        variant="dashed"
        icon="add"
        label="New Workout"
        accessibilityLabel={`New workout in ${routine.name}`}
        fullWidth
        onPress={onNewWorkout}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.smPlus,
  },
  name: {
    paddingHorizontal: spacing.sm,
  },
  workout: {
    minHeight: size.buttonPrimaryHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
});
