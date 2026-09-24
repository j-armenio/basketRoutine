# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Phase 0 (scaffolding) and Phase 1 (data layer) are done** (final checklist in `docs/plan/phase-1.md` fully ticked: on-phone check passed, CI green on `main`). **Phase 2 (design system and app shell) is done** (on-phone check passed). The app is an Expo Router + TypeScript project, Android only, dark UI. `app/` holds routes only: `_layout.tsx` (runs migrations + seed and preloads the icon font behind the splash screen, then renders the `Stack` inside a `ThemeProvider`) and `(tabs)/` (bottom tabs Workout `index.tsx` · Exercises · History, placeholder screens; headers are off, each screen draws its title through `Screen`). Phase 3 (active workout) adds three routes on the root `Stack`, above the tabs: `active-workout.tsx`, `add-exercise.tsx` (modal picker) and `workout-summary/[id].tsx`. Everything else lives in `src/`:

- `src/domain/` — pure TypeScript, no DB imports: enum lists (`types.ts`), validation returning `{ ok, reason }` (`validation.ts`), set FG% (`fg.ts`), exercise/session summaries (`summary.ts`), and `DomainError` (`errors.ts`).
- `src/db/` — `schema.ts` (Drizzle), `migrations/` (generated, never hand-edited), `client.ts` (expo-sqlite, opens `basket-routine.db`), `useDatabaseSetup.ts` (migrate + seed), `seed/` (38 predefined exercises, upserted by `seedKey`), `repositories/` (plain functions taking a `Db` as first argument: exercises, routines, workouts, sessions; they throw `DomainError` on rule violations), `test-utils.ts` (`createTestDb()`: in-memory better-sqlite3 with the real migrations).
- `src/theme/` — design tokens: `colors.ts` (role-named, contrast-tested in `colors.test.ts`), `spacing.ts` (spacing, radius, `touch` and `input` sizes), `typography.ts`, `navigationTheme.ts` (React Navigation dark theme built from the tokens). Styling is `StyleSheet.create` + these tokens, no styling library.
- `src/components/` — base components: `Screen` (optional `left` slot, `bottomInset`, `keyboardAvoiding`), `AppText`, `Button` (variants primary/secondary/ghost/danger), `Card`, `EmptyState`, `Icon`, `IconButton`, `NumberInput`, `TextField`, `ListItem`, `ActionSheet`, `SwipeToDelete`. **Only `Icon` imports `expo-symbols`** (Android symbol name, always with a `tintColor`). All text goes through `AppText`; pressables are at least 48 dp (`touch.min`). Every action is a plain tap, with one exception chosen by the developer: a set row is deleted by dragging it left (`SwipeToDelete`, on gesture-handler's `ReanimatedSwipeable`; `app/_layout.tsx` wraps everything in `GestureHandlerRootView`). An exercise always keeps at least one set. Hiding the keyboard blurs the focused input (`useBlurOnKeyboardHide`, in the root layout), so it counts as leaving the field.
- `src/features/workout/` — the active-workout feature: `sessionStore.ts` (version counter + `useSyncExternalStore`), `hooks.ts` (sync repository reads keyed by the version), `actions.ts`, `ExerciseCard`, `ShootingSetRow` / `CheckSetRow`, `useNumberCell.ts` + `setDraft.ts` (draft rule), `ExerciseNote`, `ResumeBanner` (rendered above the tab bar). **Every session write goes through `actions.ts`** (it notifies the store and turns a `DomainError` into `{ ok: false, reason }`). **A valid number is saved on every keystroke, and the set row rolls an invalid one back on blur** (or on unmount) to the value it had at focus.
- `src/domain/` also has `format.ts` (FG%, count parsing, duration, date), `defaults.ts` (default targets, workout name by time of day), `order.ts` (`moveItem`), `messages.ts` (`reasonMessage`). `addSessionExercise` now inserts the exercise's first set.

Commands: `npm run lint`, `npm run format` / `format:check`, `npm run typecheck`, `npm test`, `npm run db:generate` (after any change to `src/db/schema.ts`), `npx expo start` (dev loop — scan the QR code with Expo Go). CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, tests, a schema/migrations-in-sync check (`db:generate` must leave `src/db/migrations` unchanged) and `npx expo-doctor` on every push and PR. An EAS project is linked (`@jarmenio/basket-routine`, ID in `app.json`'s `extra.eas.projectId`).

**Migration policy:** until an APK with a DB is installed on the phone, the initial migration may be deleted and regenerated freely (clear Expo Go's data afterwards). After that, migrations are append-only.

Tests live next to the code (`*.test.ts` / `*.test.tsx`); DB tests use the `@jest-environment node` docblock. Repositories call `.sync()` on Drizzle relational queries and read inserted rows back with `.returning()`. Jest runs on the `jest-expo/android` preset; `jest.setup.js` swaps `ReanimatedSwipeable` for a plain view (the gesture can't run in Jest), so tests delete a row through its "delete" accessibility action. Navigation is tested with `renderRouter` from `expo-router/testing-library` in `__tests__/shell.test.tsx` (real root layout; `@/db/client` and `@/db/useDatabaseSetup` mocked). `renderRouter` pitfalls: `await` it (Testing Library v14's render is async); `getPathname()` lives on the returned Promise, not on the awaited result, so keep the Promise (`const app = renderRouter(...); await app; app.getPathname()`); it enables fake timers, so use `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })`; tabs have the `tab` role and are found by their `tabBarAccessibilityLabel`.

Pending from Phase 0 (see `docs/plan/phase-0.md` final checklist):

- Finish an `eas build -p android --profile preview` (a first attempt was started and deliberately canceled, to resume later) and confirm the resulting APK installs and opens on the phone.
- Back up the EAS-generated keystore outside the repo, once a build completes.

Read `docs/plan/phase-0.md` for exactly what was done, and the plan docs below before writing code for the next phase — they are the source of truth for what to build next and in what order.

## What this app is

Basket Routine: an Android-only, personal-use app (sideloaded APK, no Play Store) for logging basketball training routines. It follows Hevy's user flow (routines → workout templates → active workout → history) but tracks **Attempts / Makes** per set with automatically derived FG% instead of weight/reps.

## Planning docs

- `docs/plan/PLAN.md` — high-level plan: tech stack, domain model, main user flow, milestones (Phase 0–7), backlog, risks. Kept free of deep technical detail by design.
- `docs/plan/phase-N.md` — one detailed plan per phase, written just before that phase starts (`phase-0.md` and `phase-1.md` done, `phase-2.md` implemented). Contains the concrete decisions, steps, and a "done when" checklist for that phase.

When planning or starting a new phase, write its `docs/plan/phase-N.md` before implementing, following the level of detail in `phase-0.md`.

## Current status

- Phase 0 done (pending: first completed `preview` APK build installed on the phone, and the keystore backup).
- Phase 1 done (on-phone check passed, CI green).
- Phase 2 done (`docs/plan/phase-2.md`): on-phone check passed; CI to be confirmed green on `main` after the push.
- Phase 3 (`docs/plan/phase-3.md`): code implemented, lint/format/typecheck/tests/expo-doctor pass locally. On-phone check (step 11) done in two passes, with changes from the first one's feedback (swipe to delete a set, the last set can't be deleted, hiding the keyboard leaves the field, note at the end of the card). Pending for Part A: green CI on the phase commit. Part B (APK, keystore, court session) not started.
- Phase order changed after the Phase 3 phone check: Phase 4 is now Routines & Workout Templates (the main flow), then History (5) and Exercise Catalog (6). Phase 4's detailed plan isn't written yet.
- Decision: the first `preview` APK build (which also clears the pending Phase 0 items) happens after Phase 3, not at the end of the project.

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
