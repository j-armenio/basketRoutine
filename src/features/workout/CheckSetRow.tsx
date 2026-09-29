import { Icon } from '@/components/Icon';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { colors } from '@/theme/colors';
import { border, opacity, radius, size } from '@/theme/spacing';
import { Pressable, StyleSheet, View } from 'react-native';
import { deleteSet, updateSet } from './actions';
import type { SessionSetDetail } from './hooks';
import { SetNumber } from './SetNumber';
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
      onDelete={() => deleteSet(set.id).ok}
    >
      <View style={setTable.row}>
        <SetNumber number={number} />
        <View style={setTable.doneColumn}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Set ${number} done`}
            accessibilityState={{ checked: set.completed }}
            onPress={() => updateSet(set.id, { completed: !set.completed })}
            style={({ pressed }) => [
              setTable.doneBox,
              styles.toggle,
              set.completed && styles.done,
              pressed && styles.pressed,
            ]}
          >
            {set.completed && (
              <Icon name="check" size={size.iconLarge} color={colors.onSecondary} />
            )}
          </Pressable>
        </View>
      </View>
    </SwipeToDelete>
  );
}

const styles = StyleSheet.create({
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.input,
    borderWidth: border.outline,
    borderColor: colors.outlineStrong,
    backgroundColor: colors.surfaceRaised,
  },
  done: {
    borderColor: colors.secondaryOutline,
    backgroundColor: colors.secondary,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
