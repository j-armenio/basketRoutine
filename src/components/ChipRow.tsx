import { colors } from '@/theme/colors';
import { radius, spacing, touch } from '@/theme/spacing';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { AppText } from './AppText';

type ChipRowProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Shows the selection but ignores taps. */
  disabled?: boolean;
};

/** A horizontally scrollable row of single-select chips. */
export function ChipRow<T extends string>({ options, value, onChange, disabled }: ChipRowProps<T>) {
  return (
    <ScrollView
      horizontal
      accessibilityRole="radiogroup"
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled: !!disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              selected && styles.selected,
              disabled && !selected && styles.dimmed,
            ]}
          >
            <AppText
              variant="label"
              style={{
                color: selected ? colors.onAccent : disabled ? colors.textDisabled : colors.text,
              }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView grows by default, which would push the list below it away.
  row: {
    flexGrow: 0,
  },
  content: {
    gap: spacing.sm,
  },
  chip: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  selected: {
    backgroundColor: colors.accent,
  },
  dimmed: {
    opacity: 0.6,
  },
});
