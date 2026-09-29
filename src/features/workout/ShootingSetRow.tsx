import { AppText } from '@/components/AppText';
import { fgTone } from '@/components/fgTone';
import { NumberInput } from '@/components/NumberInput';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import type { DomainErrorReason } from '@/domain/errors';
import { fgBand, setFgPct } from '@/domain/fg';
import { formatFgPct } from '@/domain/format';
import { reasonMessage } from '@/domain/messages';
import type { TargetMode } from '@/domain/types';
import { spacing } from '@/theme/spacing';
import { tabularNums } from '@/theme/typography';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { deleteSet, updateSet } from './actions';
import type { SessionSetDetail } from './hooks';
import { SetNumber } from './SetNumber';
import { columnRoles, setTable } from './setTable';
import type { SetField } from './setDraft';
import { useNumberCell } from './useNumberCell';

type ShootingSetRowProps = {
  set: SessionSetDetail;
  /** 1-based position shown to the user. */
  number: number;
  /** False for an exercise's only set, which can't be deleted. */
  deletable: boolean;
  targetMode: TargetMode;
};

type Rejection = { field: SetField; reason: DomainErrorReason };

export function ShootingSetRow({ set, number, targetMode, deletable }: ShootingSetRowProps) {
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const exercise = { targetMode };
  // The target is what the mode fixes (attempts or makes), the logged value the other one.
  const targetName = targetMode;
  const loggedName = targetMode === 'attempts' ? 'makes' : 'attempts';

  const cell = (field: SetField) => ({
    exercise,
    set,
    field,
    save: (value: number | null) => updateSet(set.id, { [field]: value }),
    onEdit: () => setRejection(null),
    onRejected: (reason: DomainErrorReason) => setRejection({ field, reason }),
  });
  const target = useNumberCell(cell('targetValue'));
  const logged = useNumberCell(cell('loggedValue'));

  const fg =
    set.targetValue === null
      ? null
      : setFgPct({ targetMode, targetValue: set.targetValue, loggedValue: set.loggedValue });

  const inputs = {
    targetValue: (
      <NumberInput
        size="compact"
        accessibilityLabel={`Set ${number} ${targetName}`}
        value={target.text}
        onFocus={target.onFocus}
        onChangeText={target.onChangeText}
        onBlur={target.onBlur}
        invalid={rejection?.field === 'targetValue'}
      />
    ),
    loggedValue: (
      <NumberInput
        accessibilityLabel={`Set ${number} ${loggedName}`}
        value={logged.text}
        onFocus={logged.onFocus}
        onChangeText={logged.onChangeText}
        onBlur={logged.onBlur}
        invalid={rejection?.field === 'loggedValue'}
      />
    ),
  };
  const roles = columnRoles(targetMode);
  const valueCell = (role: 'logged' | 'target') => (
    <View style={role === 'logged' ? setTable.loggedColumn : setTable.targetColumn}>
      {role === 'logged' ? inputs.loggedValue : inputs.targetValue}
    </View>
  );

  return (
    <SwipeToDelete
      testID={`set-${number}`}
      enabled={deletable}
      deleteLabel={`Delete set ${number}`}
      onDelete={() => deleteSet(set.id).ok}
    >
      <View style={styles.container}>
        <View style={setTable.row}>
          <SetNumber number={number} />
          {valueCell(roles.makes)}
          {valueCell(roles.attempts)}
          <View style={setTable.fgColumn}>
            <AppText
              variant="bodySmall"
              weight="bold"
              tone={fgTone(fgBand(fg))}
              style={tabularNums}
              accessibilityLabel={`Set ${number} FG%`}
            >
              {formatFgPct(fg)}
            </AppText>
          </View>
        </View>
        {rejection && (
          <AppText variant="caption" tone="error" style={styles.error} accessibilityRole="alert">
            {reasonMessage(rejection.reason)}
          </AppText>
        )}
      </View>
    </SwipeToDelete>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  error: {
    paddingLeft: spacing.xs,
  },
});
