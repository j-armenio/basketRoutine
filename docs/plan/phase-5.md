# Phase 5 — History (detailed plan)

Detailed plan for Phase 5 of [PLAN.md](PLAN.md).

**Goal:** past workouts become browsable. The History tab lists every finished session, newest first (name, date, duration, overall FG%). Tapping one opens its detail: a summary of the workout and every exercise that was done, with its sets, FG% and note, **as they were when the workout was finished**. The history is read-only: a past session isn't edited (decided before this phase started). It can only be deleted. The data layer already stores everything a session needs (the Phase 1 snapshots), and `getSessionDetail` and `summarizeSession` already build the summary screen. This phase adds the list query, the delete and the screens, plus one repository rule: a session with no exercise can't be finished.

**Done when:** on the phone (Expo Go), finished sessions (including the ones started from templates) are listed with the right date, duration and FG%, their detail matches what was logged, and a session can be deleted. `lint`, `format:check`, `typecheck`, `test` and `expo-doctor` pass, `db:generate` leaves the migrations unchanged, and CI is green on the phase commit. Part B (an APK installed **over** build 4, keeping its data) is tracked separately, so an EAS problem can't hold up the phase.

## Decisions for this phase

| Topic | Decision |
|---|---|
| Read-only history | A finished session is never changed: no rename, no value fixes, no added or removed sets or exercises. What the detail shows is exactly what was stored at Finish. The repositories already refuse writes to a session that isn't in progress (`session_not_in_progress`), so nothing needs to change there. The only write this phase adds is the delete. |
| History tab layout | Hevy-like. The "N workouts logged" subtitle stays. The list is a `SectionList` (`Screen` with `scroll={false}`, like the picker), grouped by **month** of the start date ("September 2026"), newest first. Each row is a card-like pressable: the session name, `formatWorkoutDate · duration` below it, a one-line exercise list (`formatExerciseList`, Phase 4), and on the right the session's result: the overall FG% (`formatFgPct`) when a shooting set was logged (`shooting.attempts > 0`), and below it `x / y done` when the session has check drills (`check.total > 0`). A mixed session shows both, and a session with neither shows `—` (only a safety net: Finish needs a logged set). Accessibility label "<name>, <date>", since names repeat ("Morning Workout"). With no finished session, the existing "No workouts yet" empty state stays. No search or filters. |
| Routes | One new route on the root `Stack`, above the tabs, like the other screens: `app/session/[id].tsx` (the detail). A History-only `Stack` would keep the tab bar visible, but it adds a layout for no real gain. The post-Finish summary (`workout-summary/[id]`) stays as it is and is still reached only from Finish. |
| Session detail | `Screen` titled with the session name, subtitle `date · duration`, a back `IconButton` on the left and a delete `IconButton` ("Delete workout") on the right. Content: first the **summary**, the totals block (shooting makes / attempts / FG%, check completed / total), extracted from the summary screen into `SessionTotals` so both screens show the same thing. Then one **read-only** card per exercise, in the session's order: name, mode subtitle (`modeSubtitle`), the same table header (`SetTableHeader`), the rows as text (`Set │ target │ logged │ FG%`; check rows show ✓ or `—`), the exercise total, and the note when it isn't empty. Only finished sessions: an in-progress or unknown id shows "Workout not found" with a way back. |
| Empty sets in the detail | Shown as they were stored, with `—` in the logged and FG% columns, so the detail is a faithful record of the workout. They're still left out of every total (Phase 1 rule, and the Phase 3 feedback kept them in the DB). |
| Deleting a past session | A **hard** delete (`deleteFinishedSession`: its exercises and sets cascade), after a confirmation: "Delete workout?" / "<name> from <date> will be removed from your history. This can't be undone.", Cancel / Delete (destructive). Archiving exists so that deleting a routine, workout or exercise never damages history. Deleting a session *is* removing history, so there's nothing left to protect, and `sessions` has no `archivedAt` (no migration needed). The template it came from is untouched. The detail renders nothing once its session is gone while mounted (the same pattern as the active workout's `mountedWithSession`), so the "not found" state doesn't flash on the way out. |
| Keeping screens in sync | Unchanged: the delete goes through `history/actions.ts` → `run` → one version bump. One exception, for cost: the History list reads **every** finished session with its sets, and the tab stays mounted once visited. Re-reading on every bump would redo that query on every keystroke of the active workout. The list hook therefore follows the data version **only while the tab is focused** (`useIsFocused` from `expo-router`) and catches up when the tab is focused again. The mechanism is a small hook next to `useDataVersion`: `useDataVersionWhile(active)` in `dataStore.ts` (it takes a boolean, so the store doesn't import navigation). It subscribes only while `active`, so an unfocused tab doesn't even re-render on a bump. It returns the last version seen while active, kept with React's "adjust state during render" pattern (`useState` plus a conditional `setState` in render). There's no ref read during render and no effect, so the compiler rules of `eslint-plugin-react-hooks` 7 (`refs`, `set-state-in-effect`) accept it. The detail reads one session, so it keeps the plain version. |
| Finishing an empty session | Not allowed. The active workout already blocks it (Phase 3: with nothing logged, Finish offers "Nothing logged yet" / Discard, and a session with no exercise has nothing logged), but the repository still accepts it. `finishSession` now refuses a session with no exercise with `empty_workout` ("Add at least one exercise."), so the history can't hold one. The stricter "nothing logged" rule stays in the UI only. Build 4 already had the UI guard, so the phone holds no such session. |
| FG% and summaries | Unchanged rules (Phase 1): derived with `summarizeSession` / `summarizeExercise` from the stored sets, never stored, Σmakes / Σattempts, empty sets left out. The list computes them in JS from the loaded sets. There's no SQL aggregate, so the rules live in one place. |
| Data model | No schema change: `sessions`, `session_exercises` and `session_sets` already have everything. **No migration.** `db:generate` must leave `src/db/migrations` unchanged. |

## Out of scope (belongs to later phases)

- Editing a past session in any way (name, duration, values, sets, exercises, notes). Also logging a past workout from scratch, "Start again" or "Save as template" from a past session.
- Search, filters, stats or charts over the history → backlog ("FG% progress charts").
- The "Previous" column in the active workout → backlog.
- FG% coloring in the list and the detail → Phase 7 (with the rest of the coloring).
- Custom exercises and catalog browsing → Phase 6.
- A performance check on a long history (hundreds of sessions) → Phase 7's performance check.

## Tools

Nothing new to install. `SectionList` and `Alert` come from React Native. `useIsFocused` is imported from `expo-router` (checked: expo-router 57 re-exports it, and the copy under `expo-router/react-navigation` is marked deprecated in favor of that one).

## Steps

### 1. Domain helpers (`src/domain/`)
- `format.ts`: `formatMonth(date)` → `'September 2026'` (English, like `formatWorkoutDate`), with its unit test. Test dates are built with the local-time constructor (`new Date(2026, 8, 24)`, like `format.test.ts`), since CI runs in UTC and the dev machine doesn't.

### 2. Data layer (`src/db/repositories/sessions.ts`)
- `listFinishedSessionsWithExercises(db)`: a relational query (`.sync()`) of the finished sessions, newest `startedAt` first (then id), each with its ordered exercises (name, trackingType, targetMode) and their ordered sets (targetValue, loggedValue, completed). It replaces `listFinishedSessions`, which only `useFinishedSessionCount` uses. That hook goes away too: the tab's count comes from the list. The order changes on purpose, from `finishedAt` to `startedAt`, to match the month grouping. The tests that used `listFinishedSessions` (`sessions.test.ts`, "finishSession returns the summary of a mixed session" and "a finished session frees the in-progress slot") move to the new function.
- `deleteFinishedSession(db, id)`: an unknown id → `not_found`, an in-progress session → `session_not_finished` (the in-progress one is discarded from the active workout), otherwise it deletes the session (its exercises and sets cascade).
- `finishSession`: a session with no exercise → `empty_workout` (see the decisions), checked in the same transaction, before the status changes.
- Tests (`sessions.test.ts`):
  - the list holds only finished sessions, newest first, with exercises and sets in order;
  - delete removes the session, its exercises and its sets, leaves the template and other sessions alone, and refuses an in-progress or unknown session;
  - `finishSession` refuses a session with no exercise (never had one, or all removed), and the session stays in progress;
  - the read-only rule is already guarded by "content edits on a finished session are rejected" (every edit → `session_not_in_progress`); it stays as it is.
- Existing tests that finish a session with no exercise get one before Finish: "a finished session frees the in-progress slot", "an empty session finishes with an empty summary" (becomes the refusal test above), and the `Quick` session in the `overwriteWorkoutFromSession` `not_found` test. "a session left with no exercise cannot overwrite the template" can no longer build its session through `finishSession`: it sets the status directly, since the `empty_workout` check in `overwriteWorkoutFromSession` stays as a safety net.
- Check: `npm run db:generate` leaves `src/db/migrations` unchanged.

### 3. History feature (`src/features/history/`)
- `dataStore.ts`: `useDataVersionWhile(active)`, as in the decisions. Tests (`dataStore.test.ts`, `renderHook`): a bump while inactive neither changes the value nor re-renders; becoming active catches up to the current version; while active it follows every bump. Run `npm run lint` on it before building the list on top.
- `historyList.ts` (+ tests): `toHistoryItem(session)` → `{ id, name, startedAt, durationMs, exerciseNames, summary }`, `sessionResult(summary)` → `{ fgPct: string | null, checks: string | null }` (the right side of the row, as in the decisions: shooting only, check only, mixed, neither), and `groupByMonth(items)` → `{ title, data }[]` in list order. Items from the same month stay together, and the same month in two different years makes two sections.
- `hooks.ts`: `useHistory()` (the items, through `useDataVersionWhile(useIsFocused())`) and `useFinishedSession(id)` (`getSessionDetail`, `undefined` unless finished).
- `actions.ts`: `deleteSession(id)`, through `run`. Tests against `createTestDb()`: one notification on success, and a `DomainError` comes back as a reason and doesn't notify.

### 4. Components (`src/features/history/`)
- `SessionTotals.tsx`: the shooting and check cards, moved from `app/workout-summary/[id].tsx`, which now uses it (its flow tests keep passing).
- `SessionExerciseView.tsx` (+ test): the detail's read-only exercise card (header, `SetTableHeader`, text rows, exercise total, note when not empty). Tests: a shooting drill in each mode shows target, logged and FG% per set, and `—` for an empty set. A check drill shows ✓ and `—`. An empty note isn't shown. No input or pressable is rendered.
- `HistoryRow.tsx`: the list row, as in the decisions.

### 5. History tab (`app/(tabs)/history.tsx`)
- `useHistory()`, subtitle "N workouts logged", and the empty state with 0. Otherwise the `SectionList` (month headers, `HistoryRow`s). A row → `/session/<id>`.

### 6. Session detail (`app/session/[id].tsx`)
- Registered on the root `Stack`. As in the decisions: the header, `SessionTotals`, one `SessionExerciseView` per exercise.
- Delete → confirmation → `deleteSession` → back (`leaveScreen`). A failure shows an `Alert` with `reasonMessage`.
- "Workout not found" for an unknown or in-progress id. Nothing is rendered once the session disappears while mounted.

### 7. Flow tests (`__tests__/history.test.tsx`)
Same setup as `routines.test.tsx`. Finished sessions are built through the repositories, with fixed `startedAt` / `finishedAt` in two different months, so dates and durations are exact. The dates use the local-time constructor and fall mid-month, so a time zone can't move a session into another month. `afterEach` deletes sessions, workouts and routines, and notifies. The DB is asserted directly. Separate tests for:
- No finished session → the empty state. With sessions → month headers, newest first, and each row with name, date, duration and result (a shooting session shows its FG%, a check-only session `x / y done`, a mixed session both). The subtitle reads "N workouts logged". An in-progress session isn't listed.
- A row → the detail shows the totals, each set's values and FG% (an empty set as `—`), and the notes, with no editable field. Back → `/history`.
- Delete → confirmation → back on `/history`, the row is gone, the session's rows are gone from the DB, and the template is unchanged. Cancel on the confirmation changes nothing.
- A session finished from the active workout (the full Phase 3 flow) shows up in the list with the values it was finished with.
- With the History tab mounted, finishing a workout → the list shows it when the tab is opened again (the focus gate catches up). A spy on `listFinishedSessionsWithExercises` shows no call when a data write happens while another tab is focused.
- `active-workout.test.tsx`, `routines.test.tsx` and `shell.test.tsx` still pass.

### 8. Check on the phone (Expo Go)
- Log three or four sessions: empty ones and ones from templates, both shooting modes and check drills, one with notes and one with an empty set. The list shows them in the right order and month, with the right date, duration and FG%, and scrolls smoothly.
- The detail matches what was logged, set by set, including empty sets (`—`) and notes. Nothing in it can be edited.
- Delete one session: it's gone from the list, and its template (if any) still starts as before.
- Feedback from this check is written at the end of this file ("Results"), and changes are made before the commit, as in Phases 3 and 4.

### 9. CI and phase commit
- Run the full CI list locally (`lint`, `format:check`, `typecheck`, `test`, `db:generate` + clean `git status` on `src/db/migrations`, `npx expo-doctor`).
- Update `CLAUDE.md`: project state (the `session/[id]` route, `src/features/history/`, `useDataVersionWhile`, "the history is read-only: a finished session is never edited, only deleted (hard delete)", "a session with no exercise can't be finished") and current status (Phase 5 done, next: write `phase-6.md`).
- One commit: "Phase 5: history", which also carries the `PLAN.md` change made while planning (Phase 5 is read-only history). Push and confirm CI is green. Tick the checklist.

### 10. APK over build 4 (Part B)
Templates (Phase 4) and history are now worth having on the court. Neither phase changed the schema, so this is the cheapest moment to close the item still open from Phase 0.
- Run the "Build APK" workflow on the phase commit (`preview`, build 5).
- Install it **over** build 4, without uninstalling. Check that it installs, that the Phase 3 court session shows up in History with its values, and that a routine can be built and started.
- If Android refuses the update (signature mismatch), stop there and don't uninstall (that wipes the data). Write down the error and decide the next step first.
- Write the outcome in "Results", and mark the Phase 0 item in `CLAUDE.md` as confirmed (or not). This lands after the phase commit, in its own small commit ("Mark the APK install over build 4 as done"), like Phase 3's Part B.

## Final checklist

### Part A — code

- [x] `npm run lint`, `format:check`, `typecheck`, `test` and `npx expo-doctor` pass locally, and `db:generate` leaves the migrations unchanged.
- [x] `formatMonth`, `historyList` (including `sessionResult`) and `useDataVersionWhile` have unit tests.
- [x] Repository tests cover the list, `deleteFinishedSession`, `finishSession` refusing a session with no exercise, and a finished session refusing edits.
- [x] Flow tests cover the list, the detail, delete (confirmed and cancelled) and the focus gate, asserting the DB.
- [x] On the phone (Expo Go): past sessions are browsable, their detail matches what was logged, and one can be deleted.
- [x] CI is green on `main`.

### Part B — APK

- [ ] Build 5 installs over build 4 without uninstalling, and the data logged with build 4 is in History.

## Results

- Part A: the on-phone check (step 8) passed with no changes asked. All CI checks pass locally (344 tests, no migration).
