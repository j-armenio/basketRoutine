import { fgTone } from './fgTone';

test.each([
  ['good', 'success'],
  ['poor', 'error'],
  ['neutral', 'neutral'],
  ['none', 'secondary'],
] as const)('%s -> %s', (band, tone) => {
  expect(fgTone(band)).toBe(tone);
});
