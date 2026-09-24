import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { colors } from '@/theme/colors';
import { radius, spacing, touch } from '@/theme/spacing';
import { Pressable, StyleSheet, View } from 'react-native';
import { deleteSet, updateSet } from './actions';
import type { SessionSetDetail } from './hooks';
import { setTable } from './setTable';

type CheckSetRowProps = {
  set: SessionSetDetail;
  /** 1-based position shown to the user. */
  number: number;
  /** False for an exercise's only set, which can't be deleted. */
  deletable: boolean;
};

export function CheckSetRow({ set, number, deletable }: CheckSetRowProps) {
  return (
    <SwipeToDelete
      testID={`set-${number}`}
      enabled={deletable}
      deleteLabel={`Delete set ${number}`}
      onDelete={() => deleteSet(set.id)}
    >
      <View style={setTable.row}>
        <View style={setTable.numberColumn}>
          <AppText variant="label" tone="muted">
            {number}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Set ${number} done`}
          accessibilityState={{ checked: set.completed }}
          onPress={() => updateSet(set.id, { completed: !set.completed })}
          style={[styles.toggle, set.completed && styles.done]}
        >
          {set.completed && <Icon name="check" color={colors.onAccent} />}
        </Pressable>
      </View>
    </SwipeToDelete>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: touch.min,
    height: touch.min,
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  done: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
});
