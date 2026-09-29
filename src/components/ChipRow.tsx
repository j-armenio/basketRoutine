import { colors } from '@/theme/colors';
import { border, opacity, radius, size, spacing } from '@/theme/spacing';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';

type ChipRowProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Shows the selection but ignores taps. */
  disabled?: boolean;
  /**
   * Wraps the chips onto more lines (a form). Otherwise they scroll sideways, edge to edge (a
   * filter above a list).
   */
  wrap?: boolean;
};

/**
 * Single-select chips. The selected one is green with a check icon, so the color isn't the only
 * signal.
 */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  disabled,
  wrap = false,
}: ChipRowProps<T>) {
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="radio"
        accessibilityLabel={option.label}
        accessibilityState={{ selected, disabled: !!disabled }}
        disabled={disabled}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [
          styles.chip,
          selected && styles.selected,
          pressed && styles.pressed,
          disabled && !selected && styles.dimmed,
        ]}
      >
        {selected && (
          <Icon
            name="check"
            size={size.iconSmall}
            color={colors.onSecondary}
            testID={`${option.label} selected`}
          />
        )}
        <AppText
          variant="bodySmall"
          weight={selected ? 'bold' : 'semiBold'}
          style={{ color: selected ? colors.onSecondary : colors.textPrimary }}
        >
          {option.label}
        </AppText>
      </Pressable>
    );
  });

  if (wrap) {
    return (
      <View accessibilityRole="radiogroup" style={styles.wrap}>
        {chips}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      accessibilityRole="radiogroup"
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView grows by default, which would push the list below it away. It runs to
  // the screen's edges, so the chips scroll under them.
  row: {
    flexGrow: 0,
    marginHorizontal: -spacing.screenPadding,
  },
  content: {
    gap: spacing.chipGap,
    paddingHorizontal: spacing.screenPadding,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.chipGap,
  },
  chip: {
    minHeight: size.chipHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xsPlus,
    paddingHorizontal: spacing.lg + spacing.xxs,
    borderRadius: radius.chip,
    borderWidth: border.outline,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  selected: {
    paddingLeft: spacing.mdPlus,
    borderColor: colors.secondaryOutline,
    backgroundColor: colors.secondary,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  dimmed: {
    opacity: opacity.disabled,
  },
});
