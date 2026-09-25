# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Phase 0 (scaffolding) and Phase 1 (data layer) are done** (final checklist in `docs/plan/phase-1.md` fully ticked: on-phone check passed, CI green on `main`). **Phase 2 (design system and app shell) is done** (on-phone check passed). The app is an Expo Router + TypeScript project, Android only, dark UI. `app/` holds routes only: `_layout.tsx` (runs migrations + seed and preloads the icon font behind the splash screen, then renders the `Stack` inside a `ThemeProvider`) and `(tabs)/` (bottom tabs Workout `index.tsx` · Exercises · History, placeholder screens; headers are off, each screen draws its title through `Screen`). Phase 3 (active workout) adds three routes on the root `Stack`, above the tabs: `active-workout.tsx`, `add-exercise.tsx` (modal picker) and `workout-summary/[id].tsx`. Phase 4 adds `edit-workout.tsx` (the template editor: `?routineId=` creates, `?workoutId=` edits) and gives the picker a `?to=template` param (adds to the open template draft instead of the session); the Workout tab now lists routines as sections with their workout cards. Phase 5 adds `session/[id].tsx` (the read-only detail of a finished session, opened from a History row) and turns the History tab into a month-grouped list. Everything else lives in `src/`:

- `src/domain/` — pure TypeScript, no DB imports: enum lists (`types.ts`), validation returning `{ ok, reason }` (`validation.ts`), set FG% (`fg.ts`), exercise/session summaries (`summary.ts`), and `DomainError` (`errors.ts`).
- `src/db/` — `schema.ts` (Drizzle), `migrations/` (generated, never hand-edited), `client.ts` (expo-sqlite, opens `basket-routine.db`), `useDatabaseSetup.ts` (migrate + seed), `seed/` (38 predefined exercises, upserted by `seedKey`), `repositories/` (plain functions taking a `Db` as first argument: exercises, routines, workouts, sessions; they throw `DomainError` on rule violations), `test-utils.ts` (`createTestDb()`: in-memory better-sqlite3 with the real migrations).
- `src/theme/` — design tokens: `colors.ts` (role-named, contrast-tested in `colors.test.ts`), `spacing.ts` (spacing, radius, `touch` and `input` sizes), `typography.ts`, `navigationTheme.ts` (React Navigation dark theme built from the tokens). Styling is `StyleSheet.create` + these tokens, no styling library.
- `src/components/` — base components: `Screen` (optional `left` slot, `bottomInset`, `keyboardAvoiding`), `AppText`, `Button` (variants primary/secondary/ghost/danger), `Card`, `EmptyState`, `Icon`, `IconButton`, `NumberInput`, `TextField`, `ListItem`, `ActionSheet`, `SwipeToDelete` (a `NumberInput` inside it is covered by a tap layer until focused, so the drag can start on it), `NameDialog` (name prompt in a `Modal`, since Android has no `Alert.prompt`). **Only `Icon` imports `expo-symbols`** (Android symbol name, always with a `tintColor`). All text goes through `AppText`; pressables are at least 48 dp (`touch.min`). Every action is a plain tap, with one exception chosen by the developer: a set row is deleted by dragging it left (`SwipeToDelete`, on gesture-handler's `ReanimatedSwipeable`; `app/_layout.tsx` wraps everything in `GestureHandlerRootView`). An exercise always keeps at least one set. Hiding the keyboard blurs the focused input (`useBlurOnKeyboardHide`, in the root layout), so it counts as leaving the field.
- `src/features/dataStore.ts` — the app's single data store: a version counter (`notifyDataChanged`, `useDataVersion`, via `useSyncExternalStore`, and `useDataVersionWhile(active)`, which follows the counter only while `active` and catches up when it turns true: the History list uses it with `useIsFocused`, so a mounted but unfocused tab doesn't redo its query on every write), plus `run` and `ActionResult`. **Every data write goes through a feature's `actions.ts`** (`workout/actions.ts`, `routines/actions.ts`): it calls the repository, notifies the store and turns a `DomainError` into `{ ok: false, reason }`. The hooks (`hooks.ts` in each feature) re-read the DB when the version changes.
- `src/features/workout/` — the active-workout feature: `hooks.ts`, `actions.ts` (also starting from a template and the Finish "update template" read/write), `ExerciseCard`, `ShootingSetRow` / `CheckSetRow`, `useNumberCell.ts` + `setDraft.ts` (draft rule) and `SetTableHeader.tsx`, `ExerciseNote`, `ResumeBanner` (rendered above the tab bar). **A valid number is saved on every keystroke, and the set row rolls an invalid one back on blur** (or on unmount) to the value it had at focus. `useNumberCell` takes a `save(value)` callback, and it, `setDraft` and `SetTableHeader` are shared with `src/features/routines/`.
- `src/features/routines/` — routines and workout templates: `actions.ts`, `hooks.ts` (`useRoutines`, `useWorkoutTemplate`), `RoutineSection` / `WorkoutCard` (the Workout tab), and the template editor: `templateDraft.ts` (pure functions over an in-memory `TemplateDraft`, `isDirty`), `draftStore.ts` (module store, so the picker route can add to it; `updateDraft` is a no-op when no draft is open), `loadDraft.ts`, `TemplateExerciseCard` / `TemplateSetRow`. **Templates change only through the editor's Save (`saveWorkout`, one transaction that replaces the exercises and sets) or through "Update template" at Finish (`overwriteWorkoutFromSession`)**; a session never mutates its template. The editor guards unsaved changes with `usePreventRemove` (from `expo-router/react-navigation`) and a `leaving` ref so its own navigation isn't blocked.
- `src/features/history/` — History: `historyList.ts` (`toHistoryItem`, `sessionResult`, `groupByMonth`), `hooks.ts` (`useHistory`, `useFinishedSession`), `actions.ts` (`deleteSession`), `HistoryRow`, `SessionTotals` (shared with the post-Finish summary screen) and `SessionExerciseView` (read-only exercise card). **The history is read-only: a finished session is never edited, only deleted (`deleteFinishedSession`, a hard delete that cascades; the template it came from is untouched).** `finishSession` refuses a session with no exercise (`empty_workout`), so the history can't hold one.
- `src/domain/` also has `format.ts` (FG%, count parsing, duration, date, month), `defaults.ts` (default targets, workout name by time of day), `order.ts` (`moveItem`), `messages.ts` (`reasonMessage`). `addSessionExercise` now inserts the exercise's first set.

