import { DomainError, type DomainErrorReason } from '@/domain/errors';
import { useState, useSyncExternalStore } from 'react';

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

const neverNotified = () => () => {};

/**
 * `useDataVersion` that only follows the store while `active`: an inactive screen (an unfocused
 * tab) neither subscribes nor re-renders on a bump, and returns the last version it saw while
 * active. Becoming active catches up to the current version. For a screen whose read is costly
 * and that stays mounted (the History list). The last version is kept with React's "adjust state
 * during render" pattern, so it needs no ref read and no effect.
 */
export function useDataVersionWhile(active: boolean): number {
  const current = useSyncExternalStore(
    active ? subscribe : neverNotified,
    getDataVersion,
    getDataVersion,
  );
  const [lastActive, setLastActive] = useState(current);
  if (active && lastActive !== current) setLastActive(current);
  return active ? current : lastActive;
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
