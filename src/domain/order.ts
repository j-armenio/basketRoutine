/**
 * Swaps the item at `index` with its neighbor (`delta` -1 moves it up, +1 down). Returns a new
 * array, in the same order when the move would leave the list.
 */
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  const result = [...items];
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
