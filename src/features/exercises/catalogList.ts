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
