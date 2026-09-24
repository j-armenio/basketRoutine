import { moveItem } from './order';

test('moves an item up and down', () => {
  expect(moveItem([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
  expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
});

test('keeps the order at the ends and for a bad index', () => {
  expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  expect(moveItem([1, 2, 3], 5, -1)).toEqual([1, 2, 3]);
  expect(moveItem([], 0, 1)).toEqual([]);
});

test('returns a new array and leaves the input alone', () => {
  const input = [1, 2, 3];
  const result = moveItem(input, 0, 1);
  expect(result).not.toBe(input);
  expect(input).toEqual([1, 2, 3]);
  expect(moveItem(input, 0, -1)).not.toBe(input);
});
