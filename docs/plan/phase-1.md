# Phase 1 — Data Layer & Seed Catalog (detailed plan)

Detailed plan for Phase 1 of [PLAN.md](PLAN.md).

**Goal:** a local SQLite database, with a typed schema for every entity in the domain model, versioned migrations, a seeded exercise catalog, data access for exercises, routines, workouts and sessions, and the pure domain rules (FG%, summaries, validation). All of it has unit tests.

**Done when:** `npm test` passes (domain and data layer), CI is green, and data written on the phone survives killing and reopening the app.

## Decisions for this phase

| Topic | Decision |
|---|---|
| DB engine | `expo-sqlite`, which works in Expo Go, so the dev loop is unchanged. One DB file, `basket-routine.db`. |
| Drizzle version | The stable line: `drizzle-orm@0.45.x` + `drizzle-kit@0.31.x` (npm `latest`), which Drizzle's Expo guide covers. The 1.0 line (currently an RC) changes the relations API and the generated migrations folder, so moving to it is backlog. |
| ORM / migrations | Drizzle ORM + `drizzle-kit`. The schema lives in TypeScript and `drizzle-kit generate` writes SQL migrations to `src/db/migrations/`. The app applies them on startup with `useMigrations`. |
| Connection pragmas | `PRAGMA foreign_keys = ON` (SQLite has it off by default) and `journal_mode = WAL`, both set on open. `enableChangeListener: true` too, so Drizzle live queries are available in Phase 3. |
| IDs | `integer` autoincrement primary keys. Seeded exercises also get a unique, stable `seedKey` (e.g. `form_shooting`), so the seed can find them again. UUIDs are only worth it for sync/export, which is backlog. |
| Timestamps | `integer` in ms (`mode: 'timestamp_ms'`). |
| Ordering | An explicit `position` integer on every ordered list (routines, workouts, workout exercises, template sets, session exercises, session sets). |
| Enums | Stored as text, with a `check()` constraint per column so the DB rejects unknown values too: `trackingType` (`makes_attempts` \| `check`), `targetMode` (`makes` \| `attempts`), `category` (`finishing`, `ball_handling`, `dribbling`, `shooting`, `footwork`), session `status` (`in_progress` \| `finished`). The value lists are defined once in `src/domain` and reused by the schema. |
| Soft delete | `archivedAt` (nullable) on routines, workouts and exercises. List queries filter out archived rows; get-by-id still returns them. Template contents (workout exercises, template sets) are hard-deleted when edited, because sessions keep their own snapshots. |
| Session invariant | At most one `in_progress` session, enforced twice: a partial unique index (`WHERE status = 'in_progress'`) and a check in the data layer that throws a clear `DomainError`. |
| Where rules live | `src/domain/` is pure TypeScript with no DB imports. `src/db/` imports domain and applies validation **before** writing, so no caller can bypass the invariant. |
| Data access style | Plain functions that take the `db` as their first argument (e.g. `startEmptySession(db, …)`), typed against Drizzle's generic sync SQLite database. The same code then runs on `expo-sqlite` in the app and `better-sqlite3` in tests. Inserted/updated rows are read back with `.returning()`, never from `run()`'s result, whose shape differs between the two drivers (`lastInsertRowId` vs `lastInsertRowid`). |
| Errors | `src/domain` validators return a typed result (`{ ok: true }` / `{ ok: false, reason }`). Data access functions turn a failed result (or a rule like "not found" / "predefined exercise is read-only") into `throw new DomainError(reason)` — one class, with `reason` a typed union. Throwing inside a Drizzle transaction rolls it back automatically; returning a result from inside one would need a manual `tx.rollback()`. Phase 3 catches `DomainError` and shows the reason inline. |
| Seeding | In code, not in a migration. It runs after migrations on every launch, in one transaction, and upserts the predefined exercises by `seedKey`. The upsert overwrites only `name`, `category` and `description`, so editing those later only takes a code change. `trackingType` is set on insert and never changed by the seed (changing it under existing templates would leave them with an invalid `targetMode`; a different tracking type means a new entry with a new `seedKey`). An entry removed from the list is left as it is in the DB. Custom exercises are never touched. |
| Testing DB | `better-sqlite3`, in memory, one fresh DB per test, with the **real** generated migrations applied through Drizzle's `better-sqlite3` migrator. |
| Migration policy | Until an APK with a DB is installed on the phone, the initial migration may be deleted and regenerated freely (clear Expo Go's data after doing so). After that, migrations are append-only. CI checks that the schema and migrations are in sync. |

## Out of scope (belongs to later phases)

- Any real screen, theme or navigation work → Phase 2 onward. The only UI in this phase is a temporary DB check on the placeholder screen (step 8).
- Template editing beyond basic create/rename/archive: reordering exercises, editing template sets, "overwrite template from session" → Phase 6.
- Editing or deleting finished sessions → Phase 4, which adds its own data functions.
- Exercise media: the seed has descriptions only, `mediaUrl` stays null → Phase 5.
- FG% display formatting (rounding, "—" for empty) → Phase 3.

## Tools

Nothing is installed without asking first. The packages are project-local only:

| Package | What it does | Kind |
|---|---|---|
| `expo-sqlite` | SQLite on the device (`npx expo install`) | dependency |
| `drizzle-orm` | Typed schema, queries, runtime migrator | dependency |
| `drizzle-kit` | Generates SQL migrations from the schema | devDependency |
| `babel-preset-expo` | Expo's Babel preset. It is currently only nested under `node_modules/expo/`, so a project `babel.config.js` can't resolve it until it's a direct devDependency (`npx expo customize babel.config.js` adds it at the SDK's version) | devDependency |
| `babel-plugin-inline-import` | Lets the app bundle the generated `.sql` migration files (the setup Drizzle documents for Expo) | devDependency |
| `better-sqlite3` + `@types/better-sqlite3` | SQLite in Node, for Jest only | devDependency |

