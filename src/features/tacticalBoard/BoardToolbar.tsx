import { Icon } from '@/components/Icon';
import { colors } from '@/theme/colors';
import { border, opacity, radius, size, spacing } from '@/theme/spacing';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BoardTool } from './boardEditor';

const TOOLS: { value: BoardTool; label: string; icon: AndroidSymbol }[] = [
  { value: 'hand', label: 'Hand', icon: 'pan_tool' },
  { value: 'x', label: 'X mark', icon: 'close' },
  { value: 'arrow', label: 'Arrow', icon: 'arrow_outward' },
  { value: 'pen', label: 'Pen', icon: 'edit' },
  { value: 'eraser', label: 'Eraser', icon: 'ink_eraser' },
];

type BoardToolbarProps = {
  tool: BoardTool;
  onTool: (tool: BoardTool) => void;
  /** Undo is off with nothing to undo. */
  canUndo: boolean;
  /** Clear is off on an empty board. */
  hasMarks: boolean;
  onUndo: () => void;
  onClear: () => void;
};

/**
 * The editor's tools, fixed at the bottom within the thumb's reach, in two rows: Undo and Clear
 * above, right-aligned in their own small rectangle; the 5 tools below, centered, in the bar that
 * spans the screen's width (one selected, filled pink). Goes in `Screen`'s `footer`.
 */
export function BoardToolbar({
  tool,
  onTool,
  canUndo,
  hasMarks,
  onUndo,
  onClear,
}: BoardToolbarProps) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.bar}>
      <View style={styles.actions}>
        <Action icon="undo" label="Undo" disabled={!canUndo} onPress={onUndo} />
        <Action icon="delete" label="Clear board" disabled={!hasMarks} onPress={onClear} />
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Drawing tools" style={styles.tools}>
        {TOOLS.map((item) => {
          const selected = item.value === tool;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="radio"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => onTool(item.value)}
              style={({ pressed }) => [
                styles.tool,
                selected && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name={item.icon}
                size={size.iconLarge}
                color={selected ? colors.onPrimary : colors.textPrimary}
              />
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function Action({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: AndroidSymbol;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={size.iconLarge} color={colors.iconMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // No background of its own: only the tools row below (the actual "bar") is filled, so it alone
  // reads as covering the bottom of the screen.
  bar: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  // Right-aligned above the tools row, in its own small rectangle: two icons don't need a whole
  // line's width.
  actions: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginRight: spacing.md,
    gap: spacing.xs,
    padding: spacing.xxs,
    borderRadius: radius.boardTool,
    backgroundColor: colors.backgroundDeep,
  },
  tools: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: border.hairline,
    borderTopColor: colors.divider,
    backgroundColor: colors.backgroundDeep,
  },
  tool: {
    width: size.boardTool,
    height: size.boardTool,
    borderRadius: radius.boardTool,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.primary,
  },
  action: {
    width: size.boardAction,
    height: size.boardAction,
    borderRadius: radius.boardTool,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: opacity.pressed,
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
