# Phase 7 — Polish (detailed plan)

Detailed plan for Phase 7 of [PLAN.md](PLAN.md).

**Goal:** polish the feature-complete app before the visual redesign (Phase 8): **FG% coloring** (asked for after the first court session) and **FG% with one decimal** (`45.3%`, but `50%` when the decimal is 0), **haptics**, an **empty-state pass** and an **accessibility pass** over every screen, and a **placeholder app icon and splash** (a basketball glyph) in place of Expo's template art. No new feature and no schema change. The E2E tests, the performance check and the v1.0 release moved to Phase 9, after the redesign: the redesign changes the screens those checks would measure, and the release waits for the new look.

**Done when:** on the phone (Expo Go), FG% shows its decimal (none when it is 0) and is colored everywhere it shows, the haptics fire on the chosen moments only, every screen has its empty state, and TalkBack can drive the main flow. `lint`, `format:check`, `typecheck`, `test` and `expo-doctor` pass, `db:generate` leaves the migrations unchanged, and CI is green on the phase commit. No APK this phase: the placeholder icon and splash only show on an APK, so they are checked on the next one (Phase 9, or earlier if one is built).

## Decisions for this phase

| Topic | Decision |
|---|---|
| FG% coloring: thresholds | Decided with the developer (2026-09-28): three bands on the FG% ratio, **≥ 60% success** (green), **< 40% danger** (red), anything in between keeps the tone the place has today (muted on the set rows, the exercise totals and the summary's per-exercise lines; default on `SessionTotals` and the History row). One pair of constants, in whole percents, `FG_GOOD_PCT = 60` and `FG_POOR_PCT = 40`, in `src/domain/fg.ts`, so changing them is one edit. **The band is computed on the rounded percent, the same number `formatFgPct` shows** (in tenths, `Math.round(ratio * 1000)`, compared with `FG_GOOD_PCT * 10` and `FG_POOR_PCT * 10`, integers only): otherwise 0.5996 would read "60%" and stay neutral, and 0.3996 would read "40%" and be red. The same thresholds for every drill and both modes: per-drill targets are backlog. No logged value (`—`) stays muted. |
| FG% format | Asked for by the developer (2026-09-28): **one decimal, dropped when it is 0**, everywhere an FG% is shown: `45.3%`, `66.7%`, but `60%`, `100%`, `0%` (not `60.0%`); no value stays `—`. A decimal point, not a comma: the UI is in English. One change in `formatFgPct` (`src/domain/format.ts`), which every place already goes through: round in tenths as integers (`tenths = Math.round(ratio * 1000)`), then write `tenths / 10` with `toFixed(1)` when `tenths % 10 !== 0` and as a whole number otherwise, so no float is rounded by `toFixed` on its own and the "is the decimal 0" test is on an integer. The widest value is now `99.9%` (five characters, one more than today's `100%`), and the set table's `fgColumn` (56 dp in `setTable.ts`) is too narrow for it: it widens (about 72 dp, taken from the `loggedColumn`, which is `flex: 1`), shared by the active workout, the history detail and the header. The tests that expect a whole percent where the value now has a decimal (`format.test.ts`, `historyList`, `ShootingSetRow`, `SessionExerciseView`, the `active-workout` and `history` flow tests) are updated. |
| FG% coloring: where | Everywhere an FG% is shown: the set rows (active workout `ShootingSetRow`, history `SessionExerciseView`), the exercise totals (`ExerciseCard`, `SessionExerciseView`), the session totals (`SessionTotals`, so the post-Finish summary and the session detail), the summary's per-exercise lines (`workout-summary/[id]`) and the History row. The template editor shows no FG%, so nothing changes there. Only the number is colored, not the row: the color is never the only signal, the percentage is still written. Where the FG% sits inside a longer line (`Total: … · 62%` in `ExerciseCard` / `SessionExerciseView`, `8 / 13 · 62%` on the summary), the percent becomes a **nested `AppText`** carrying the tone, inside the line's own `AppText`. The History row gets its value from `sessionResult`, which today returns the formatted string only: it also returns the band (`fgBand`), and its test covers it. |
| FG% coloring: colors | The existing `success` and `danger` tokens. `AppText` gains a `success` tone. `colors.test.ts` gains `success` on `background`, `surface` and `surfaceElevated` (a pressed `Card`, so a pressed History row) (≥ 4.5:1; `#4CAF50` gives 6.7:1, 6.0:1 and 5.1:1). **Red stays for the poor band** even though the set row's validation message is red too (decided with the developer, 2026-09-28): the message is a sentence under the row with the `alert` role, the FG% is a number in its own column. The redesign may change the tokens; the coloring follows them. |
| Haptics | `expo-haptics`, the Expo module that makes the phone vibrate briefly as touch feedback (install approved by the developer, 2026-09-28). Only `src/components/haptics.ts` imports it (the same rule as `Icon` and `expo-symbols`): `haptics.confirm()` and `haptics.reject()`, each ignoring failures (a phone without a vibrator, or haptics off, must never break a write): the call returns a Promise, so each one ends in `.catch(() => {})`, a `try/catch` alone isn't enough. Prefer Android's own feedback (`performAndroidHapticsAsync`), which follows the phone's "touch feedback" setting and needs no `VIBRATE` permission; the exact constants, and the Android version each one needs (`Confirm` / `Reject` may be API 30+), are checked in the installed version's types against the phone's Android version, with a fallback constant if needed. **Where, and nowhere else (three moments):** a set deleted by the swipe or by the screen reader's "delete" action (confirm), an invalid value rolled back on blur (reject: the one moment on the court where the user may not be looking), a successful Finish (confirm). The first two live in shared code (`SwipeToDelete`, `useNumberCell`), so they also fire in the template editor: the same gesture gives the same feedback on every screen (developer's choice, 2026-09-28). **The rollback trigger, exactly:** `onBlur` when `settle()` returns a reason, whether or not a prefix had been saved (typing "3" against a target of 5 in `makes` mode saves nothing, but the entry is still thrown away). **Silent:** the rollback when the cell unmounts (minimizing with the keyboard open; decided with the developer), and a write refused on a keystroke (`onRejected` from `onChangeText`). **Not** on ✓ on a check set nor on the hold that plays an exercise's media (the developer doesn't want them), not on every keystroke, not on navigation, not on ordinary taps. `jest.setup.js` mocks `expo-haptics` (a `jest.fn()` per function, resolving), so `haptics.ts`'s own test runs its `.catch` path and flow tests assert the calls and their constants. |
| Empty states | Most screens already have one (Workout tab "No routines yet", History "No workouts yet", the picker and the catalog "No exercises found" / "No custom exercises yet", active workout and template editor "Add your first exercise", every "not found"). Step 3 is an **audit**, not a rewrite: every list and screen is checked for its empty case, and only the gaps are filled with `EmptyState` or a muted line (for instance a routine with no workout, a workout card with no exercise). Wording stays short, in the current style; the redesign restyles them later. |
| Accessibility | A pass over every screen, done two ways. **In Jest:** a helper, `expectAccessibleControls(root)` in `src/test-utils/a11y.ts`, walks the rendered host tree and fails on any control that has no `accessibilityRole` or no name (a label or a text child). **A control is a host element with `accessible === true` or with an `onClick` / `onResponderRelease` handler**: `Pressable` doesn't pass `onPress` down to its host `View` (only `usePressability`'s handlers), so a check on `onPress` would find nothing and always pass. Known exceptions, listed in the helper with a comment: the `SwipeToDelete` tap layer over a `NumberInput` (the input under it carries the name) and elements hidden from accessibility (the media placeholder, the video still). Every flow test file calls it on each screen it visits, so an unlabeled button fails CI from now on, the redesign included. Section headers (routine names, months, categories) get the `header` role, like the screen titles. **On the phone:** a TalkBack walk through the main flow (step 6), and the largest system font size, checking that the set table and the number cells don't clip; if they do, `maxFontSizeMultiplier` on those cells only, not app-wide. Touch targets stay ≥ 48 dp (`touch.min`); the audit checks the few custom pressables that don't go through `Button` / `IconButton`. |
| App icon and splash | **A placeholder** until the redesign brings the final art (decided with the developer, 2026-09-28): the basketball glyph (Material Symbols `sports_basketball`, Apache 2.0, the same icon as the media placeholder) in the accent orange on the app's `#121212`. The SVG source goes in `assets/images/source/`, and the PNGs are exported once from it over the current Expo template files (same names, so `app.json` only changes if `imageWidth` does): `icon.png` (1024 × 1024), `android-icon-foreground.png` (1024 × 1024, the glyph inside the safe zone: a 66 dp circle on the 108 dp canvas, so about 61%, a circle of ~626 px centered in the 1024, transparent around it; the background color stays in `app.json`), `android-icon-monochrome.png` (the same glyph in white on transparent, for Android 13 themed icons) and `splash-icon.png`. The splash keeps its dark background. |
| Data model | No schema change. **No migration.** `db:generate` must leave `src/db/migrations` unchanged. |

## Out of scope

- The final app icon and splash, and any visual change beyond the FG% colors → Phase 8 (visual redesign).
- E2E tests on the phone, the performance check (long session, long history), the `production` build profile and the v1.0 release → Phase 9.
- The hold-to-play preview that stops when the finger moves (a known issue in `docs/backlog.md`): not a v1 blocker.
- The predefined exercises' media files (content, supplied by the developer over time).
- Per-drill FG% targets or thresholds set by the user → backlog.

## Tools

Nothing is installed without asking first. What this phase needs:

| Tool | What it does | Where it runs |
|---|---|---|
| `expo-haptics` | Haptic feedback (step 2). Approved by the developer (2026-09-28). Works in Expo Go; a native module, so it reaches the installed app with the next APK. | Project `node_modules/`, through `npx expo install` |
| A one-off SVG → PNG exporter (e.g. `npx @resvg/resvg-js-cli`) | Exports the icon and splash PNGs from the SVG source (step 5); still to be asked before running. | `npx`, one-off; nothing stays installed |

## Steps

### 1. FG% format and coloring
- `formatFgPct` with one decimal, dropped when it is 0, as in the decisions. Tests: `null` → `—`, 0 → `0%`, 1 → `100%`, 0.5 → `50%`, 2/3 → `66.7%`, 5/11 → `45.5%`, 0.9994 → `99.9%`, and a value that rounds to a whole percent (0.4996 → `50%`, not `50.0%`). Update the tests that expected whole percents. Widen `fgColumn`.
- `src/domain/fg.ts`: `FG_GOOD_PCT`, `FG_POOR_PCT` and `fgBand(ratio)` → `'good' | 'poor' | 'neutral' | 'none'` (`none` for `null`), on the percent rounded in tenths. Tests: `null`, 0, just under and at each threshold, the rounding edges (0.5996 → good, 0.3996 → neutral), 1. The domain returns a band, not a color: colors stay in the UI.
- `AppText`: a `success` tone. `colors.test.ts`: `success` on `background`, `surface` and `surfaceElevated`.
- A small UI helper, `fgTone(band, neutral)` → `TextTone` (`good` → `success`, `poor` → `danger`, `neutral` → the given tone, `none` → `muted`), used by every place in the decisions.
- The lines that hold the FG% among other text get a nested `AppText` for the percent; `sessionResult` also returns the band (test in `historyList.test.ts`).
- Tests: `ShootingSetRow.test.tsx` and `SessionExerciseView.test.tsx` check the tone of a good, a poor, a neutral and an empty set (by the rendered color, on the percent's own `Text`, the nested one on the total lines); the flow tests check one good and one poor total on the summary and the History row.

### 2. Haptics
- Install `expo-haptics` (`npx expo install expo-haptics`, approved); if it adds a config plugin, it goes in `app.json`.
- `src/components/haptics.ts` as in the decisions, with its own test (a rejected Promise is swallowed), and the `expo-haptics` mock in `jest.setup.js`.
- Wire the three moments:
  - **Delete:** in `SwipeToDelete`, after `onDelete`, for both the swipe and the "delete" accessibility action. `onDelete` returns a `boolean` (deleted or not) and the confirm fires only on `true`, so a refused write doesn't vibrate: `() => deleteSet(set.id).ok` in `ShootingSetRow` / `CheckSetRow`, `true` after `updateDraft` in `TemplateSetRow` (a draft edit can't fail).
  - **Rollback:** in `useNumberCell`'s `onBlur`, when `settle()` returned a reason; not in the unmount cleanup, not in `onChangeText`.
  - **Finish:** in `active-workout.tsx`, after `finishWorkout(...).ok`, not before.
- Tests: each moment calls the right function once, in the active workout and in the template editor; a valid blur, a keystroke (including one whose write is refused), an unmount with an invalid draft, ✓ on a check set and a failed Finish call nothing.

### 3. Empty-state audit
- Go through every route and list, noting each empty case and what it shows now, in "Results" at the end of this file. Fill the gaps (see the decisions) with `EmptyState` or a muted line, each with a flow-test assertion.

### 4. Accessibility pass
- `src/test-utils/a11y.ts` (the UI test helpers' folder; the DB one stays in `src/db/test-utils.ts`): `expectAccessibleControls(root)`, with its own test written **first** (fails on an unlabeled `Pressable` and on a `Pressable` without a role, which proves the detection finds real controls; passes on `Button`, `IconButton`, `ListItem`, `ChipRow`, and on a `SwipeToDelete` row with its tap layer).
- Call it in each flow test (`active-workout`, `routines`, `history`, `exercises`, `shell`) on every screen the test visits. Fix what it finds: labels, roles, `header` on section headers.
- Check the custom pressables (the Resume banner, the workout card's body that opens the editor, the history row, the note field) for the 48 dp minimum.

### 5. Placeholder icon and splash
- Write the SVG source, ask before running the one-off exporter, and export the four PNGs over the current placeholders (same names).
- Check the adaptive icon's safe zone on a circle, a squircle and a square mask (Android launchers crop differently): render the three masks over the exported foreground (a one-off preview image in the scratchpad, not committed) and note the result in "Results". The real look is confirmed on the next APK.

### 6. Check on the phone (Expo Go)
- FG% with one decimal everywhere (none when it is 0: `50%`), and `99.9%` fits the set table's FG% column (also at the largest font size).
- FG% coloring on the set rows, the totals, the summary and History, in both modes; the middle band looks right.
- Haptics on the three moments, in the active workout and the template editor, and none elsewhere (typing, ✓, holding an exercise, navigating, minimizing with an invalid value typed). With the phone's touch feedback off, none at all.
- TalkBack through the main flow: every control is announced with a name and a role, the set cells say which set and which value, a set can be deleted through the actions menu. The largest font size: nothing clips in the set table.
- The empty states found in step 3.
- Feedback from this check goes in "Results", and changes are made before the commit, as in Phases 3 to 6.

### 7. CI and phase commit
- Run the full CI list locally (`lint`, `format:check`, `typecheck`, `test`, `db:generate` + clean `git status` on `src/db/migrations`, `npx expo-doctor`).
- Update `CLAUDE.md`: project state (FG% shown with one decimal, dropped when it is 0, `fgBand` / `fgTone` and the thresholds on the rounded percent, the `success` tone, `haptics.ts` as the only `expo-haptics` import and its three moments, `expectAccessibleControls` in `src/test-utils/` and in every flow test, the placeholder icon and its SVG source) and current status (Phase 7 done, next: write `phase-8.md`, the visual redesign).
- One commit: "Phase 7: polish", which also carries the `PLAN.md` change made while planning (the redesign as Phase 8, testing and release as Phase 9). Push and confirm CI is green. Tick the checklist.

## Final checklist

- [x] FG% shows one decimal everywhere, none when it is 0 (`formatFgPct` tests), and `99.9%` fits the set table.
- [x] `fgBand`, the `success` contrast and the colored set rows / totals have tests.
- [x] Haptics on the three moments only, with tests; nothing breaks with haptics off.
- [x] Empty-state audit written in "Results", gaps filled.
- [x] `expectAccessibleControls` runs in every flow test file and passes.
- [x] Placeholder icon and splash PNGs exported from the SVG source.
- [x] On the phone (Expo Go): FG% coloring, haptics, empty states, TalkBack and the largest font size checked.
- [x] `npm run lint`, `format:check`, `typecheck`, `test` and `npx expo-doctor` pass locally, and `db:generate` leaves the migrations unchanged.
- [x] CI is green on `main`.

## Results

**Phase 7 done** (2026-09-28). The phase commit (`738bf68`, CI green on `main`) was made before the on-phone check (step 6), at the developer's request; the check then passed with no change needed. All CI checks pass locally: lint, format, typecheck, 488 tests (443 before), `db:generate` with no schema change, `expo-doctor` 21/21.

### 1. FG% format and coloring
- `formatFgPct` rounds in tenths as an integer and drops a `.0`. `fgBand` (`src/domain/fg.ts`) uses the same rounding, so 0.5996 reads "60%" and is good, 0.3996 reads "40%" and is neutral. `fgTone` lives in `src/components/fgTone.ts`, next to `AppText`.
- `fgColumn` widened from 56 to 72 dp (`loggedColumn` is `flex: 1` and gives the room).
- The totals inside a line (`ExerciseCard`, `SessionExerciseView`, the summary's per-exercise line) carry the percent as a nested `AppText`; `SessionTotals` and the History row color the number itself. `sessionResult` returns `fgBand` (`none` with no shooting set).
- History test data: the Aug 20 session went from 5/8 to 5/14 (35.7%), so the History flow test has one good and one poor row.

### 2. Haptics
- `expo-haptics` ~57.0.3, installed with `npx expo install`. No config plugin; its Android manifest adds the `VIBRATE` permission (used only by its `Vibrator` functions, not by `performAndroidHapticsAsync`).
- `Confirm` / `Reject` are looked up by reflection in the native module and exist from API 30 (Android 11); before that the call rejects. `haptics.ts` then plays a constant every version has (`Context_Click` for confirm, `Long_Press` for reject), and a second failure is swallowed.
- `SwipeToDelete.onDelete` now returns a `boolean`; the Jest swipe mock keeps `onSwipeableOpen`, so the swipe path has a test of its own, next to the accessibility action.
- Tests: `haptics.test.ts` (the constants, the fallback, a swallowed failure), `useNumberCell.test.ts` (reject on a blur rollback, also when nothing had been saved; silent on a valid blur, on keystrokes, on a refused keystroke write, on unmount), `SwipeToDelete.test.tsx`, and the flow tests (active workout: delete, rollback, Finish, none on ✓ or on a Finish the DB refuses; template editor: delete, rollback, silent unmount on Cancel).

### 3. Empty-state audit

| Screen / list | Empty case | What it shows |
|---|---|---|
| Workout tab | no routine | `EmptyState` "No routines yet" + New Routine (already) |
| Workout tab | a routine with no workout | **gap, filled:** muted "No workouts in this routine yet." above New Workout (flow test in `routines.test.tsx`) |
| Workout tab | a workout with no exercise (its last custom exercise deleted) | "No exercises" on the card (already, `formatExerciseList`) |
| Active workout | no exercise | `EmptyState` "Add your first exercise" (already) |
| Template editor | no exercise; stale link | "Add your first exercise"; "Workout not found" (already) |
| Picker | no match | "No exercises found" (already) |
| Exercises tab | no match; Custom with none | "No exercises found"; "No custom exercises yet" (already) |
| Exercise detail | no media; no description; stale link | placeholder; "No description."; "Exercise not found" (already) |
| Exercise form | stale or predefined id | "Exercise not found" (already) |
| History | no finished session | `EmptyState` "No workouts yet" (already) |
| Session detail / summary | stale or in-progress id | "Workout not found" (already) |
| Summary | no exercise | "No exercises." (already; `finishSession` refuses an empty workout anyway) |
| Session totals | no shooting set / no check set | that card is left out; a finished session always has one of the two (Finish needs logged data) |

### 4. Accessibility pass
- `expectAccessibleControls` (`src/test-utils/a11y.ts`): a control is a host element with `accessible === true`, an `onClick` / `onResponderRelease` handler (not on scroll views, which have responder handlers for the scroll), or a text field (implicit role, a name still required). Hidden elements are left out through Testing Library's `isHiddenFromAccessibility`; the one listed exception is `NumberInput`'s tap layer (`testID` ending in ` tap area`). Its test, written first, fails on a nameless `Pressable`, on a `Pressable` with no role and on an unlabeled number field, and passes on `Button`, `IconButton`, `ListItem`, `ChipRow` and a `SwipeToDelete` row with its tap layer. A probe run on the Workout tab confirmed it finds the real controls (the buttons and the three tabs).
- Called in all five flow files, on every screen visited: the three tabs, the banner, the active workout (empty, with sets, with the rollback message, a check drill), the picker and its mode sheet, the exercise menu sheet, the summary, the routine dialog and menus, the template editor, the History list and session detail, the exercise detail (predefined, video, not found), the exercise form (new and edit), and the not-found screens.
- It found no unlabeled control or missing role: every pressable already had both. The pass added the `header` role to the section headers (routine names, "Quick Start", "Routines", History months, catalog categories), with assertions in the flow tests.
- Touch targets: the Resume banner's two buttons (56 dp), the workout card's body (48 dp min), the History row (a padded `Card`, taller than 48 dp), the note field (48 dp min), the ✓ toggle (48 × 48), the chips (48 dp min) and the action sheet rows (56 dp) are all ≥ 48 dp.
- The largest font size and `maxFontSizeMultiplier` are left to the phone check.

### 5. Placeholder icon and splash
- The glyph is Material Symbols `sports_basketball` (regular weight, U+EA26), read straight from the font the app already bundles (`@expo-google-fonts/material-symbols`) by a one-off Python script, so the outline is the exact one the media placeholder shows.
- **Change from the plan:** instead of `npx @resvg/resvg-js-cli`, the PNGs were rasterized by the same one-off Python script (nonzero fill, 8 sub-scanlines per pixel with exact horizontal coverage, PNG written with `zlib`), so nothing was downloaded or installed. The script stayed in the session scratchpad; the SVGs in `assets/images/source/` are the source of truth (one per PNG, same geometry).
- Files (same names, `app.json` unchanged, `imageWidth` stays 76): `icon.png` 1024 × 1024 (ball 640 px on `#121212`), `android-icon-foreground.png` 1024 × 1024 (ball 540 px, inside the ~626 px safe-zone circle, transparent around it), `android-icon-monochrome.png` (the same in white), `splash-icon.png` 304 × 304 (the ball edge to edge, shown 76 dp wide on `#121212`).
- Mask check: the foreground's visible 72 dp (683 px) under a circle, a squircle and a rounded square, rendered in a one-off preview image (not committed): the ball keeps a ~70 px margin on all three, nothing is cut. The real look is confirmed on the next APK.

### 6. Check on the phone (Expo Go)
- Passed on the first pass, with no feedback to apply (2026-09-28): FG% with its decimal and colored everywhere, `99.9%` fits the set table, the haptics on the three moments only, the empty states, TalkBack through the main flow and the largest font size (no `maxFontSizeMultiplier` needed).
