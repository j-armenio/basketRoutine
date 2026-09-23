# Basket Routine — Development Plan

A simple Android app for logging basketball training routines, modeled on Hevy's user flow and design but measuring **Attempts / Makes** (with automatic FG%) instead of weight / reps.

**Scope:** Android only, personal use (sideloaded APK, no Play Store). UI and code in English. The project is created from scratch; nothing from earlier repository states is reused.

## 1. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (React Native) + TypeScript**, current stable SDK | One codebase, hot reload, run on a real phone instantly |
| Navigation | **Expo Router** (file-based) | Tabs + stacks with minimal boilerplate |
| Local DB | **expo-sqlite + Drizzle ORM** (migrations) | Offline-first on the court, typed schema, easy seeding |
| State | **SQLite is the single source of truth**; screens read via Drizzle `useLiveQuery` | Every input persisted immediately; no second store to keep in sync |
| Media | `expo-image` (GIF) / `expo-video` or open link externally | Exercise demos via URL (optional) |
| Testing | Jest for pure domain logic; Drizzle + `better-sqlite3` for repository tests in Node; Maestro for E2E on a dev build | `expo-sqlite` is native and does not run in Node |
| Build / deploy | **EAS Build**: `development` profile (dev client, required by Maestro) and `preview` profile (APK for sideload) | No local Android Studio setup needed |
| Quality | ESLint + Prettier + `tsc --noEmit`; GitHub Actions CI | Catch regressions early |

Note: Drizzle migrations in Expo need extra bundler setup (`.sql` imports via Metro/Babel + `useMigrations`). Validate it early in Phase 1.

## 2. Domain Model (conceptual)

- **Routine** — a named folder that groups workout templates (e.g., "Pre-season").
- **Workout (template)** — belongs to a Routine; ordered list of exercises with planned sets.
- **Exercise (catalog)** — name, category, text description, optional media URL (GIF/video), `isCustom` flag, **`trackingType`**:
  - `makes_attempts` — shooting drills, FG% applies.
  - `check` — non-shooting drills (ball handling, footwork…), set is just marked done.
  - Extensible later (reps, time).
  - Categories: Finishing, Ball Handling, Dribbling, Shooting, Footwork (extensible).
- **Template set**
  - `makes_attempts`: **`targetMode`** (`makes` | `attempts`) + **`targetValue`**.
    - `makes` = fixed makes → the user logs how many **attempts** it took.
    - `attempts` = fixed attempts → the user logs how many **makes** they hit.
  - `check`: no fields besides order.
- **Session (performed workout)** — snapshot created when a template (or an empty workout) is started; status (`in_progress` | `finished`), start/end time. At most one `in_progress` session. Editing it never changes the template.
- **Session exercise** — copy of exercise name + category + trackingType (so history survives catalog changes), reference to the exercise, free-text **note**.
- **Session set** — `targetMode` and `targetValue` copied from the template, the **logged value** (attempts or makes, depending on the mode), `completed` flag. `check` sets only have `completed`.
- **Deletion** — catalog exercises and templates are soft-deleted (archived) so past sessions stay intact.

**FG% rules** (derived, never stored):
- Set FG% = makes / attempts.
- Aggregate FG% (per exercise, per session) = **Σmakes / Σattempts**, not an average of percentages.
- Only **completed (✓) `makes_attempts` sets** count. Uncompleted sets are excluded from summaries.

## 3. Main User Flow (Hevy-inspired)

1. **Workout tab** → list of Routines (folders) → Workout templates → "Start Workout" (or "Start Empty Workout").
2. **Active Workout** screen: exercise cards with a set table that depends on the tracking type:
   - `makes_attempts`: `Set | Mode | Target | Logged | FG% | ✓`
   - `check`: `Set | ✓`
   - Plus "Add Set", per-exercise Note field, "Add Exercise", "Finish" / "Discard".
3. **Finish** → summary (total makes, attempts, overall FG% for shooting exercises; completed count for check exercises) → saved to History. Option to **overwrite** the template with the session's structure.
4. **Exercises tab** → catalog by category, search, exercise detail (description + media), create custom exercise.
5. **History tab** → past sessions list and detail.

## 4. Milestones

