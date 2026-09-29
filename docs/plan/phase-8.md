# Phase 8 — Visual Redesign (detailed plan)

Detailed plan for Phase 8 of [PLAN.md](PLAN.md).

**Goal:** apply the developer's new design, handed off as `design-handoff/` (`DESIGN.md`, `tokens.json` and eight HTML mockups; folded into [`docs/design.md`](../design.md) once built, then deleted), to the whole app, and add the few features that came with it: an **elapsed timer** in the active workout, an **FG% evolution chart** on History, **per-exercise stats** and **Add to Routine** on the exercise detail. The logic, data, navigation and behavior that work today are kept: this is a new visual layer plus those features, not a rewrite. No schema change.

**Done when:** on the phone (Expo Go), every screen follows the new look (the eight mockups, and the screens without a mockup following their patterns), the timer counts the real time of the workout, the chart and the stats show the real history, and Add to Routine lands in the template editor. `lint`, `format:check`, `typecheck`, `test` and `expo-doctor` pass, `db:generate` leaves the migrations unchanged, and CI is green on the phase commit.

## Decisions for this phase

| Topic | Decision |
|---|---|
| Source of truth | `design-handoff/DESIGN.md` (rules, color roles, patterns), `design-handoff/tokens.json` (every value) and `design-handoff/screens/*.html` (measures; 1 px = 1 dp, 390 dp wide). The mockups are a visual reference, translated into the app's own components, not copied. **Screens without a mockup** (template editor, exercise picker, Add to Routine chooser, Resume banner, dialogs, action sheet, empty and "not found" states) **follow the patterns of the ones that have one** (developer's rule, 2026-09-28): same header, cards, buttons, bottom action bar, list rows and chips. |
| Theme | `src/theme/` keeps its files, with their content replaced from `tokens.json`: `colors.ts` holds the token names as they are (`background`, `backgroundDeep`, `surface`, `surfaceRaised`, `divider`, `outline`, `outlineStrong`, `textPrimary`, `textSecondary`, `iconMuted`, `iconPlaceholder`, `primary`, `onPrimary`, `primaryContainer`, `secondary`, `onSecondary`, `secondaryOutline`, `secondaryText`, `success`, `error`, `neutralStat`); the orange accent and the old names go. Only dark mode. `typography.ts` holds the twelve variants (`display` … `button`), `spacing.ts` the spacing, radius and size tokens. What the tokens don't name gets a token of its own, never a loose value in a screen: a small numeric spacing scale for the mockups' in-between gaps (4, 6, 10, 14), the modal `scrim`, the FAB shadow (`elevation.fab`), the chart's two text sizes (11 and 12, from the History mockup), and opacities for the pressed and disabled states (the tokens have no pressed or disabled colors, and new colors aren't allowed). `colors.test.ts` checks the text pairs the design uses (≥ 4.5:1). |
| Font | **Plus Jakarta Sans**, weights 400 / 600 / 700 / 800, as four static TTF files in `assets/fonts/` with the OFL license next to them (developer's choice, 2026-09-28: files, no npm dependency). Loaded by `useFonts` (expo-font, already installed) behind the splash, with the icon font; if it fails the app carries on with the system font. Android doesn't pick a font file from `fontWeight`, so **each weight is its own `fontFamily`** and the typography variants set the family, not the weight. Numbers in stats, tables and the timer use `tabular-nums`. |
| Tab bar | A custom `TabBar` (the `tabBar` prop of the tabs layout): 88 dp plus the bottom inset, `backgroundDeep`, `divider` top border, the active item with a 64 × 32 `secondary` pill behind its icon and a `secondaryText` label, labels in the `label` style (uppercase through `textTransform`, so the text stays "Workout"). Keeps the `tab` role, `tabBarAccessibilityLabel` and the selected state (the navigation tests find tabs that way), hides with the keyboard like today, and keeps the Resume banner above it. |
| Bottom action bar | `BottomActionBar`: `backgroundDeep`, `divider` top border, a full-width `primary` button of 56 dp, bottom safe area. It is `Screen`'s new `footer`, outside the scroll view, and hides while the keyboard is open (like the tab bar; hiding the keyboard already leaves the field). Used by the active workout (**Finish Workout**), the exercise form (**Save Exercise**), the exercise detail (**Add to Routine**) and, following the pattern, the template editor (**Save**). |
| Texts | The UI texts stay as they are, except the three the brief names after the mockup: "Finish" → **"Finish Workout"**, the exercise form's "Save" → **"Save Exercise"** (new and edit), the Exercises tab's "+" → the extended FAB **"New Exercise"** (its accessibility label was already "New exercise"). Accessibility labels stay (tests and TalkBack users rely on them). The Workout tab's buttons are uppercase on screen, as in the mockup, through `textTransform`. |
| Set table | Columns **always `SET · MAKES · ATTEMPTS · FG%`**, on the active workout, the history detail and the header, in both modes. **The field the user logs is the emphasized one** (developer-approved recommendation): it takes the flexible column, 56 dp tall, `secondaryOutline` border, 22 / 800; the fixed target is the plain one (92 dp, 48 dp tall, 17 / 700). So in "Fixed attempts · log makes" MAKES is emphasized (the mockup), in "Fixed makes · log attempts" ATTEMPTS is. The template editor keeps its single target column. A check set's box is 52 dp: `secondary` with a check when done, `surfaceRaised` with an `outlineStrong` border when not. |
| FG% colors | `> 60%` `success`, `40–60%` `neutralStat`, `< 40%` `error`, on the percent rounded in tenths as today. **60% exactly is now neutral** (it was good): `fgBand` tests `tenths > FG_GOOD_PCT * 10`. `fgTone(band)` loses its `neutral` argument: neutral is always `neutralStat`, no value (`—`) is `textSecondary`. Every FG% keeps its number (color is never the only signal), the Your stats tiles included. |
| Elapsed timer | In the active workout's header, a `secondary` pill with a timer icon: `mm:ss`, and `h:mm:ss` from one hour on. Computed from `sessions.startedAt` (already saved when a session starts) against the clock, re-rendered every second, so it stays right after minimizing or closing the app. The `timer` accessibility role with an "Elapsed time" label. |
| Duration | `finishedAt − startedAt` was already right: the "0 min" rows were test workouts under 30 s rounded to 0 (confirmed with the developer). `formatDuration` now shows **`< 1 min`** under one minute. |
| FG% evolution | A card at the top of History: the last **5** finished sessions that have a shooting set (sessions with only check drills are skipped), oldest to newest; the latest value large with "latest workout"; a line chart with a 0 / 50 / 100% axis, one dot per session, the latest dot larger with its value above, and date labels under the points (consecutive sessions of the same day share one label). Drawn with plain `View`s (line segments are rotated thin views), no dependency (developer's choice, 2026-09-28). The chart is one `image` element whose label lists every point. Hidden when no session has a shooting set. Pure function `fgEvolution(items, 5)` in `historyList.ts`, from the rows History already reads. |
| Your stats | On the exercise detail, from the finished sessions that hold this exercise (`session_exercises.exercise_id`, so a renamed custom exercise keeps its history). A new repository read (`listExerciseResults`) and a pure `exerciseStats` in `src/domain/`. **Shooting:** BEST FG% (the best session), AVERAGE (Σmakes / Σattempts over every session, the project's aggregate rule, not an average of percents), SESSIONS; then the 3 most recent sessions: date, `makes / attempts`, FG%. **Check:** SESSIONS and DONE (`completed / total` over every session), recent sessions as `x / y done`. An exercise twice in one session counts once, summed. No session yet: the card says so. |
| Add to Routine | An exercise goes into a workout (template) of a routine, not into the routine itself. The bottom bar opens a chooser (a new modal route, `add-to-routine?exerciseId=`): the routines as sections with their workouts, and "New Workout" in each. Picking one (and, for a shooting drill, the target mode, the same sheet as the picker) **opens the template editor with the exercise already added at the end**, dirty, so the developer sets the targets and taps Save (developer's choice, 2026-09-28). Templates still change only through the editor's Save. No routine yet: an empty state. |
| Data model | No schema change. **No migration.** `db:generate` must leave `src/db/migrations` unchanged. |
| App icon and splash | `app.json`'s background colors move to `background` (`#1E1E24`). The placeholder glyph is re-exported in the new colors (`primary` on `background`) only if it can be done without installing anything; the final art is the developer's and isn't in the handoff, so it stays open (see "Out of scope"). |

## Out of scope

- The final app icon and splash art (not in the handoff); checking them needs an APK.
- A light theme.
- E2E tests, the performance check and the v1.0 release → Phase 9.
- Anything in `docs/backlog.md`.

## Tools

Nothing is installed. The font files are downloaded once (Plus Jakarta Sans, SIL Open Font License) and committed; no package is added.

## Steps

### 1. Theme
- Replace `colors.ts`, `typography.ts`, `spacing.ts` and `navigationTheme.ts` from `tokens.json` as in the decisions; update `colors.test.ts`.
- Add the font files, load them in `app/_layout.tsx`, set the families in the typography variants.
- `AppText` tones named after the tokens; `fgTone(band)`; `fgBand` with the `> 60%` rule and its tests.
- Every file that used an old token moves to the new ones (nothing is left on the old names), `app.json` backgrounds.

### 2. Shared components
- New: `TabBar`, `BottomActionBar` (and `Screen`'s `footer`), `Fab`, `ElapsedTimer`.
- Restyled from the mockups: `Screen` (title sizes, top spacing), `Button` (primary / secondary / ghost / danger, plus the green pill, the dashed and the outlined ones), `IconButton` (muted icon, the 52 dp play button), `Card` (radius 20, the raised variant), `ChipRow` (check icon, borders, `wrap`), `ListItem` (64 dp thumbnail, radius 14), `TextField` (52 dp), `NumberInput` (emphasized and plain), the set table (column order and widths), `EmptyState`, `ActionSheet`, `NameDialog`, `SwipeToDelete`.
- Tests for the new components and the changed behavior (chip check icon, footer hidden with the keyboard, tab roles).

### 3. Screens, in DESIGN.md's order
1. Workout tab (Quick Start, routines as cards with raised workout rows, ⋮ and play, dashed "New Workout", green "New Routine").
2. Active workout (header with minimize, title and timer; cards; set table; Add Exercise; Discard Workout; Finish Workout in the bottom bar). The template editor follows it.
3. Workout summary.
4. Exercises tab (search with icon, filter chips, grouped rows with the Custom tag, FAB). The picker follows it.
5. Exercise detail (media, description, predefined note, Your stats, Add to Routine bar).
6. Exercise form (wrapped chips, Choose media, Save Exercise bar).
7. History (FG% evolution card, month headers, session cards).
8. Session detail (back and delete, totals, read-only exercise cards).
- The Resume banner, dialogs, sheets and empty states along the way.

### 4. New features
- Elapsed timer and `< 1 min`.
- FG% evolution (`fgEvolution` + `FgChart`).
- Your stats (`listExerciseResults`, `exerciseStats`, `useExerciseStats`).
- Add to Routine (chooser route, the editor opened with the exercise added).
- Tests: `formatElapsed`, `formatDuration` under a minute, `fgEvolution` (skips check-only sessions, keeps the last 5 oldest first), `exerciseStats` (best, aggregate average, one session holding the exercise twice, check drills, none), the repository read against `createTestDb()`, and the flows (timer ticking with fake timers, the chart's label, the stats on the detail, Add to Routine through to a saved template).

After each step: `lint`, `format:check`, `typecheck` and `test` pass.

### 5. Check on the phone (Expo Go)
- Every screen against its mockup; the screens without one feel like the rest.
- The font loads (all four weights), numbers are tabular, contrast is fine in daylight.
- The bottom bars and the FAB never cover content; they hide with the keyboard.
- The timer counts across minimize and app restart; durations show `< 1 min` and real minutes.
- The chart and the stats match the history; Add to Routine lands in the editor, Save keeps it, Cancel asks.
- TalkBack through the main flow; the largest font size.

### 6. CI and phase commit
- Full CI list locally (`lint`, `format:check`, `typecheck`, `test`, `db:generate` + clean `src/db/migrations`, `npx expo-doctor`).
- Update `CLAUDE.md` (theme, font, new components and features, current status) and tick the checklist.
- One commit: "Phase 8: visual redesign", with the `PLAN.md` change. Push and confirm CI is green.

## Final checklist

- [x] Theme from `tokens.json`, the old palette gone, Plus Jakarta Sans loaded.
- [x] Shared components restyled; tab bar, bottom action bar, FAB, timer pill added.
- [x] The eight screens follow their mockups; the others follow the patterns.
- [x] Set tables are `SET · MAKES · ATTEMPTS · FG%` everywhere.
- [x] Timer, `< 1 min`, FG% evolution, Your stats and Add to Routine, with tests.
- [x] On the phone (Expo Go): the checks of step 5.
- [x] `npm run lint`, `format:check`, `typecheck`, `test` and `npx expo-doctor` pass locally, and `db:generate` leaves the migrations unchanged.
- [ ] CI is green on `main`.

## Results

Steps 1 to 5 done (2026-09-28): the on-phone check passed with no change asked; the commit (step 6) is next. All CI checks pass locally: lint, format, typecheck, 550 tests (488 before), `db:generate` with no schema change, `expo-doctor` 21/21.

### 1. Theme
- `src/theme/`: `colors.ts` (the 21 tokens by their names, plus `scrim` for modal backdrops), `fonts.ts` (the four families and their files), `typography.ts` (the twelve token variants, plus `statMedium`, `subtitle`, `sectionHeader`, `micro`, `buttonCaps`, `buttonCompact` taken from the mockups, and `tabularNums`), `spacing.ts` (`spacing` with the named tokens and a 2 / 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24 / 32 scale, `radius`, `size`, `opacity`, `elevation`, `border`), `navigationTheme.ts`. `colors.test.ts` checks every text color on the four backgrounds, plus `onPrimary` / `primary`, `primary` / `primaryContainer`, `onSecondary` / `secondary`.
- The fonts are the static TTFs of `@expo-google-fonts/plus-jakarta-sans`, downloaded once from jsDelivr into `assets/fonts/` with `OFL.txt` (the font has `tnum`). No package added.
- `AppText` tones: `default`, `secondary`, `primary`, `green` (`secondaryText`), `error`, `success`, `neutral` (`neutralStat`); a `weight` prop for the texts the mockups set bolder than their size's default.
- `fgBand`: good is now `> 60%` (tests at 0.6, 0.6004 and 0.6006). `fgTone(band)` has no second argument.
- `app.json`: every background color is `#1E1E24`.
- `design-handoff/` was kept out of Prettier while it was in the repo; after the phone check its rules, tokens and patterns went into `docs/design.md` and the folder was deleted (developer's request).

### 2. Shared components
- New: `TabBar` (custom `tabBar`, hides with the keyboard), `BottomActionBar` (`Screen`'s `footer`; `SafeAreaView` adds the bottom inset to its padding), `Fab` (+ `FAB_CLEARANCE` for the list under it), `ElapsedTimer` (+ `useElapsed`), `StatTile`, `useKeyboardVisible`, `SetNumber` (the SET cell), `TargetModeSheet` (the "what do you fix?" sheet, now shared by the picker and Add to Routine).
- `Button` variants: `primary`, `secondary`, `ghost`, `danger`, `tonal` (green pill), `dashed`, `outline`, and `caps`. Pressed and disabled states use the `opacity` tokens everywhere (the tokens have no colors for them).
- `IconButton`: `color` (menus and trash pass `iconMuted`) and `variant="play"`. `Card`: `default` / `compact` / `raised` and a layout `style`. `ChipRow`: check icon on the selected chip, `wrap`, and the scrolling row runs edge to edge. `TextField`: 52 dp, `icon`, `variant="raised"` (inside cards). `NumberInput`: `large` is the emphasized field (green outline, 22 / 800), `compact` the plain one. `Screen`: `titleVariant`, `footer`, and the first line of the title level with the 48 dp buttons. `Icon`: a `testID` (wrapped in a view, since `SymbolView` doesn't pass it on).
- Set table (`setTable.ts`): `SET · MAKES · ATTEMPTS · FG%` with `columnRoles(targetMode)` saying which of MAKES and ATTEMPTS is logged (flexible, emphasized) and which is the target (92 dp); `readOnly` headers share the room evenly (history).

### 3. Screens
- As planned, in DESIGN.md's order; the template editor, the picker, the banner, dialogs, sheets and empty states follow the same patterns (editor: Save in the bottom bar; picker: search icon, the same rows and the "New Exercise" FAB).
- Texts changed: "Finish" → "Finish Workout", the form's "Save" → "Save Exercise", the Exercises tab's "+" → the "New Exercise" FAB (label "New exercise" kept); the empty Custom filter said "Create one with the + button.", now "Create one with New Exercise." (the + is gone). Uppercase on the Workout tab, the tab labels and the tile labels is a `textTransform`, the texts are unchanged. New texts: "Your stats", "Best FG%", "Average", "Sessions", "Done", "Recent sessions", "No sessions yet.", "FG% evolution", "Last N workouts", "latest workout", "Add to Routine", "Add to <workout>", "Create a routine on the Workout tab first.", "< 1 min".
- A done check in the history is now the check icon in `success` (was the ✓ character), labeled "Set N done".
- Differences from the mockups: the Resume banner (not in the mockups) stays above the tab bar; a custom exercise keeps its ⋮ menu on the detail; the chart's 50% line is solid (a one-sided dashed border isn't reliable on Android); the History row's and the stats tiles' FG% are colored by band (the mockups leave some white, the project rule colors every FG%).

### 4. New features
- Timer: `ElapsedTimer` in the active workout's header, from `sessions.startedAt`; tested ticking and after minimizing.
- `formatDuration` shows `< 1 min` under one minute.
- FG% evolution: `fgEvolution`, `chartDateLabels`, `fgEvolutionLabel` (`historyList.ts`), `FgChart` (views only: grid, rotated segments, dots, labels; draws once it knows its width), `FgEvolutionCard` as the History list's header (passed as a component: the list hands its header props to its native scroll view).
- Your stats: `listExerciseResults` (sessions repository), `exerciseStats` (`src/domain/exerciseStats.ts`, on `summarizeSession`), `useExerciseStats`, `ExerciseStatsCard`.
- Add to Routine: `app/add-to-routine.tsx` (modal) with `RoutineChoiceSection`; it replaces itself with `/edit-workout?workoutId=|routineId=&addExerciseId=&targetMode=`. `loadDraft.withRequestedExercise` appends the exercise and `openDraft(initial, current)` opens the draft with it, so the editor counts it as unsaved (Cancel asks "Discard changes?").

### App icon and splash
- The final logo (a pink, green and black swirl around a basketball, on `#F5F5F7`) was supplied by the developer as a 2000 px PNG, kept as the source in `assets/images/source/logo.png`; the Phase 7 SVG sources (the placeholder ball) are gone.
- The four PNGs were made from it by a one-off script (session scratchpad, not committed: `sips` to resample, pure Python to composite and write the PNGs, nothing installed). Geometry, from the logo's center and its outer radius (937 px in the source):
  - `icon.png` 1024 × 1024: the logo at radius 440 on `#F5F5F7`.
  - `android-icon-foreground.png` 1024 × 1024: the logo at radius 300, inside the 66/108 safe circle (~313 px), on `#F5F5F7`; `app.json`'s `adaptiveIcon.backgroundColor` is `#F5F5F7` too, so no edge shows.
  - `android-icon-monochrome.png`: the logo's colored shapes (pink, green, black) in white, the light background and gaps transparent, same geometry. The ball's seams merge into the silhouette.
  - `splash-icon.png` 304 × 304: the logo at radius 132 on a light `#F5F5F7` disc, transparent around it, shown 76 dp wide on the dark `#1E1E24` splash background. The logo keeps its light background because its white gaps are part of the drawing: on the dark background they would merge with the black center.
- A preview (circle mask, themed tint, splash on the dark background) was checked in the scratchpad. The real look is confirmed on the next APK.