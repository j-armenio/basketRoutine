import { fgTone } from './fgTone';

test.each([
  ['good', 'default', 'success'],
  ['poor', 'default', 'danger'],
  ['neutral', 'default', 'default'],
  ['neutral', 'muted', 'muted'],
  ['none', 'default', 'muted'],
] as const)('%s with neutral %s -> %s', (band, neutral, tone) => {
  expect(fgTone(band, neutral)).toBe(tone);
});
