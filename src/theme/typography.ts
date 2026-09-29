import type { TextStyle } from 'react-native';
import { fonts } from './fonts';

// The type scale of design-handoff/tokens.json. Android doesn't pick a font file from
// `fontWeight`, so each weight is its own family and no variant sets `fontWeight`.
export const typography = {
  /** Tab screen titles (Workout, Exercises, History) and the summary's. */
  display: { fontFamily: fonts.extraBold, fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  /** Detail screen titles. */
  titleLarge: { fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 36, letterSpacing: -0.4 },
  /** The active workout's and the forms' titles. */
  title: { fontFamily: fonts.extraBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  /** "Routines", History's FG%, the stats tiles. */
  headline: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 28 },
  /** Big numbers (50.7%, 1 / 1). */
  stat: {
    fontFamily: fonts.extraBold,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  /** The latest FG% on the History chart card (from the mockup). */
  statMedium: {
    fontFamily: fonts.extraBold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  /** An exercise's or a workout's name on a card. */
  cardTitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  /** Card titles (Quick Start, Shooting…), list row titles. */
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  /** List row subtitles, section headers and field labels (from the mockups). */
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  /** A list's section headers (a category, a month). */
  sectionHeader: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.3 },
  /** Card subtitles. */
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  /** Table headers (SET, MAKES…), tab labels, stats tile labels. */
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  /** The chart's axis labels (from the History mockup). */
  micro: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14 },
  button: { fontFamily: fonts.extraBold, fontSize: 16, lineHeight: 20, letterSpacing: 0.3 },
  /** The Workout tab's primary button, in capitals (START EMPTY WORKOUT). */
  buttonCaps: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  /** Small capital buttons (NEW ROUTINE, NEW WORKOUT). */
  buttonCompact: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Numbers that line up in columns: stats, tables, the timer. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };
