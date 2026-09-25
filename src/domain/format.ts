/** FG% as a whole percent, or an em dash when there is nothing to divide. */
export function formatFgPct(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`;
}

export type ParsedCount =
  { kind: 'empty' } | { kind: 'value'; value: number } | { kind: 'invalid' };

/**
 * Reads what a number cell holds: nothing, an integer, or something else. Some number pads
 * still offer `.`, `,` and `-`, so anything but digits is invalid.
 */
export function parseCount(text: string): ParsedCount {
  const trimmed = text.trim();
  if (trimmed === '') return { kind: 'empty' };
  if (!/^\d+$/.test(trimmed)) return { kind: 'invalid' };
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? { kind: 'value', value } : { kind: 'invalid' };
}

/** `42 min`, or `1 h 05 min` from one hour on. Rounds to the nearest minute. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes} min` : `${hours} h ${String(minutes).padStart(2, '0')} min`;
}

/** `Thu, Sep 24, 2026`, in English like the rest of the UI. */
export function formatWorkoutDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** `September 2026`, the History list's month headers. */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** `Free Throws, Mikan Drill, Layups`, or the first `max` names and `+N more`. */
export function formatExerciseList(names: readonly string[], max = 3): string {
  if (names.length === 0) return 'No exercises';
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} +${names.length - max} more`;
}
