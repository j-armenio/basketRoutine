import type { DomainErrorReason } from '@/domain/errors';
import type { TargetMode } from '@/domain/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { updateSet } from './actions';
import { evaluateDraft, type SetField } from './setDraft';

interface UseNumberCellOptions {
  exercise: { targetMode: TargetMode };
  set: { id: number; targetValue: number | null; loggedValue: number | null };
  field: SetField;
  /** Called on every edit and on focus, so the owner can drop its error. */
  onEdit: () => void;
  /** Called when an invalid entry was rolled back, or a write was refused. */
  onRejected: (reason: DomainErrorReason) => void;
}

/**
 * The draft rule of a number cell. While focused it shows what is typed; otherwise the stored
 * value, so a draft can never go out of sync with the DB. A keystroke that leaves the set valid
 * is saved at once. An invalid one is neither saved nor marked (it is often a prefix of a valid
 * value: "12" passes through "1"). On blur, or when the cell unmounts, an invalid draft is rolled
 * back to the value the cell had at focus (a prefix may have been saved on the way).
 */
export function useNumberCell(options: UseNumberCellOptions) {
  const { set, field } = options;
  const stored = set[field];
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const valueAtFocus = useRef<number | null>(null);
  const latest = useRef(options);

  useEffect(() => {
    latest.current = options;
  });

  /** Ends the edit. Returns the reason when an invalid draft had to be rolled back. */
  const settle = useCallback((): DomainErrorReason | null => {
    const text = draftRef.current;
    draftRef.current = null;
    if (text === null) return null;
    const { exercise, set: current, field: cellField } = latest.current;
    const result = evaluateDraft({ exercise, set: current, field: cellField, text });
    if (result.kind === 'valid') return null;
    if (current[cellField] !== valueAtFocus.current) {
      updateSet(current.id, { [cellField]: valueAtFocus.current });
    }
    return result.reason;
  }, []);

  // Minimizing with the keyboard open unmounts the row with the cell still focused.
  useEffect(() => () => void settle(), [settle]);

  const onFocus = () => {
    const text = stored === null ? '' : String(stored);
    valueAtFocus.current = stored;
    draftRef.current = text;
    setDraft(text);
    options.onEdit();
  };

  const onChangeText = (text: string) => {
    draftRef.current = text;
    setDraft(text);
    options.onEdit();
    const result = evaluateDraft({ exercise: options.exercise, set, field, text });
    if (result.kind !== 'valid' || result.value === stored) return;
    const saved = updateSet(set.id, { [field]: result.value });
    if (!saved.ok) options.onRejected(saved.reason);
  };

  const onBlur = () => {
    const reason = settle();
    setDraft(null);
    if (reason) options.onRejected(reason);
  };

  const text = draft ?? (stored === null ? '' : String(stored));
  return { text, onFocus, onChangeText, onBlur };
}
