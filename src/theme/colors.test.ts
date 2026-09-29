import { colors } from './colors';

function channel(hex: string, start: number) {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

function contrast(foreground: string, background: string) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

type Token = keyof typeof colors;

// Every text-on-background pair the design uses. Outlines and the empty check box's border are
// non-text (3:1), and the scrim isn't a color text sits on.
const readablePairs: [Token, Token][] = [
  ...(['background', 'backgroundDeep', 'surface', 'surfaceRaised'] as const).flatMap(
    (background): [Token, Token][] => [
      ['textPrimary', background],
      ['textSecondary', background],
      ['iconMuted', background],
      ['success', background],
      ['error', background],
      ['neutralStat', background],
      ['secondaryText', background],
      ['primary', background],
    ],
  ),
  ['onPrimary', 'primary'],
  ['primary', 'primaryContainer'],
  ['onSecondary', 'secondary'],
];

test.each(readablePairs)('%s on %s has at least 4.5:1 contrast', (foreground, background) => {
  expect(contrast(colors[foreground], colors[background])).toBeGreaterThanOrEqual(4.5);
});