### Phase 0 — Project Setup
- Create a new Expo + TypeScript project from scratch (`create-expo-app`, current stable SDK), Android only, dark UI style.
- Expo Router, lint/format, CI running typecheck + tests.
- Configure EAS with `development` and `preview` profiles; install a dev build and a "hello world" APK on the phone.
- **Done when:** a CI-green APK installs and opens on the device.

### Phase 1 — Data Layer & Seed Catalog
- DB schema and migrations for all entities above (including `trackingType`, `targetMode`, snapshots, soft delete).
- Repository layer (CRUD) for routines, workouts, exercises, sets, sessions.
- Idempotent seed with stable IDs (~5–10 exercises per category, descriptions; media links optional).
- Pure domain functions for FG%, summaries and validation, with unit tests; repository tests on `better-sqlite3`.
- **Done when:** domain + repository tests pass; data persists across app restarts.

### Phase 2 — Design System & App Shell
- Hevy-like visual language: dark theme, accent color, cards, large touch targets, numeric inputs usable with sweaty hands.
- Bottom tabs: Workout · Exercises · History, with placeholder screens.
- Build only the base primitives now; extract further components as real screens need them.
- **Done when:** navigation skeleton works on device in dark mode.

### Phase 3 — Exercise Catalog
- Browse by category, search, exercise detail with description and GIF/video preview (text fallback).
- Create / edit / archive custom exercises, choosing the tracking type (predefined ones are read-only, or duplicated to customize).
- **Done when:** user can find any exercise and create a custom one.

### Phase 4 — Routines & Workout Templates
- Create / rename / delete / reorder Routines (↑/↓ buttons).
- Create / edit / delete Workout templates inside a Routine: add exercises from the catalog (picker), reorder (↑/↓), remove, add/remove template sets with target mode and value.
- **Done when:** a full routine with multiple workouts can be built without touching code.

### Phase 5 — Active Workout (core feature)
- Spike first: numeric input table with keyboard handling (focus flow, field not hidden by keyboard).
- Start a session from a template or empty.
- Set table per exercise by tracking type; FG% computed live; add/delete sets; add/remove/reorder exercises mid-session; per-exercise note.
- Validation: non-negative integers; makes ≤ attempts.
- Every input persisted immediately (survives app kill); "resume workout" banner like Hevy.
- Finish (summary) / Discard (confirmation); optional "overwrite template" prompt.
- **Done when:** a real court session can be logged end to end on the phone.

### Phase 6 — History
- List of finished sessions (date, workout name, duration, overall FG%).
- Session detail with per-exercise sets, FG% and notes; edit or delete a past session.
- **Done when:** past sessions are browsable and editable without affecting templates.

### Phase 7 — Polish, Testing & Release
- E2E flows with Maestro on the dev build (create routine → start → log → finish → history).
- UX polish: empty states, haptics, accessibility labels, app icon and splash.
- Performance check on the target phone (list scrolling and input latency during a long session).
- Build signed release APK via EAS and sideload.
- **Done when:** v1.0 APK is installed and used in a real training session.

## 5. Backlog (post-v1, optional)
- "Previous" column showing last performance per exercise during the active workout.
- Session duration and rest timers.
- FG% progress charts per exercise / category.
- Reps / time tracking types for non-shooting drills.
- Shot-zone tracking (court map), shot-type tags (free throws, 3PT).
- Fine-grained "update template" (diff instead of overwrite).
- Drag & drop reordering.
- JSON export / import backup.
- Cloud sync / multi-device.

## 6. Risks & Mitigations
- **Data loss on the court** → SQLite as single source of truth, persist every input immediately; resume interrupted sessions.
- **Data lost on uninstall** (no manual backup in v1) → accepted trade-off; decide explicitly on Android Auto Backup (`allowBackup`), which may include the DB by default.
- **Media links break / no internet in the gym** → media optional; text description as fallback.
- **Drizzle migrations bundling in Expo** → validate setup at the start of Phase 1.
- **Numeric table + keyboard UX** → spike at the start of Phase 5, not left for polish.
- **Broken history after deletes** → session snapshots + soft delete.
- **Scope creep** → backlog items only after Phase 7.