Commands: `npm run lint`, `npm run format` / `format:check`, `npm run typecheck`, `npm test`, `npm run db:generate` (after any change to `src/db/schema.ts`), `npx expo start` (dev loop — scan the QR code with Expo Go). CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, tests, a schema/migrations-in-sync check (`db:generate` must leave `src/db/migrations` unchanged) and `npx expo-doctor` on every push and PR. An EAS project is linked (`@jarmenio/basket-routine`, ID in `app.json`'s `extra.eas.projectId`).

**Migration policy:** an APK with a DB is now installed on the phone (2026-09-25, Phase 3 build), so **migrations are append-only**: never delete or edit `0000_true_deadpool.sql`, only generate new ones. Uninstalling the APK wipes its data.

Tests live next to the code (`*.test.ts` / `*.test.tsx`); DB tests use the `@jest-environment node` docblock. Repositories call `.sync()` on Drizzle relational queries and read inserted rows back with `.returning()`. Jest runs on the `jest-expo/android` preset; `jest.setup.js` swaps `ReanimatedSwipeable` for a plain view (the gesture can't run in Jest), so tests delete a row through its "delete" accessibility action. Navigation is tested with `renderRouter` from `expo-router/testing-library` in `__tests__/shell.test.tsx` (real root layout; `@/db/client` and `@/db/useDatabaseSetup` mocked). `renderRouter` pitfalls: `await` it (Testing Library v14's render is async); `getPathname()` lives on the returned Promise, not on the awaited result, so keep the Promise (`const app = renderRouter(...); await app; app.getPathname()`); it enables fake timers, so use `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })`; tabs have the `tab` role and are found by their `tabBarAccessibilityLabel`.

The `preview` APK (build 4, from the "Build APK" workflow, with the Phase 3 code) is installed on the phone and the EAS keystore is backed up outside the repo. Still unconfirmed from Phase 0: that a workflow APK installs over an earlier one without uninstalling.

Read `docs/plan/phase-0.md` for exactly what was done, and the plan docs below before writing code for the next phase — they are the source of truth for what to build next and in what order.

## What this app is

Basket Routine: an Android-only, personal-use app (sideloaded APK, no Play Store) for logging basketball training routines. It follows Hevy's user flow (routines → workout templates → active workout → history) but tracks **Attempts / Makes** per set with automatically derived FG% instead of weight/reps.

## Planning docs

- `docs/plan/PLAN.md` — high-level plan: tech stack, domain model, main user flow, milestones (Phase 0–7), backlog, risks. Kept free of deep technical detail by design.
- `docs/plan/phase-N.md` — one detailed plan per phase, written just before that phase starts (`phase-0.md` and `phase-1.md` done, `phase-2.md`, `phase-3.md` and `phase-4.md` implemented). Contains the concrete decisions, steps, and a "done when" checklist for that phase.

When planning or starting a new phase, write its `docs/plan/phase-N.md` before implementing, following the level of detail in `phase-0.md`.

## Current status

- Phase 0 done (APK built and installed, keystore backed up).
- Phase 1 done (on-phone check passed, CI green).
- Phase 2 done (`docs/plan/phase-2.md`): on-phone check passed; CI to be confirmed green on `main` after the push.
- Phase 3 (`docs/plan/phase-3.md`): **done**, both parts. Part A (code): on-phone check (step 11) passed in two passes, with changes from the first one's feedback (swipe to delete a set, the last set can't be deleted, hiding the keyboard leaves the field, note at the end of the card), CI green on `main`. Part B: APK installed (clean install, works offline), keystore backed up, court session logged with no bugs; the feedback is at the end of the phase file (only FG% coloring was asked for, added to Phase 7).
- Phase order changed after the Phase 3 phone check: Phase 4 is now Routines & Workout Templates (the main flow), then History (5) and Exercise Catalog (6). Phase 4 (`docs/plan/phase-4.md`: template editor as an in-memory draft with Save/Cancel, "Update template?" asked at Finish only when the structure changed, routines as sections on the Workout tab, no schema change, no APK this phase); **done**: on-phone check passed (one fix from it: swiping a set row now also starts on its number field, see the phase file's "Results"), all CI checks pass locally (309 tests, no migration), CI green on `main`.
- Phase 5 (`docs/plan/phase-5.md`: read-only History, the list grouped by month, the detail, delete, no schema change): **Part A done**: on-phone check passed, all CI checks pass locally (344 tests, no migration); CI green on `main`. Left: Part B (APK over build 4, which also closes the Phase 0 item about installing over an earlier APK). Next after that: write `docs/plan/phase-6.md`.
- Decision (done): the first `preview` APK build happened after Phase 3, not at the end of the project.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo (React Native) + TypeScript, Android only |
| Navigation | Expo Router (`app/` holds routes only; everything else lives in `src/`) |
| Local DB | SQLite via `expo-sqlite` + Drizzle ORM 0.45 (offline-first); `better-sqlite3` for tests only |
| Package manager | npm, lockfile committed, Node pinned via `.nvmrc` (Node 24); `.npmrc` sets `legacy-peer-deps=true` (expo-router's peer graph still lists `react-dom`/`react-native-web`, which this Android-only app doesn't install) |
| Build/deploy | EAS Build, `preview` profile, APK for manual sideload — triggered manually via a `workflow_dispatch` GitHub Actions workflow, after CI passes |
| CI | GitHub Actions: lint, format check, typecheck, unit tests, `expo-doctor` |

Android application ID is `com.jarmenio.basketroutine` — treat this as immutable; changing it later creates a separate app and loses the data already on the phone.

## Domain model (conceptual)

- **Routine** → **Workout (template)** → **Exercise (catalog)**, referenced by a **Workout exercise** entry with a **Template set** list.
- Every exercise has a `trackingType`: `makes_attempts` (FG% applies) or `check` (done/not-done), extensible later to reps/time.
- For `makes_attempts`, the workout exercise has a `targetMode` shared by all its sets: `makes` (fixed makes, user logs attempts) or `attempts` (fixed attempts, user logs makes).
- **Session** is a snapshot created when a template (or an empty workout) is started — it copies exercise name/category/trackingType/targetMode so history survives catalog edits, and never mutates the template it came from. At most one `in_progress` session at a time.
- **Validation invariant**: makes can never exceed attempts (in `attempts` mode, logged makes ≤ target; in `makes` mode, logged attempts ≥ target).
- **FG% is always derived, never stored**: set FG% = makes/attempts; aggregate FG% = Σmakes/Σattempts (not an average of percentages); only sets with a logged value count.
- **Deletion is soft** everywhere (routines, workouts, custom exercises): user-facing delete removes visibility, but records are archived internally so history stays intact.

## Working conventions

- One commit per phase, made when the phase's work is done — not per internal step. Fix-up commits are fine afterward if CI or a build fails.
- Nothing gets installed (global tools, SDKs, version managers) without asking first and explaining what it's for.
- UI and code are in English throughout, regardless of the developer's own language.
