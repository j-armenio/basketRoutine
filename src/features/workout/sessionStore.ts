import { useSyncExternalStore } from 'react';

// A version counter over the session data. Every write bumps it, and the hooks re-read the DB
// when it changes, so the screens stay in sync with no focus listeners or prop drilling.
let version = 0;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySessionChanged(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function getSessionVersion(): number {
  return version;
}

export function useSessionVersion(): number {
  return useSyncExternalStore(subscribe, getSessionVersion, getSessionVersion);
}