## Steps

### 1. Install and wire up Drizzle
- Install the packages above (`npx expo install expo-sqlite`, npm for the rest).
- `drizzle.config.ts`: `dialect: 'sqlite'`, `driver: 'expo'`, `schema: './src/db/schema.ts'`, `out: './src/db/migrations'`.
- `babel.config.js`: create it with `npx expo customize babel.config.js` (which also installs `babel-preset-expo`), then add `['inline-import', { extensions: ['.sql'] }]`. The Jest preset reads the same file.
- `metro.config.js`: create it with `npx expo customize metro.config.js`, then add `'sql'` to `resolver.sourceExts`.
- Scripts: `db:generate` (`drizzle-kit generate`).
- Add `src/db/migrations/` to `.prettierignore` and to the ESLint ignores, since the files are generated.
- Check: `npx expo start` still opens the app in Expo Go, `npm test` still passes (the new Babel config is picked up by Jest), and `npx expo-doctor` passes.

### 2. Domain types and rules (`src/domain/`)
- `types.ts`: the enum value lists and their TS types (`TRACKING_TYPES`, `TARGET_MODES`, `CATEGORIES`, `SESSION_STATUSES`), plus category display labels.
- `validation.ts`:
  - `targetValue` is an integer ≥ 1. The logged value is an integer ≥ 0, or empty.
  - `attempts` mode: logged makes ≤ target.
  - `makes` mode: logged attempts ≥ target.
  - `check` exercises have no `targetMode`, and `makes_attempts` exercises require one.
  - Returns a typed result (`{ ok: true }` / `{ ok: false, reason }`) instead of throwing, so Phase 3 can show the reason inline.
- `fg.ts`: turns a set into `{ makes, attempts }` based on the mode (`makes` mode: makes = target, attempts = logged; `attempts` mode: attempts = target, makes = logged), or `null` when no value is logged. Set FG% = makes / attempts, as a ratio between 0 and 1.
- `summary.ts`:
  - Exercise summary and session summary: shooting totals `{ makes, attempts, fgPct }` using **Σmakes / Σattempts**, counting only sets with a logged value.
  - Check exercises: `{ completed, total }`.
  - `fgPct` is `null` when nothing is logged.
- Unit tests for every rule, including the edge cases: empty sets excluded, the aggregate is not an average of percentages, the validation limits (makes = target, logged 0), and a mix of empty and logged sets.

### 3. Schema (`src/db/schema.ts`)
- `exercises`: id, `seedKey` (unique, nullable), name, category, description, `mediaUrl` (nullable), `trackingType`, `isCustom`, `archivedAt`, `createdAt`, `updatedAt`.
- `routines`: id, name, position, `archivedAt`, `createdAt`, `updatedAt`.
- `workouts`: id, `routineId` → routines, name, position, `archivedAt`, `createdAt`, `updatedAt`.
- `workout_exercises`: id, `workoutId` → workouts (cascade), `exerciseId` → exercises, position, `targetMode` (nullable, null for check).
- `template_sets`: id, `workoutExerciseId` → workout_exercises (cascade), position, `targetValue` (nullable, null for check).
- `sessions`: id, `workoutId` → workouts (nullable, null for an empty workout), name (the workout name is copied at start), status, `startedAt`, `finishedAt` (nullable). Partial unique index on status for `in_progress`.
- `session_exercises`: id, `sessionId` → sessions (cascade), `exerciseId` → exercises, position, snapshot fields (name, category, `trackingType`, `targetMode`), note (default `''`).
- `session_sets`: id, `sessionExerciseId` → session_exercises (cascade), position, `targetValue` (nullable), `loggedValue` (nullable), `completed` (boolean, default false; used by check sets).
- Drizzle relations (the 0.x `relations()` API) for the relational queries (`db.query.…findFirst({ with })`).
- Indexes on the foreign keys used for listing (`workouts.routineId`, `session_exercises.sessionId`, `session_sets.sessionExerciseId`, …).
- `npm run db:generate` produces the initial migration `0000_…`.
- `src/db/test-utils.ts`: `createTestDb()` creates an in-memory `better-sqlite3` DB, turns `foreign_keys` on, applies the migrations from `src/db/migrations` through Drizzle's `better-sqlite3` migrator and returns a Drizzle `Db`. DB test files use the `node` Jest environment (`@jest-environment node` docblock) if the `jest-expo` environment gets in the way.
- Check: a test that the migrations apply to an empty DB, and one that inserting a second `in_progress` session directly (bypassing the data layer) fails on the partial unique index.

