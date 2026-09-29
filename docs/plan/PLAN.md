# Basket Routine — Development Plan

A simple Android app for logging basketball training routines, modeled on Hevy's user flow and design but measuring **Attempts / Makes** (with automatic FG%) instead of weight / reps.

**Scope:** Android only, personal use (sideloaded APK, no Play Store). UI and code in English. The project is created from scratch; nothing from earlier repository states is reused.

This is a high-level plan. Each phase gets its own detailed plan before development starts.

## 1. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (React Native) + TypeScript** | One codebase, hot reload, run on a real phone instantly |
| Navigation | **Expo Router** | Tabs + stacks with minimal boilerplate |
| Local DB | **SQLite (expo-sqlite + Drizzle ORM)** | Offline-first on the court, typed schema, migrations |
| Testing | Unit tests for domain logic and data layer; E2E tests on the device | Confidence in FG% math and core flows |
| Build / deploy | **EAS Build**, APK for sideload | No local Android Studio setup needed |
| Quality | Lint, format, typecheck and tests in CI | Catch regressions early |

## 2. Domain Model (conceptual)

- **Routine** — a named folder that groups workout templates (e.g., "Pre-season").
- **Workout (template)** — belongs to a Routine; ordered list of exercises with planned sets.
- **Exercise (catalog)** — name, category, text description, optional main media (image, GIF or short video, picked from the phone and stored with the app; predefined ones ship with the app), `isCustom` flag, **`trackingType`**:
  - `makes_attempts` — shooting drills, FG% applies.
  - `check` — non-shooting drills (ball handling, footwork…), set is just marked done.
  - Extensible later (reps, time).
  - Categories: Finishing, Ball Handling, Dribbling, Shooting, Footwork (extensible).
- **Workout exercise** — an exercise inside a template. For `makes_attempts` it has one **`targetMode`** that applies to all its sets:
  - `makes` = fixed makes → the user logs how many **attempts** it took.
  - `attempts` = fixed attempts → the user logs how many **makes** they hit.
- **Template set** — `makes_attempts`: a **`targetValue`**. `check`: no fields besides order.
- **Session (performed workout)** — snapshot created when a template (or an empty workout) is started; references its template and keeps a copy of the workout name; status (`in_progress` | `finished`), start/end time. At most one `in_progress` session. Editing it never changes the template.
- **Session exercise** — copy of exercise name, category, trackingType and targetMode (so history survives catalog changes), reference to the exercise, free-text **note**.
- **Session set**
  - `makes_attempts`: `targetValue` copied from the template + the **logged value** (attempts or makes, depending on the mode). Only the logged value is stored.
  - `check`: a `completed` flag (✓).
- **Validation** — makes can never exceed attempts: in `attempts` mode, logged makes ≤ target; in `makes` mode, logged attempts ≥ target.
- **Deletion** — from the user's point of view, deleting a Routine removes it and everything inside it; deleting a workout or a custom exercise removes it. Internally these are archived, so **history always stays accessible and intact**.

**FG% rules** (derived, never stored):
- Set FG% = makes / attempts.
- Aggregate FG% (per exercise, per session) = **Σmakes / Σattempts**, not an average of percentages.
- Only `makes_attempts` sets **with a logged value** count. Empty sets are excluded from summaries.

## 3. Main User Flow (Hevy-inspired)

1. **Workout tab** → list of Routines (folders) → Workout templates → "Start Workout" (or "Start Empty Workout").
2. **Active Workout** screen: exercise cards with a set table that depends on the tracking type:
   - `makes_attempts` (mode shown on the exercise card): `Set | Target | Logged | FG%`
   - `check`: `Set | ✓`
   - Plus "Add Set", per-exercise Note field, "Add Exercise", "Finish" / "Discard".
   - The user logs each set right after performing it.
3. **Finish** → summary (total makes, attempts, overall FG% for shooting exercises; completed count for check exercises) → saved to History. Option to **overwrite** the template with the session's structure.
4. **Exercises tab** → catalog by category, search, exercise detail (description + media), create custom exercise.
5. **History tab** → past sessions list and read-only detail.

## 4. Milestones

Phases are ordered so a usable prototype (empty workout logged on the court) exists early. Routines and workout templates come right after it, since starting a planned workout is the app's main flow; history and catalog management follow.

