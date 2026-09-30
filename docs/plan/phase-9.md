# Phase 9 - Refinement

Detailed plan for Phase 9 of [PLAN.md](PLAN.md).

**Goal:** visual changes and features picked by the developer before v1.0. The list below is open: new items are added as they're agreed. Whatever isn't picked stays in [`docs/backlog.md`](../backlog.md). No schema change, with one exception: item 9 adds a column (one new migration, append-only).

**Done when:** every item works on the phone (Expo Go), the full CI list passes locally, and CI is green on the phase commit.

## The list

| # | Area | Item | Status |
|---|---|---|---|
| 1 | General | The active tab's green pill has rounded ends | Approved on the phone |
| 2 | General | Switch tabs by dragging sideways | Approved on the phone |
| 3 | Exercises | New Exercise: a `+` at the top right instead of the FAB | Approved on the phone |
| 4 | Exercises | Category cards (two per row, background image) instead of the full list; a card opens its exercises | Approved on the phone (images: backlog) |
| 5 | Exercises | No "Predefined exercise. It can't be edited." note | Approved on the phone |
| 6 | History | FG% chart range: last 5, 10, 20 or all workouts | Approved on the phone |
| 7 | Exercises | Dashed green ring around the green `+` (New Workout's border) | Approved on the phone |
| 8 | Profile | The History tab becomes Profile (mockup `Profile-html`): the profile card (photo, name, Edit Profile), Your stats (Sessions, AVG FG%, shots, time trained, FG% trend), the FG% chart, the last 5 sessions with "See all" | Done, to check on the phone |
| 9 | Workout | Tactical board: an optional half court per workout exercise, where the coach draws X marks, arrows and free lines (mockup `active-workout-tactical-board`) | Done, to check on the phone |

## Decisions

1. **Tab pill:** the green background was switched on in an existing view, and Android drew it without the rounded corners. The pill is now its own view, mounted only in the focused tab. Round elements use half of their height as their radius (`radius.pill` is gone).
2. **Swipe:** the tabs use `expo-router/js-top-tabs` with the bar at the bottom (same `TabBar` and Resume banner) on a native pager: the page follows the finger, and a swipe to the left brings the next tab. The tabs are lazy, preloading the neighbor, so History doesn't load at launch. `initialLayout` gets the window width.
3. **`+` button:** `IconButton` `variant="outlined"`: a 36 dp ring with New Workout's dashed `secondaryOutline` border, and the icon in the same green, inside the 48 dp target. The picker keeps its FAB.
4. **Cards:** the search field on top, then six cards: the five categories plus Custom (which replaces the chips). Typing swaps the grid for the grouped results. A card opens `app/category/[key].tsx` (a category, or `custom` grouped by category). The images come from the developer (in `docs/backlog.md`, with the exercise media); until then, a placeholder.
5. **Predefined note:** removed; the missing ⋮ menu still marks a predefined exercise as read-only.
6. **Chart range:** a "Last 5 ▾" button opens a menu (Last 5 / 10 / 20 / All workouts). It starts at 5 and lasts while the app is open (not saved). With many points, the dates are thinned so they don't overlap, the dots are drawn only when they fit, and the screen-reader label sums up beyond 10 points.

7. **Profile:** the third tab is Profile (`person` icon, `app/(tabs)/profile.tsx`). From the top: the profile card (80 dp avatar, the name or "Player", "N workouts logged", Edit Profile in a gray outline, `Button` `bordered`), Your stats (Sessions, the finished sessions, and AVG FG% = Σmakes / Σattempts over every one of them, colored by its band, `—` with no shooting set; then Shots made, Σmakes / Σattempts, and Time trained, the durations added up; then the FG% trend: the last 5 sessions with a shot against the 5 before, in points between the two percents shown, with an arrow, `—` until there are 10 such sessions), the FG% evolution card, then "History" with the last 5 sessions by month. "See all" (only beyond 5) opens `app/history.tsx`, the full list by month. With no session, an empty state under the profile card.
8. **Edit Profile** (`app/edit-profile.tsx`, no mockup): the photo (120 dp avatar, Choose / Change / Remove photo, images only, square crop in the picker) and the name, saved together by Save Profile; Cancel changes nothing. Without a photo the avatar shows the name's initial on green, a person icon with no name. The avatar on the profile card opens it too. The name and the photo URI sit in `expo-sqlite/kv-store` (its own file, part of `expo-sqlite`: no install, no schema change); the photo is copied into `<documents>/profile-photo/` like an exercise's media, and the old file is deleted when it is replaced or removed.
9. **Tactical board** (mockup `active-workout-tactical-board`, without its Line and Color rows, and with a FIBA half court instead of the mockup's NBA one):
   - **Where:** each exercise of a workout template and of an active workout can have one board. None is created on its own: the card's header shows an `assignment_add` icon between the name and ⋮ until there is one; once saved, a read-only thumbnail of the whole half court takes its place, and tapping it opens the editor. The ⋮ menu gets "Remove tactical board" (only with a board), confirmed. The History detail shows the session's board read-only (the summary after Finish has no exercise cards, so no board). A board is never empty: Save is disabled with nothing drawn, and the only way to take a board off an exercise is Remove.
   - **Data:** a nullable JSON column `tactical_board` on `workout_exercises` and `session_exercises` (migration `0001`, two `ADD COLUMN`s, safe for the installed APK). `{ version: 1, elements }`, each element an X (`at`), an arrow (`from`, `to`, optional `via`: where a curved arrow's bend passes) or a pen stroke (`points`), coordinates normalized 0-1 over the court (x across the 15 m width, y from the baseline to the half-court line, 14 m). Pen strokes are simplified (Ramer-Douglas-Peucker, 5 cm) before they're saved. Rules in `src/domain/tacticalBoard.ts`; a board that breaks them, or has no elements, is refused (`invalid_board`). Migration `0002` (a custom, data-only one) turns any empty board already on the phone into no board, since the rule tightened after the first phone check.
   - **Persistence, like the rest of a session:** starting a workout copies the template's board into the session exercise; an edit during the workout is saved on the session exercise at once; at Finish, a changed board counts as a structure change, so the existing "Update template?" question carries it back. In the template editor, the board is part of the draft and is written by the editor's Save.
   - **Rendering:** one component, `CourtBoard` (`react-native-svg`), for the thumbnail, the editor and History: `viewBox` in meters (15 x 14), the strokes' widths in dp converted to viewBox units, every mark drawn over a dark halo. X marks and arrows in white, pen strokes in pink (fixed colors: picking colors is out of scope). A curved arrow is a quadratic Bézier through its `via` point; the Hand tool's selected arrow shows a small square handle there.
   - **Editor** (`app/tactical-board.tsx`, full screen, `?sessionExerciseId=` or `?draftKey=`): Cancel, "Tactical board", Save (disabled with nothing drawn) on top; the court centered in the screen's width; the toolbar at the bottom, in two rows: Undo and Clear (confirmed) above, right-aligned; Hand, X, Arrow, Pen, Eraser below (one selected, in pink). X places a mark where tapped; Arrow goes from where the finger lands to where it lifts, with a live preview, and short ones (a slip) are dropped; Pen draws a smoothed line; Hand touches an existing mark to select and drag it (clamped to the court), or, on a selected arrow, drags its handle to bend it; Eraser removes whatever it touches, sampling the drag so a fast swipe doesn't skip a mark. Every change — a new mark, a move, a curve, an erase, a Clear — is one `undo` step. The gestures come from gesture-handler (a one-finger pan on the court only); the screen doesn't scroll. Cancel, back button or back gesture with unsaved changes asks before discarding.

## Tools

`react-native-tab-view` and `react-native-pager-view`, installed with approval through `npx expo install` (the pager is already in Expo Go).

`react-native-svg` (item 9), installed with approval through `npx expo install` (already in Expo Go).

## Checks (2026-09-29)

- `lint`, `format:check`, `typecheck`, `test` (572 tests, 550 before) pass; `db:generate`: no change.
- After item 8: the same list passes (584 tests); `db:generate`: no change.
- After item 9: the same list passes (658 tests); `db:generate` made `0001_neat_excalibur.sql` (two `ADD COLUMN`s, `0000` untouched), then no change; `expo-doctor` fails only on the same patch versions.
- After the phone check's feedback on item 9 (Hand, curved arrows, Eraser, a centered editor, the header's ⊞ icon, no empty board): the same list passes (693 tests); `db:generate` made the custom `0002_clear_empty_tactical_boards.sql` (a data-only migration, no column), then no change; `expo-doctor` still fails only on the same patch versions.
- `expo-doctor`: fails only on new Expo patch versions (`expo`, `expo-constants`, `expo-router`), unrelated to this phase; updated at the phase close (see below).

## Still to do

- Phase close:
  1. Expo patch updates (decided 2026-09-29: update at the close, not mid-phase): `npx expo install --fix` as its own step, then the tests and a quick phone check, so a break points to the update. Needed because CI runs `expo-doctor`, which fails on outdated patches.
  2. `docs/design.md`, `CLAUDE.md`, full CI list, commit "Phase 9: refinement" (with the `PLAN.md` change), CI green.
