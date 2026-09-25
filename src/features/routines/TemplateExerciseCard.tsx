import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { spacing } from '@/theme/spacing';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SetTableHeader, modeSubtitle } from '../workout/SetTableHeader';
import { updateDraft } from './draftStore';
import { TemplateSetRow } from './TemplateSetRow';
import { addSet, moveExercise, removeExercise, type DraftExercise } from './templateDraft';

type TemplateExerciseCardProps = {
  exercise: DraftExercise;
  index: number;
  count: number;
};

/** An exercise of the template being edited: its sets hold targets only, nothing is logged. */
export function TemplateExerciseCard({ exercise, index, count }: TemplateExerciseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const confirmRemove = () =>
    Alert.alert('Remove exercise?', `${exercise.name} and its sets will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => updateDraft((draft) => removeExercise(draft, exercise.key)),
      },
    ]);
  const move = (delta: -1 | 1) => updateDraft((draft) => moveExercise(draft, exercise.key, delta));

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.titles}>
          <AppText variant="heading">{exercise.name}</AppText>
          <AppText variant="caption" tone="muted">
            {modeSubtitle(exercise.targetMode)}
          </AppText>
        </View>
        <IconButton
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
          { label: 'Remove exercise', icon: 'delete', destructive: true, onPress: confirmRemove },
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
  titles: {
    flex: 1,
  },
  table: {
    gap: spacing.sm,
  },
});
