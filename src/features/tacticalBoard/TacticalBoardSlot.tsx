import { Icon } from '@/components/Icon';
import { describeBoard, type TacticalBoard } from '@/domain/tacticalBoard';
import { colors } from '@/theme/colors';
import { border, opacity, radius, size, spacing } from '@/theme/spacing';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CourtBoard } from './CourtBoard';
import { COURT_ASPECT } from './courtGeometry';

type TacticalBoardSlotProps = {
  board: TacticalBoard | null;
  /** Names the thumbnail for screen readers. */
  exerciseName: string;
  /** Opens the editor. Absent: read only (History). */
  onOpen?: () => void;
  /**
   * `card` (default): full width, below the header, a badge opens the editor. `icon`: a 48 dp
   * thumbnail sized like a header icon button, replacing the "add board" one once there is a
   * board (the template editor).
   */
  variant?: 'card' | 'icon';
};

/** The `icon` variant's court, inside its 48 dp button minus the frame's own border. */
const ICON_COURT_WIDTH = size.iconButton - 2 * border.hairline;

/**
 * An exercise's tactical board: nothing until there is one (the header's ⊞ icon adds it), then a
 * thumbnail that opens the editor — the whole court below the header (`card`), or a small one in
 * the header itself (`icon`).
 */
export function TacticalBoardSlot({
  board,
  exerciseName,
  onOpen,
  variant = 'card',
}: TacticalBoardSlotProps) {
  const [width, setWidth] = useState(0);

  if (!board) return null;

  if (variant === 'icon') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open tactical board for ${exerciseName}`}
        accessibilityHint={describeBoard(board)}
        onPress={onOpen}
        style={({ pressed }) => [styles.iconTouch, pressed && styles.pressed]}
      >
        <View style={[styles.frame, styles.iconFrame]}>
          <CourtBoard board={board} width={ICON_COURT_WIDTH} compact />
        </View>
      </Pressable>
    );
  }

  const drawing = (
    <View
      style={styles.frame}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - 2 * border.hairline)}
    >
      {width > 0 && <CourtBoard board={board} width={width} compact />}
    </View>
  );

  if (!onOpen) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={describeBoard(board)}>
        {drawing}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open tactical board for ${exerciseName}`}
      accessibilityHint={describeBoard(board)}
      onPress={onOpen}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {drawing}
      <View style={styles.badge}>
        <Icon name="open_in_full" size={size.iconSmall} color={colors.textPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: COURT_ASPECT,
    borderRadius: radius.courtThumbnail,
    borderWidth: border.hairline,
    borderColor: colors.courtFrame,
    backgroundColor: colors.court,
    overflow: 'hidden',
  },
  // A header icon button's footprint, the (slightly shorter) court frame centered inside it.
  iconTouch: {
    width: size.iconButton,
    height: size.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFrame: {
    width: size.iconButton,
  },
  badge: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: size.boardBadge,
    height: size.boardBadge,
    borderRadius: radius.boardBadge,
    backgroundColor: colors.boardBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
