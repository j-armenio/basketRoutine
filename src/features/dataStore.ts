import { DomainError, type DomainErrorReason } from '@/domain/errors';
import { useSyncExternalStore } from 'react';

// A version counter over the app's data. Every write bumps it, and the hooks re-read the DB when
// it changes, so the screens stay in sync with no focus listeners or prop drilling. One counter
// is enough at this size: every read is a sub-millisecond sync query.
let version = 0;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyDataChanged(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function getDataVersion(): number {
  return version;
}

export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, getDataVersion, getDataVersion);
}

export type ActionResult<T> = { ok: true; value: T } | { ok: false; reason: DomainErrorReason };

/**
 * Every data write goes through here (from a feature's `actions.ts`): it calls the repository,
 * tells the store, and turns a `DomainError` into a reason the screen can show. Any other error
 * is rethrown, so a real bug still shows up. A failed write doesn't notify: nothing changed.
 */
export function run<T>(write: () => T): ActionResult<T> {
  let value: T;
  try {
    value = write();
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, reason: error.reason };
    throw error;
  }
  notifyDataChanged();
  return { ok: true, value };
}
