import { AppText } from '@/components/AppText';
import { NumberInput } from '@/components/NumberInput';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import type { DomainErrorReason } from '@/domain/errors';
import { setFgPct } from '@/domain/fg';
import { formatFgPct } from '@/domain/format';
import { reasonMessage } from '@/domain/messages';
import type { TargetMode } from '@/domain/types';
import { spacing } from '@/theme/spacing';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { deleteSet, updateSet } from './actions';
import type { SessionSetDetail } from './hooks';
import { setTable } from './setTable';
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

  return (
    <SwipeToDelete
      testID={`set-${number}`}
      enabled={deletable}
      deleteLabel={`Delete set ${number}`}
      onDelete={() => deleteSet(set.id)}
    >
      <View style={styles.container}>
        <View style={setTable.row}>
          <View style={setTable.numberColumn}>
            <AppText variant="label" tone="muted">
              {number}
            </AppText>
          </View>
          <View style={setTable.targetColumn}>
            <NumberInput
              size="compact"
              accessibilityLabel={`Set ${number} ${targetName}`}
              value={target.text}
              onFocus={target.onFocus}
              onChangeText={target.onChangeText}
              onBlur={target.onBlur}
              invalid={rejection?.field === 'targetValue'}
            />
          </View>
          <View style={setTable.loggedColumn}>
            <NumberInput
              accessibilityLabel={`Set ${number} ${loggedName}`}
              value={logged.text}
              onFocus={logged.onFocus}
              onChangeText={logged.onChangeText}
              onBlur={logged.onBlur}
              invalid={rejection?.field === 'loggedValue'}
            />
          </View>
          <View style={setTable.fgColumn}>
            <AppText variant="label" tone="muted" accessibilityLabel={`Set ${number} FG%`}>
              {formatFgPct(fg)}
            </AppText>
          </View>
        </View>
        {rejection && (
          <AppText variant="caption" tone="danger" style={styles.error} accessibilityRole="alert">
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
