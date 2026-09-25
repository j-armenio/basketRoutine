import { AppText } from '@/components/AppText';
import type { TargetMode } from '@/domain/types';
import { spacing } from '@/theme/spacing';
import { StyleSheet, View } from 'react-native';
import { setTable } from './setTable';

const MODE_SUBTITLE = {
  attempts: 'Fixed attempts · log makes',
  makes: 'Fixed makes · log attempts',
} as const;

/** The line under an exercise's name: what its mode fixes, and what the user logs. */
export function modeSubtitle(targetMode: TargetMode | null): string {
  return targetMode ? MODE_SUBTITLE[targetMode] : 'Check when done';
}

type SetTableHeaderProps = {
  /** `null` for a `check` drill. */
  targetMode: TargetMode | null;
  /**
   * Drops the logged and FG% columns (and the DONE column of a check drill), for the template
   * editor: the target is the only value, so its column takes the rest of the row.
   */
  hideLogged?: boolean;
};

/** The column titles above an exercise's sets, lined up with `setTable`. */
export function SetTableHeader({ targetMode, hideLogged = false }: SetTableHeaderProps) {
  const numberColumn = (
    <View style={setTable.numberColumn}>
      <HeaderLabel>SET</HeaderLabel>
    </View>
  );

  if (targetMode === null) {
    return (
      <View style={setTable.row}>
        {numberColumn}
        {!hideLogged && (
          <View style={styles.checkColumn}>
            <HeaderLabel>DONE</HeaderLabel>
          </View>
        )}
      </View>
    );
  }

  const target = targetMode === 'attempts' ? 'ATTEMPTS' : 'MAKES';
  const logged = targetMode === 'attempts' ? 'MAKES' : 'ATTEMPTS';
  return (
    <View style={setTable.row}>
      {numberColumn}
      <View style={hideLogged ? setTable.loggedColumn : setTable.targetColumn}>
        <HeaderLabel>{target}</HeaderLabel>
      </View>
      {!hideLogged && (
        <>
          <View style={setTable.loggedColumn}>
            <HeaderLabel>{logged}</HeaderLabel>
          </View>
          <View style={setTable.fgColumn}>
            <HeaderLabel>FG%</HeaderLabel>
          </View>
        </>
      )}
    </View>
  );
}

function HeaderLabel({ children }: { children: string }) {
  return (
    <AppText variant="caption" tone="muted" style={styles.label}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
  checkColumn: {
    width: 56,
    marginLeft: spacing.sm,
  },
});
