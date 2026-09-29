// The color tokens of design-handoff/tokens.json, by the same names. Dark theme only.
export const colors = {
  /** Screen background. */
  background: '#1E1E24',
  /** The tab bar and the fixed bottom action bars. */
  backgroundDeep: '#121215',
  /** Cards, unselected chips, text fields. */
  surface: '#282830',
  /** Items and fields inside cards. */
  surfaceRaised: '#32323C',
  /** Top border of the fixed bars. */
  divider: '#2E2E36',
  /** Unselected chip border, dividers inside cards, chart grid. */
  outline: '#3A3A44',
  /** An empty check box's border (3:1 on surface). */
  outlineStrong: '#7A7C88',
  textPrimary: '#F5F6F8',
  /** Captions, labels, placeholders. */
  textSecondary: '#B4B6C0',
  /** Menu ⋮, chevrons, trash. */
  iconMuted: '#C4C6D0',
  /** The ball in media placeholders. */
  iconPlaceholder: '#8A8C96',
  /** Main actions: Start, Finish, Save, Done, Add to Routine, the FAB, Add Set, the chart line. */
  primary: '#F47C98',
  onPrimary: '#1E1E24',
  /** Behind the round play button. */
  primaryContainer: '#3A2830',
  /** Selected chips, the active tab, a done check box, the timer, New Routine. */
  secondary: '#2B5840',
  onSecondary: '#F5F6F8',
  /** Green outlines (the logged number field, New Workout, Choose media). */
  secondaryOutline: '#4E8F6B',
  /** Green text on the dark background (active tab label, New Workout, the Custom tag). */
  secondaryText: '#A8D5BA',
  /** FG% above 60%, a done check. */
  success: '#7FD1A0',
  /** FG% below 40%, Discard Workout, validation messages. */
  error: '#FF9580',
  /** FG% from 40 to 60%. */
  neutralStat: '#C4C6D0',
  /** Behind modals (dialogs, action sheets). Not a text color. */
  scrim: 'rgba(0, 0, 0, 0.6)',
};

export type ColorToken = keyof typeof colors;
