import type { CategoryKey } from './catalogList';

/**
 * The category cards' background images, bundled with the app: one file per card in
 * `assets/categories/`, named after its key (`shooting.jpg`). Metro only bundles static
 * `require`s, so every file needs its line here, e.g.
 *
 *   shooting: { file: 'shooting.jpg', source: require('../../../assets/categories/shooting.jpg') },
 *
 * `categoryImages.test.ts` fails, naming the file, when the folder and this list disagree. A card
 * with no entry shows the placeholder.
 */
export const CATEGORY_IMAGES: Partial<Record<CategoryKey, { file: string; source: number }>> = {};
