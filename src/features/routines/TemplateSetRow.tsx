import { AppText } from '@/components/AppText';
import { NumberInput } from '@/components/NumberInput';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import type { DomainErrorReason } from '@/domain/errors';
import { reasonMessage } from '@/domain/messages';
import type { TargetMode } from '@/domain/types';
import { spacing } from '@/theme/spacing';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { setTable } from '../workout/setTable';
import { useNumberCell } from '../workout/useNumberCell';
import { updateDraft } from './draftStore';
import { deleteSet, setTarget, type DraftSet } from './templateDraft';

type TemplateSetRowProps = {
  exerciseKey: string;
  set: DraftSet;
  /** 1-based position shown to the user. */
  number: number;
  /** `null` for a `check` drill, which has no target to type. */
  targetMode: TargetMode | null;
  /** False for an exercise's only set, which can't be deleted. */
  deletable: boolean;
};

export function TemplateSetRow(props: TemplateSetRowProps) {
  const { exerciseKey, set, number, targetMode, deletable } = props;
  return (
    <SwipeToDelete
      testID={`set-${number}`}
      enabled={deletable}
      deleteLabel={`Delete set ${number}`}
      onDelete={() => updateDraft((draft) => deleteSet(draft, exerciseKey, set.key))}
    >
      {targetMode === null ? (
        <View style={setTable.row}>
          <View style={setTable.numberColumn}>
            <AppText variant="label" tone="muted">
              {number}
            </AppText>
          </View>
        </View>
      ) : (
        <TargetRow {...props} targetMode={targetMode} />
      )}
    </SwipeToDelete>
  );
}

function TargetRow({
  exerciseKey,
  set,
  number,
  targetMode,
}: TemplateSetRowProps & { targetMode: TargetMode }) {
  const [rejection, setRejection] = useState<DomainErrorReason | null>(null);
  const target = useNumberCell({
    exercise: { targetMode },
    set: { targetValue: set.targetValue, loggedValue: null },
    field: 'targetValue',
    save: (value) => {
      updateDraft((draft) => setTarget(draft, exerciseKey, set.key, value));
      return { ok: true };
    },
    onEdit: () => setRejection(null),
    onRejected: setRejection,
  });

  return (
    <View style={styles.container}>
      <View style={setTable.row}>
        <View style={setTable.numberColumn}>
          <AppText variant="label" tone="muted">
            {number}
          </AppText>
        </View>
        <View style={setTable.loggedColumn}>
          <NumberInput
            accessibilityLabel={`Set ${number} ${targetMode}`}
            value={target.text}
            onFocus={target.onFocus}
            onChangeText={target.onChangeText}
            onBlur={target.onBlur}
            invalid={rejection !== null}
          />
        </View>
      </View>
      {rejection && (
        <AppText variant="caption" tone="danger" style={styles.error} accessibilityRole="alert">
          {reasonMessage(rejection)}
        </AppText>
      )}
    </View>
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
