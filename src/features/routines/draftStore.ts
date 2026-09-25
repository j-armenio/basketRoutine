import { useSyncExternalStore } from 'react';
import { isDirty, type TemplateDraft } from './templateDraft';

// The template being edited, in memory until Save. A module store (like `dataStore.ts`) because
// the picker, a separate route, has to add to it. Nothing here touches the DB.
interface DraftState {
  initial: TemplateDraft;
  current: TemplateDraft;
}

let state: DraftState | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notify = () => listeners.forEach((listener) => listener());

/**
 * Starts editing `initial`. It doesn't notify: it runs while the editor renders for the first
 * time, and the editor reads the draft right after, so nobody is left with a stale one.
 */
export function openDraft(initial: TemplateDraft): void {
  state = { initial, current: initial };
}

/** Does nothing when no draft is open: a row that unmounts after Save still runs its rollback. */
export function updateDraft(change: (draft: TemplateDraft) => TemplateDraft): void {
  if (!state) return;
  state = { ...state, current: change(state.current) };
  notify();
}

export function closeDraft(): void {
  if (!state) return;
  state = null;
  notify();
}

export function getDraft(): TemplateDraft | null {
  return state?.current ?? null;
}

export function useDraft(): TemplateDraft | null {
  return useSyncExternalStore(subscribe, getDraft, getDraft);
}

/** Whether the open draft has changes worth asking about before they are dropped. */
export function useDraftDirty(): boolean {
  return useSyncExternalStore(subscribe, isDraftDirty, isDraftDirty);
}

export function isDraftDirty(): boolean {
  return state !== null && isDirty(state.initial, state.current);
}
