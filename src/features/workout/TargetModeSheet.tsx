import { ActionSheet } from '@/components/ActionSheet';
import type { TargetMode } from '@/domain/types';

type TargetModeSheetProps = {
  /** The shooting drill being added; `null` keeps the sheet closed. */
  exerciseName: string | null;
  onPick: (targetMode: TargetMode) => void;
  onClose: () => void;
};

/** Asks which value a shooting drill fixes, before it is added (to a session or a template). */
export function TargetModeSheet({ exerciseName, onPick, onClose }: TargetModeSheetProps) {
  return (
    <ActionSheet
      visible={exerciseName !== null}
      title={exerciseName ? `${exerciseName}: what do you fix?` : undefined}
      options={[
        {
          label: 'Fixed attempts — log makes',
          icon: 'sports_basketball',
          onPress: () => onPick('attempts'),
        },
        {
          label: 'Fixed makes — log attempts',
          icon: 'check',
          onPress: () => onPick('makes'),
        },
      ]}
      onClose={onClose}
    />
  );
}
