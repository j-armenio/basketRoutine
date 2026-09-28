/** @jest-environment node */
import { SEED_EXERCISES } from '@/db/seed/exercises';
import { mediaKind } from '@/domain/media';
import { readdirSync } from 'fs';
import { join } from 'path';
import { exerciseMedia } from './mediaSource';
import { SEED_MEDIA } from './seedMedia';

const FOLDER = join(__dirname, '../../../assets/exercises');
const filesInFolder = () =>
  readdirSync(FOLDER).filter((file) => !file.startsWith('.') && file !== 'README.md');

test('every file in assets/exercises is listed in SEED_MEDIA, and nothing else', () => {
  const listed = Object.values(SEED_MEDIA).map((entry) => entry.file);
  expect([...listed].sort()).toEqual(filesInFolder().sort());
});

test('each entry is named after a seed key and has a supported kind', () => {
  const seedKeys = new Set(SEED_EXERCISES.map((exercise) => exercise.seedKey));
  for (const [key, entry] of Object.entries(SEED_MEDIA)) {
    expect(seedKeys.has(key)).toBe(true);
    expect(entry.file.slice(0, entry.file.lastIndexOf('.'))).toBe(key);
    expect(mediaKind(entry.file)).toBeDefined();
  }
});

describe('exerciseMedia', () => {
  test('a custom exercise shows its stored file', () => {
    expect(
      exerciseMedia({
        isCustom: true,
        seedKey: null,
        mediaUrl: 'file:///docs/exercise-media/a.mp4',
      }),
    ).toEqual({ kind: 'video', source: 'file:///docs/exercise-media/a.mp4' });
    expect(exerciseMedia({ isCustom: true, seedKey: null, mediaUrl: null })).toBeUndefined();
  });

  test('a predefined exercise shows only its bundled file, never a stored one', () => {
    SEED_MEDIA.free_throws = { file: 'free_throws.gif', source: 42 };
    try {
      expect(
        exerciseMedia({ isCustom: false, seedKey: 'free_throws', mediaUrl: 'file:///x/y.png' }),
      ).toEqual({ kind: 'gif', source: 42 });
      expect(
        exerciseMedia({ isCustom: false, seedKey: 'figure_8', mediaUrl: 'file:///x/y.png' }),
      ).toBeUndefined();
    } finally {
      delete SEED_MEDIA.free_throws;
    }
  });
});
