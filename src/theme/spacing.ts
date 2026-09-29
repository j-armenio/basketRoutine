// Spacing, radii and sizes of design-handoff/tokens.json, plus the in-between steps the mockups use.
export const spacing = {
  xxs: 2,
  xs: 4,
  /** 6 */
  xsPlus: 6,
  sm: 8,
  /** 10 */
  smPlus: 10,
  md: 12,
  /** 14 */
  mdPlus: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  // The named tokens.
  screenPadding: 16,
  screenTop: 40,
  sectionGap: 16,
  cardPadding: 20,
  cardPaddingCompact: 16,
  itemGap: 12,
  chipGap: 8,
};

export const radius = {
  card: 20,
  button: 16,
  input: 14,
  cell: 12,
  chip: 24,
  /** The extended FAB (from the Exercises mockup). */
  fab: 18,
  pill: 999,
};

export const size = {
  minTouchTarget: 48,
  buttonPrimaryHeight: 56,
  inputHeight: 52,
  chipHeight: 48,
  iconButton: 48,
  playButton: 52,
  checkboxCell: 52,
  listThumbnail: 64,
  bottomNavHeight: 88,
  icon: 22,
  // From the mockups.
  iconSmall: 18,
  iconButtonGlyph: 20,
  iconLarge: 24,
  placeholderIcon: 48,
  /** The timer pill's height. */
  pill: 36,
  /** The active tab's pill. */
  navPillWidth: 64,
  navPillHeight: 32,
  /** A number cell (the target) and the emphasized one (the logged value). */
  numberCell: 48,
  numberCellEmphasized: 56,
  /** The set table's columns (from the active workout mockup): SET, a fixed value, FG%. */
  setNumberColumn: 36,
  setValueColumn: 92,
  setFgColumn: 56,
  /** The exercise detail's media. */
  mediaHero: 180,
  /** The exercise form's media. */
  mediaForm: 200,
  /** The red area a set row reveals when dragged left. */
  swipeAction: 96,
  /** A multi-line text field's minimum height (the exercise form's description). */
  textArea: 96,
  /** The chart's plot height, axis labels included. */
  chartHeight: 150,
};

/** Pressed and disabled states: the tokens have no colors for them. */
export const opacity = {
  pressed: 0.8,
  disabled: 0.4,
};

export const elevation = {
  fab: '0px 6px 18px rgba(0, 0, 0, 0.45)',
};

/** Border widths: dividers and the fixed bars' top edge, and the chips' and fields' outlines. */
export const border = {
  hairline: 1,
  outline: 1.5,
};