### 4. Connection and startup (`src/db/`)
- `client.ts`: `openDatabaseSync('basket-routine.db', { enableChangeListener: true })`, then the pragmas, then `drizzle(expoDb, { schema })`. Exports `db`.
- `types.ts`: the `Db` type (Drizzle's generic sync SQLite database with the schema). Every data access function takes a `Db`.
- `useDatabaseSetup()` hook: runs `useMigrations(db, migrations)` and then the seed, and returns `{ ready, error }`.
- `app/_layout.tsx`: calls `SplashScreen.preventAutoHideAsync()` (`expo-splash-screen` is already installed) and keeps the splash up until the DB is ready, so the APK doesn't show an empty screen while migrations run. If setup fails, it hides the splash and renders a plain error text instead of crashing.

### 5. Seed catalog (`src/db/seed/`)
- `exercises.ts`: a data array with `seedKey`, name, category, `trackingType` and a 1–3 sentence description for each exercise. `mediaUrl` stays null.
- `seed.ts`: `seedExercises(db)` upserts by `seedKey` inside a transaction, with `isCustom: false`, overwriting only `name`, `category` and `description` (see decisions).
- Check: the seed tests (step 7) pass.
- Initial list (38 exercises; names can be adjusted when the descriptions are written. The first draft of this list had 36 entries; **Bank Shots** (shooting) and **Hook Shots** (finishing) were added to reach 38):
  - **Shooting** (`makes_attempts`): Form Shooting, Free Throws, Spot-Up Jumpers, Catch-and-Shoot Threes, Corner Threes, Elbow Jumpers, Pull-Up Jumpers, Step-Back Jumpers, Bank Shots.
  - **Finishing** (`makes_attempts`): Mikan Drill, Reverse Mikan Drill, Right-Hand Layups, Left-Hand Layups, Reverse Layups, Euro Step Layups, Power Layups, Floaters, Hook Shots.
  - **Ball Handling** (`check`): Pound Dribbles, Figure 8, Ball Wraps, Spider Dribble, Two-Ball Dribbling, Tennis Ball Drill.
  - **Dribbling** (`check`): Crossover, Between the Legs, Behind the Back, In-and-Out, Hesitation, Cone Zig-Zag, Full-Court Speed Dribble.
  - **Footwork** (`check`): Jump Stops, Pivot Series, Jab Step Series, Drop Step, Triple Threat Series, Defensive Slides, Agility Ladder.

### 6. Data access (`src/db/repositories/`)
Each function takes a `Db`. Multi-row writes run in a transaction. Invalid input throws a `DomainError` (see decisions), never a raw SQLite error. Each file gets its `*.test.ts` written alongside it, against `createTestDb()`; the coverage list is in step 7.

- `exercises.ts`
  - `listExercises(db, { category?, search? })`: active only, ordered by name, search is case-insensitive on name.
  - `getExercise(db, id)`.
  - `createCustomExercise(db, input)`.
  - `updateCustomExercise(db, id, input)`.
  - `archiveCustomExercise(db, id)`.
  - Predefined exercises are read-only: update and archive reject them.
- `routines.ts`
  - `listRoutines(db)`: active, by position.
  - `createRoutine(db, name)`: appended at the end.
  - `renameRoutine(db, id, name)`.
  - `archiveRoutine(db, id)`: also archives the routine's workouts, in one transaction.
- `workouts.ts`
  - `listWorkouts(db, routineId)`.
  - `createWorkout(db, routineId, name)`.
  - `renameWorkout(db, id, name)`.
  - `archiveWorkout(db, id)`.
  - `getWorkoutWithExercises(db, id)`: exercises and template sets, ordered.
  - `addWorkoutExercise(db, workoutId, exerciseId, { targetMode, targetValues })`: `targetValues: (number | null)[]`, one entry per template set, so its length is the set count (all `null` for `check`, all integers ≥ 1 for `makes_attempts`; validated against the exercise's `trackingType`). Only as much as tests and Phase 3 need to build templates. Full template editing is Phase 6.
- `sessions.ts` (complete for Phase 3)
  - `getInProgressSession(db)`.
  - `startEmptySession(db, name)`.
  - `startSessionFromWorkout(db, workoutId)`: snapshots the workout name, exercises (name, category, trackingType, targetMode) and sets (targetValue, empty logged value, not completed). Never writes to the template.
  - Both start functions reject a second `in_progress` session.
  - Every function that edits a session's contents (add/remove/reorder exercises, notes, sets) rejects a session that isn't `in_progress`. Editing finished sessions is Phase 4, with its own functions.
  - `getSessionDetail(db, id)`: exercises and sets, ordered.
  - `addSessionExercise(db, sessionId, exerciseId, targetMode?)`: validates the trackingType/targetMode combination.
  - `removeSessionExercise`.
  - `reorderSessionExercises(db, sessionId, orderedIds)`: rejects a list that isn't exactly the session's exercise ids (none missing, extra or repeated).
  - `updateSessionExerciseNote`.
  - `addSessionSet(db, sessionExerciseId, targetValue?)`.
  - `deleteSessionSet`.
  - `updateSessionSet(db, setId, { targetValue?, loggedValue?, completed? })`: validates the resulting set with `src/domain/validation.ts` before writing.
  - `finishSession(db, id)`: sets status and `finishedAt`, and returns the summary from `src/domain/summary.ts`.
  - `discardSession(db, id)`: hard-deletes an `in_progress` session.
  - `listFinishedSessions(db)`: newest first.

### 7. Tests
The tests are written alongside steps 2, 3, 5 and 6 (with `createTestDb()` from step 3); this step is the coverage they must reach, checked before moving on to step 8.
- Test files live next to the code (`*.test.ts`). The `__tests__/` folder keeps the screen smoke test.
- Coverage:
  - Migrations apply to an empty DB, and the partial unique index rejects a second `in_progress` session inserted directly.
  - The seed is idempotent: running it twice gives the same count, and it updates a changed description without touching custom exercises.
  - Exercises: predefined ones are read-only; an archived custom exercise disappears from lists, but a session that used it still shows its name.
  - Routines: archiving a routine hides its workouts.
  - Sessions:
    - Starting from a workout copies the structure, and later edits to the session or template don't leak into each other.
    - A second `in_progress` session is rejected.
    - Content edits on a finished session are rejected.
    - `reorderSessionExercises` rejects an incomplete or foreign id list.
    - `updateSessionSet` rejects makes > attempts in both modes.
    - Finishing returns the correct summary for a mixed session: Σmakes / Σattempts over the logged `makes_attempts` sets (empty sets excluded), and `{ completed, total }` for `check` exercises.
    - Discarding removes the session and its sets (cascade).

### 8. Temporary DB check on the placeholder screen
- `app/index.tsx` shows "Catalog: N exercises", "Routines: M" and an "Add test routine" button that creates `Test routine M+1`. This is a throwaway debug UI, replaced by the real shell in Phase 2.
- The smoke test replaces `@/db/client` with a real test DB, because `expo-sqlite` can't run in Jest: a `jest.mock('@/db/client', …)` factory that builds `createTestDb()` and runs the seed. It keeps asserting "Basket Routine" and also asserts "Catalog: 38 exercises". (The setup hook lives in `_layout`, which the test doesn't render.)
- Check on the phone (Expo Go): the catalog count is 38; add two routines, kill the app from recents, reopen it, and the routine count is still 2.

### 9. CI
- Add a "schema and migrations in sync" step to `.github/workflows/ci.yml`: run `npm run db:generate`, then fail if `git status --porcelain src/db/migrations` is not empty. This catches a schema change committed without its migration.
- Run the full CI command list locally before committing.

### 10. Docs and phase commit
- Update `CLAUDE.md` (project state, `src/db` / `src/domain` layout, new scripts, migration policy) and `README.md` (the `db:generate` command).
- Tick the checklist below. One commit: "Phase 1: data layer and seed catalog". Push, and confirm CI is green.

## Final checklist

- [x] `npm run lint`, `format:check`, `typecheck`, `test` and `npx expo-doctor` pass locally.
- [x] Domain tests cover FG%, aggregate summaries and validation edge cases.
- [x] Data layer tests run against the real migrations and cover soft delete, snapshots, the single in-progress session rule and validation on write.
- [x] The CI migration-sync step is added (the same commands pass locally).
- [ ] CI is green on `main`.
- [x] On the phone (Expo Go): the catalog shows 38 exercises, and test routines survive killing and reopening the app.
