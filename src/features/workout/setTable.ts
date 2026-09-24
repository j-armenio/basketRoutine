import { spacing, touch } from '@/theme/spacing';
import { StyleSheet } from 'react-native';

// Column sizes shared by the table header and the set rows, so they line up.
export const setTable = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numberColumn: {
    width: touch.min,
    alignItems: 'center',
  },
  targetColumn: {
    width: 76,
  },
  loggedColumn: {
    flex: 1,
  },
  fgColumn: {
    width: 56,
    alignItems: 'flex-end',
  },
});
