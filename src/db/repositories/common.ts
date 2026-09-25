import { DomainError } from '@/domain/errors';
import type { ValidationResult } from '@/domain/validation';

/** Trims a user-provided name and rejects an empty one. */
export function requireName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') throw new DomainError('empty_name');
  return trimmed;
}

/** Turns a failed validation result into a thrown `DomainError`. */
export function assertValid(result: ValidationResult): void {
  if (!result.ok) throw new DomainError(result.reason);
}

/** Next `position` for a list whose current highest position is `max`. */
export function nextPosition(max: number | null | undefined): number {
  return (max ?? -1) + 1;
}

/** `orderedIds` must be exactly `currentIds`, each once and in any order, or `invalid_order`. */
export function assertSameIds(currentIds: readonly number[], orderedIds: readonly number[]): void {
  const unique = new Set(orderedIds);
  if (
    unique.size !== orderedIds.length ||
    orderedIds.length !== currentIds.length ||
    !currentIds.every((id) => unique.has(id))
  ) {
    throw new DomainError('invalid_order');
  }
}
