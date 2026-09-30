/** @jest-environment node */
import { mediaKind } from '@/domain/media';
import { readdirSync } from 'fs';
import { join } from 'path';
import { CATEGORY_KEYS } from './catalogList';
import { CATEGORY_IMAGES } from './categoryImages';

const FOLDER = join(__dirname, '../../../assets/categories');
const filesInFolder = () =>
  readdirSync(FOLDER).filter((file) => !file.startsWith('.') && file !== 'README.md');

test('every file in assets/categories is listed in CATEGORY_IMAGES, and nothing else', () => {
  const listed = Object.values(CATEGORY_IMAGES).map((entry) => entry.file);
  expect([...listed].sort()).toEqual(filesInFolder().sort());
});

test('each entry is named after a card key and is a still image', () => {
  for (const [key, entry] of Object.entries(CATEGORY_IMAGES)) {
    expect(CATEGORY_KEYS).toContain(key);
    expect(entry.file.slice(0, entry.file.lastIndexOf('.'))).toBe(key);
    expect(mediaKind(entry.file)).toBe('image');
  }
});
