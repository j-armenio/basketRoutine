import type { TargetMode } from '@/domain/types';
import { size, spacing } from '@/theme/spacing';
import { StyleSheet } from 'react-native';

// Column sizes shared by the table header and the set rows, so they line up. The columns are
// always SET · MAKES · ATTEMPTS · FG%, in both modes.
export const setTable = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smPlus,
  },
  numberColumn: {
    width: size.setNumberColumn,
    alignItems: 'center',
  },
  /** The value the user logs: the emphasized field takes the room. */
  loggedColumn: {
    flex: 1,
  },
  /** The fixed target. */
  targetColumn: {
    width: size.setValueColumn,
  },
  /** A read-only value (history): both value columns share the room. */
  valueColumn: {
    flex: 1,
    alignItems: 'center',
  },
  // Fits `99.9%`, the widest FG%.
  fgColumn: {
    width: size.setFgColumn,
    alignItems: 'flex-end',
  },
  /** A check drill's done box. */
  doneColumn: {
    width: size.setValueColumn,
    alignItems: 'center',
  },
  /** The 52 dp done box. */
  doneBox: {
    width: size.checkboxCell,
    height: size.checkboxCell,
  },
});

/** Which of MAKES and ATTEMPTS the mode fixes: the other one is what the user logs. */
export function columnRoles(targetMode: TargetMode) {
  return targetMode === 'attempts'
    ? ({ makes: 'logged', attempts: 'target' } as const)
    : ({ makes: 'target', attempts: 'logged' } as const);
}