### Phase 0 — Project Setup
- New Expo + TypeScript project, Android only, dark UI style.
- Navigation, lint/format, CI.
- Build pipeline producing an installable APK.
- **Done when:** a CI-green APK installs and opens on the device.

### Phase 1 — Data Layer & Seed Catalog
- Schema for all entities above.
- Data access for routines, workouts, exercises, sessions.
- Seed catalog (~5–10 exercises per category, with descriptions; media optional).
- Domain rules (FG%, summaries, validation) with unit tests.
- **Done when:** tests pass and data persists across app restarts.

### Phase 2 — Design System & App Shell
- Hevy-like visual language: dark theme, accent color, cards, large touch targets, inputs usable with sweaty hands.
- Bottom tabs: Workout · Exercises · History, with placeholder screens.
- Only base components now; more are extracted as real screens need them.
- **Done when:** navigation skeleton works on device in dark mode.

### Phase 3 — Active Workout (prototype)
- Start an empty workout, add exercises from the seed catalog (choosing the target mode for shooting drills).
- Set table per tracking type; FG% computed live; add/delete sets; add/remove/reorder exercises; per-exercise note.
- Validation (makes never exceed attempts).
- Every input saved immediately (survives app kill); "resume workout" banner like Hevy.
- Finish (summary) / Discard (confirmation).
- **Done when:** the flow works end to end on the phone (code part, unblocks Phase 4); then a real court session from the first APK closes the first real-use feedback round (tracked separately, so an EAS problem can't hold up the code).

### Phase 4 — Routines & Workout Templates
- Create / rename / delete / reorder Routines.
- Create / edit / delete Workout templates inside a Routine: add exercises from the seed catalog (the Phase 3 picker), set the target mode, reorder, remove, add/remove template sets with target values.
- Start a session from a template; "overwrite template" option on Finish.
- **Done when:** a full routine with multiple workouts can be built and started without touching code; templates never change unless explicitly overwritten.

### Phase 5 — History
- List of finished sessions (date, workout name, duration, overall FG%).
- Session detail (read-only): the workout's summary and every exercise with its sets, FG% and notes, as they were when it was finished. A past session can be deleted, not edited.
- **Done when:** past sessions are browsable and can be deleted.

### Phase 6 — Exercise Catalog
- Browse by category, search; every exercise shows its main media (image, GIF or short video) next to its name, or a placeholder; the detail shows it larger, with the description.
- Create / edit / delete custom exercises, choosing the tracking type and picking the media from the phone's gallery (predefined ones are read-only, media included).
- **Done when:** user can find any exercise and create a custom one.

### Phase 7 — Polish
- FG% coloring (success/danger by FG% on set rows, totals, the summary and history; asked for after the first court session).
- Haptics, an empty-state pass and an accessibility pass over every screen.
- A placeholder app icon and splash (a basketball glyph); the final art comes with the visual redesign.
- **Done when:** the polish works on the phone and CI is green.

### Phase 8 — Visual Redesign
- A visual refresh of the whole app from the developer's design handoff: a new theme and font, every screen restyled, the main actions moved to the bottom of the screen. Built in batches (foundations first, then the screens by flow).
- A few features that came with the design: an elapsed timer in the active workout, an FG% evolution chart on History, per-exercise stats and "Add to Routine" on the exercise detail.
- The final app icon and splash, checked on an APK.
- **Done when:** every screen follows the new look on the phone.

### Phase 9 — Testing & Release
- E2E tests of the main flow (create routine → start → log → finish → history), run on the phone against a separate test install, so the real data is never touched.
- Performance check on the target phone with a long session and a long history.
- Release APK (v1.0) installed over the current one, keeping the data.
- **Done when:** v1.0 APK is installed and used in a real training session.

## 5. Risks & Mitigations
- **Data loss on the court** → every input saved immediately; interrupted sessions can be resumed.
- **Data lost on uninstall** (no manual backup in v1) → accepted trade-off. Android Auto Backup stays at its default (enabled) as a best-effort safety net; no work is spent on it.
- **No internet in the gym** → media is stored on the phone (or ships with the app), never loaded from the web; a placeholder when an exercise has none.
- **Set logging awkward on the court** → validated early with the Phase 3 prototype (on the phone before templates are built, and on the court while they are).
- **Broken history after deletes** → session snapshots + archiving instead of hard deletes.
- **Scope creep** → nothing beyond the planned phases until v1.0 is released (Phase 9).
