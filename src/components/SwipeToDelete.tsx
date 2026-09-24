import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AppText } from './AppText';
import { Icon } from './Icon';

const ACTION_WIDTH = 96;

type SwipeToDeleteProps = {
  /** Names the delete action for screen readers (e.g. "Delete set 2"). */
  deleteLabel: string;
  onDelete: () => void;
  /** When false the row doesn't move and has no delete action. */
  enabled?: boolean;
  testID?: string;
  children: ReactNode;
};

/**
 * Drag the row to the left to delete it: a red "Delete" area shows behind it, and letting go
 * past half of it deletes. Screen readers get the same thing as a "delete" accessibility action.
 */
export function SwipeToDelete({
  deleteLabel,
  onDelete,
  enabled = true,
  testID,
  children,
}: SwipeToDeleteProps) {
  return (
    <View
      testID={testID}
      accessibilityActions={enabled ? [{ name: 'delete', label: deleteLabel }] : []}
      onAccessibilityAction={(event) => {
        if (enabled && event.nativeEvent.actionName === 'delete') onDelete();
      }}
    >
      <ReanimatedSwipeable
        enabled={enabled}
        testID={testID && `${testID}-swipe`}
        friction={1.5}
        rightThreshold={ACTION_WIDTH / 2}
        overshootRight={false}
        dragOffsetFromRightEdge={spacing.lg}
        renderRightActions={() => (
          <View style={styles.action}>
            <Icon name="delete" color={colors.onAccent} />
            <AppText variant="label" style={styles.actionText}>
              Delete
            </AppText>
          </View>
        )}
        onSwipeableOpen={onDelete}
      >
        <View style={styles.row}>{children}</View>
      </ReanimatedSwipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger,
  },
  actionText: {
    color: colors.onAccent,
  },
});
