import { CATEGORIES, CATEGORY_LABELS, type Category } from '@/domain/types';

export interface CategorySection<T> {
  title: string;
  data: T[];
}

/** The exercises by category, in `CATEGORIES` order, each section keeping their order. Empty categories are left out. */
export function groupByCategory<T extends { category: Category }>(
  exercises: readonly T[],
): CategorySection<T>[] {
  return CATEGORIES.map((category) => ({
    title: CATEGORY_LABELS[category],
    data: exercises.filter((exercise) => exercise.category === category),
  })).filter((section) => section.data.length > 0);
}

/** A card of the Exercises tab: one category, or `custom` (the user's own exercises, any category). */
export type CategoryKey = Category | 'custom';

/** The cards in their order: the categories, then Custom. */
export const CATEGORY_KEYS: readonly CategoryKey[] = [...CATEGORIES, 'custom'];

export const isCategoryKey = (value: unknown): value is CategoryKey =>
  CATEGORY_KEYS.includes(value as CategoryKey);

export const categoryKeyLabel = (key: CategoryKey) =>
  key === 'custom' ? 'Custom' : CATEGORY_LABELS[key];

/** "1 exercise", "8 exercises". */
export const exerciseCount = (count: number) =>
  `${count} ${count === 1 ? 'exercise' : 'exercises'}`;

export interface CategoryCardData {
  key: CategoryKey;
  label: string;
  count: number;
}

/** The six cards with how many exercises each opens. An empty one is kept: its list says so. */
export function categoryCards(
  exercises: readonly { category: Category; isCustom: boolean }[],
): CategoryCardData[] {
  return CATEGORY_KEYS.map((key) => ({
    key,
    label: categoryKeyLabel(key),
    count: exercises.filter((exercise) =>
      key === 'custom' ? exercise.isCustom : exercise.category === key,
    ).length,
  }));
}
