/**
 * The predefined exercises' media, bundled with the app and read-only: one file per exercise in
 * `assets/exercises/`, named after its seed key (`free_throws.gif`). Metro only bundles static
 * `require`s, so every file needs its line here, e.g.
 *
 *   free_throws: { file: 'free_throws.gif', source: require('../../../assets/exercises/free_throws.gif') },
 *
 * `seedMedia.test.ts` fails, naming the file, when the folder and this list disagree. An exercise
 * with no entry shows the placeholder.
 */
export const SEED_MEDIA: Record<string, { file: string; source: number }> = {};
