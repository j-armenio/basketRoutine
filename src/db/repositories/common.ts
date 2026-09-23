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
