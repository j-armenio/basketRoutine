import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TacticalBoardSlot } from '../tacticalBoard/TacticalBoardSlot';
import { SetTableHeader, modeSubtitle } from '../workout/SetTableHeader';
import { updateDraft } from './draftStore';
import { TemplateSetRow } from './TemplateSetRow';
import {
  addSet,
  moveExercise,
  removeExercise,
  setBoard,
  type DraftExercise,
} from './templateDraft';

type TemplateExerciseCardProps = {
  exercise: DraftExercise;
  index: number;
  count: number;
  /** Holding the header to drag the card and reorder: on activation, on every following move (the
   * finger's translation from there), and on release. See `DraggableExerciseList`. */
  onDragStart: () => void;
  onDragMove: (translationY: number) => void;
  onDragEnd: () => void;
};

/** An exercise of the template being edited: its sets hold targets only, nothing is logged. */
export function TemplateExerciseCard({
  exercise,
  index,
  count,
  onDragStart,
  onDragMove,
  onDragEnd,
}: TemplateExerciseCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Holding the title starts a drag (a quick tap elsewhere in the header still reaches its own
  // buttons untouched); `runOnJS` because the move only ever touches plain JS state.
  const drag = Gesture.Pan()
    .activateAfterLongPress(400)
    .runOnJS(true)
    .onStart(onDragStart)
    .onUpdate((event) => onDragMove(event.translationY))
    .onFinalize(onDragEnd);

  const confirmRemove = () =>
    Alert.alert('Remove exercise?', `${exercise.name} and its sets will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => updateDraft((draft) => removeExercise(draft, exercise.key)),
      },
    ]);
  const confirmRemoveBoard = () =>
    Alert.alert('Remove tactical board?', `The drawing on ${exercise.name} will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => updateDraft((draft) => setBoard(draft, exercise.key, null)),
      },
    ]);
  const move = (delta: -1 | 1) => updateDraft((draft) => moveExercise(draft, exercise.key, delta));

  return (
    <Card variant="compact" style={styles.card}>
      <View style={styles.header}>
        <GestureDetector gesture={drag}>
          <View style={styles.titles}>
            <AppText variant="cardTitle">{exercise.name}</AppText>
            <AppText variant="caption" tone="secondary">
              {modeSubtitle(exercise.targetMode)}
            </AppText>
          </View>
        </GestureDetector>
        {exercise.tacticalBoard ? (
          <TacticalBoardSlot
            board={exercise.tacticalBoard}
            exerciseName={exercise.name}
            onOpen={() => router.push(`/tactical-board?draftKey=${exercise.key}`)}
            variant="icon"
          />
        ) : (
          <IconButton
            color={colors.iconMuted}
            icon="assignment_add"
            accessibilityLabel={`Add tactical board for ${exercise.name}`}
            onPress={() => router.push(`/tactical-board?draftKey=${exercise.key}`)}
          />
        )}
        <IconButton
          color={colors.iconMuted}
          icon="more_vert"
          accessibilityLabel={`${exercise.name} menu`}
          onPress={() => setMenuOpen(true)}
        />
      </View>
      <View style={styles.table}>
        <SetTableHeader targetMode={exercise.targetMode} hideLogged />
        {exercise.sets.map((set, position) => (
          <TemplateSetRow
            key={set.key}
            exerciseKey={exercise.key}
            set={set}
            number={position + 1}
            targetMode={exercise.targetMode}
            deletable={exercise.sets.length > 1}
          />
        ))}
      </View>
      <Button
        variant="ghost"
        icon="add"
        label="Add Set"
        fullWidth
        onPress={() => updateDraft((draft) => addSet(draft, exercise.key))}
      />
      <ActionSheet
        visible={menuOpen}
        title={exercise.name}
        options={[
          {
            label: 'Move up',
            icon: 'arrow_upward',
            disabled: index === 0,
            onPress: () => move(-1),
          },
          {
            label: 'Move down',
            icon: 'arrow_downward',
            disabled: index === count - 1,
            onPress: () => move(1),
          },
          ...(exercise.tacticalBoard
            ? [
                {
                  label: 'Remove tactical board',
                  icon: 'layers_clear' as const,
                  destructive: true,
                  onPress: confirmRemoveBoard,
                },
              ]
            : []),
          { label: 'Remove exercise', icon: 'delete', destructive: true, onPress: confirmRemove },
        ]}
        onClose={() => setMenuOpen(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  // Like the active workout's card.
  card: {
    paddingRight: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titles: {
    flex: 1,
    gap: spacing.xxs,
    paddingTop: spacing.xs,
  },
  table: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
});
