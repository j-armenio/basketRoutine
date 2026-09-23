# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Phase 0 (project scaffolding) is done.** The app is a working Expo Router + TypeScript project, Android only, dark UI. `app/` holds routes (`_layout.tsx`, `index.tsx` — a placeholder screen so far); everything else lives in `src/` (currently just `src/theme/colors.ts`). No data layer yet — Phase 1 (SQLite + Drizzle, domain logic) hasn't started, so there's no `src/db` or `src/domain`.

Commands that work now: `npm run lint`, `npm run format` / `format:check`, `npm run typecheck`, `npm test`, `npx expo start` (dev loop — scan the QR code with Expo Go). CI (`.github/workflows/ci.yml`) runs all of those plus `npx expo-doctor` on every push and PR. An EAS project is linked (`@jarmenio/basket-routine`, ID in `app.json`'s `extra.eas.projectId`).

Pending from Phase 0 (see `docs/plan/phase-0.md` final checklist):

- Finish an `eas build -p android --profile preview` (a first attempt was started and deliberately canceled, to resume later) and confirm the resulting APK installs and opens on the phone.
- Back up the EAS-generated keystore outside the repo, once a build completes.

Read `docs/plan/phase-0.md` for exactly what was done, and the plan docs below before writing code for the next phase — they are the source of truth for what to build next and in what order.

## What this app is

Basket Routine: an Android-only, personal-use app (sideloaded APK, no Play Store) for logging basketball training routines. It follows Hevy's user flow (routines → workout templates → active workout → history) but tracks **Attempts / Makes** per set with automatically derived FG% instead of weight/reps.

## Planning docs

- `docs/plan/PLAN.md` — high-level plan: tech stack, domain model, main user flow, milestones (Phase 0–7), backlog, risks. Kept free of deep technical detail by design.
- `docs/plan/phase-N.md` — one detailed plan per phase, written just before that phase starts (only `phase-0.md` exists so far). Contains the concrete decisions, steps, and a "done when" checklist for that phase.

When planning or starting a new phase, write its `docs/plan/phase-N.md` before implementing, following the level of detail in `phase-0.md`.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo (React Native) + TypeScript, Android only |
| Navigation | Expo Router (`app/` holds routes only; everything else lives in `src/`) |
| Local DB | SQLite via `expo-sqlite` + Drizzle ORM (offline-first) — **not built yet, Phase 1** |
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
