# Phase 4 — Routines & Workout Templates (detailed plan)

Detailed plan for Phase 4 of [PLAN.md](PLAN.md).

**Goal:** the app's main flow. On the Workout tab the user creates routines (folders), builds workout templates inside them (exercises from the catalog, target mode, sets with target values), and starts a session from a template with one tap. The template never changes during or after a session, unless the user agrees, at Finish, to update it with the session's structure. The data layer from Phase 1 already has the tables and most of the repository functions (`createRoutine`, `createWorkout`, `addWorkoutExercise`, `getWorkoutWithExercises`, `startSessionFromWorkout`). This phase adds the missing writes (reorder, save a whole template, overwrite from a session) and the screens.

**Done when:** on the phone (Expo Go), a routine with at least two workouts can be built, edited and started without touching code. A session started from a template leaves the template unchanged unless "Update template" is chosen at Finish. `lint`, `format:check`, `typecheck`, `test` and `expo-doctor` pass, `db:generate` leaves the migrations unchanged, and CI is green on the phase commit. No APK is built this phase.

## Decisions for this phase

| Topic | Decision |
|---|---|
| Workout tab layout | Hevy-like. The Quick Start card stays on top. Below it, a "Routines" heading with a "New Routine" button. Each routine is a **section** on the tab: its name, a ⋮ menu (Rename, Move up, Move down, Delete), its workout cards, and a "New Workout" ghost button at the end. A workout card shows the name and a one-line list of its exercises ("Free Throws, Mikan Drill +2 more"), a **"Start" button** (primary) and a ⋮ menu (Edit, Move up, Move down, Delete). Tapping the card body opens the editor. Sections don't collapse (polish, if ever needed). With no routines, the existing empty state gets a "New Routine" action. |
| Routes | Two changes on the root `Stack`, above the tabs. A new `app/edit-workout.tsx` is the template editor: `?routineId=<id>` creates a workout in that routine, `?workoutId=<id>` edits one. The existing `app/add-exercise.tsx` picker gains a `?to=template` param. Without the param it still adds to the in-progress session, exactly as in Phase 3. With it, it adds to the open template draft. |
| Creating and renaming routines | A small `NameDialog` component (RN `Modal` with a `TextField`, Cancel / Save, Save disabled while the name is blank), since Android has no `Alert.prompt`. It's used for "New Routine" and "Rename". Workouts are named in the editor. |
| Template editor: draft + Save | Edits live **in memory** until "Save", like Hevy and like the flow the developer described. "Cancel" (the close button) drops them. The draft is a plain object in a module store (`src/features/routines/draftStore.ts`, same `useSyncExternalStore` pattern as the session store), so the picker, a separate route, can add to it. It's opened synchronously on the editor's first render (a `useState` initializer: empty, or loaded from `getWorkoutWithExercises`), so the editor never renders without a draft, and cleared on Save, Cancel or unmount. `updateDraft` does nothing when no draft is open: a set row that unmounts after the draft was closed still runs its rollback, and that must be a no-op. **Save with no changes** (`!isDirty`) just closes the draft and goes back, with no write; the Save button is always enabled. **Leaving with unsaved changes** (the close button or the Android back button) asks "Discard changes?", through `usePreventRemove` from `expo-router/react-navigation` (the React Navigation v7 bundled in expo-router; `@react-navigation/native` isn't installed). Its value comes from the last render, so after a successful Save the guard would still block the editor's own `router.back()`. The callback therefore checks a `leaving` ref, set by Save before it navigates, and then just runs `navigation.dispatch(data.action)`. "Discard" leaves the same way. A killed app loses an unsaved draft. That's accepted: it's a short edit at home, not a court session. |
| What Save writes | One repository call, `saveWorkout`, in **one transaction**: it creates the workout (or renames it), then **replaces** its exercises and template sets (deletes the `workout_exercises` rows, whose `template_sets` cascade, and inserts the draft's). Nothing refers to those rows (sessions point to `workouts.id` and keep their own snapshot), so replacing them is safe for history. A failed validation rolls everything back, and a new workout is never left half-created. Rules: name not blank (`empty_name`), at least one exercise (new reason `empty_workout`), each exercise active with a valid mode, at least one set, every shooting target an integer ≥ 1. When editing, the input's `routineId` is ignored (moving a workout is out of scope). **Save writes what the draft holds.** Only valid keystrokes ever reach the draft, so it's always valid. A focused cell isn't rolled back first: the blur comes from `keyboardDidHide`, which is asynchronous, so unlike Finish (where an `Alert` waits for the user) nothing runs before the write. Accepted edge case: a target changed to a valid prefix and then cleared (10 → "5" → "" → Save) is saved as 5, not rolled back to 10. |
| Editing inside the editor | The same building blocks as the active workout, with no logged column. A `TemplateExerciseCard` has the name, the mode subtitle and a ⋮ menu (Move up, Move down, Remove exercise, which asks for confirmation as in the active workout). Its table is `SET │ ATTEMPTS` or `SET │ MAKES` for shooting drills, and just `SET` for check drills. "Add Set" copies the last target. A set row is deleted by swiping left (`SwipeToDelete`), and the last set can't be deleted. A new exercise comes with one set at `DEFAULT_TARGET_VALUE[mode]`. Target mode is chosen in the picker, as in Phase 3, and can't be changed afterward. |
| Target cells | Same draft rule as the set rows. `useNumberCell` is generalized to take a `save(value)` callback instead of calling `updateSet` directly. **Both** writes go through it: the keystroke save and the rollback on blur or unmount. Its `set` becomes `{ targetValue, loggedValue }`, with no `id` (template sets have a `key`). `ShootingSetRow` passes one `save` per field (`(v) => updateSet(set.id, { [field]: v })`), and the template row passes a draft update. `evaluateDraft` already works for a template (logged value `null`, so only the target ≥ 1 is checked). Invalid → rolled back on blur, red border, reason under the row. |
| Starting from a template | "Start" on a workout card → `startSessionFromWorkout` → `/active-workout`. The session takes the workout's name. If a session is already in progress, an `Alert` asks "Workout in progress", with Cancel, "Resume" (opens it) and "Discard and start" (destructive: discards the current one, then starts the template). Both happen in one repository call, `discardAndStartFromWorkout`, in one transaction, so a failed start never leaves the current session deleted, and the store is notified once. |
| Update template at Finish | After a successful Finish from a session with a `workoutId` whose workout is still active, the app compares the session's structure with the template's. The structure is the ordered exercises, each with `exerciseId`, `targetMode` and its sets' target values. Logged values, ✓ and notes are ignored. If they differ, the app **first navigates to the summary** (so it shows behind the dialog), then asks "Update "<name>"?" ("Save this workout's exercises and sets to the template. Logged values and notes aren't copied."), with "Keep template" / "Update template". Update calls `overwriteWorkoutFromSession`, which runs the same replace as Save. If nothing differs, or the workout was deleted meanwhile, nothing is asked. Empty sets are copied too, since they're part of the structure. Whether to ask comes from one action, `templateUpdateCandidate(sessionId)` (the workout if it's active and its structure differs, else nothing). After Finish the screen has no in-progress session left, so the action reads by the captured id, and it's tested without UI. If the template was edited while the session was in progress, "Update template" overwrites those edits with the session's structure. That's accepted, and the `Alert` stays the same. |
| Deleting | Always soft (archive), always with confirmation. Routine: "Delete "<name>"? Its N workouts will be deleted too. Your history stays." (`archiveRoutine` already archives its workouts). Workout: "Delete "<name>"? Your history stays." A session started from a workout that gets deleted keeps going normally: it's a snapshot, and Finish just won't offer the update. |
| Reordering | Move up / Move down in the ⋮ menus, with `moveItem` (Phase 3), for routines, for workouts inside a routine, and for exercises in the editor. Drag & drop stays backlog. Moving a workout to another routine is out of scope. |
| Keeping screens in sync | The version counter in `src/features/workout/sessionStore.ts` becomes the app's single data store: moved to `src/features/dataStore.ts` (`notifyDataChanged`, `useDataVersion`), with the `run` helper and `ActionResult` next to it. Routine and template writes bump the same version as session writes, so the Workout tab, the banner and the editor stay in sync with no focus listeners. One counter is enough at this size (every read is a sub-millisecond sync query). The draft store is separate (in-memory only). |
| Data model | No schema change: `routines`, `workouts`, `workout_exercises` and `template_sets` already have everything, positions included. **No migration.** `db:generate` must leave `src/db/migrations` unchanged. |

## Out of scope (belongs to later phases)

- History list, session detail, renaming or editing finished sessions → Phase 5. The summary route stays reachable only from Finish.
- Custom exercises and catalog browsing → Phase 6. The picker keeps listing only active catalog exercises. (Overwriting a template from a session whose exercise was archived meanwhile fails with `exercise_archived`. That can't happen before Phase 6, which handles it.)
- Moving a workout between routines, duplicating a workout or routine, collapsible routine sections, per-exercise notes in templates.
- Drag & drop, a diff-based "update template" (only a full overwrite now), timers, the "Previous" column → backlog.
- A new APK. The Phase 0 item "an APK installs over an earlier one without uninstalling" stays pending until the next build.

## Tools

Nothing new to install. `Modal`, `Alert`, `Keyboard` and `useSyncExternalStore` come from React Native and React. `usePreventRemove` is imported from `expo-router/react-navigation` (checked: expo-router 57 bundles React Navigation v7 and exports it there; `@react-navigation/native` isn't in `node_modules`, so importing from it would fail).

## Steps

### 1. Domain helpers (`src/domain/`)
Each with its unit tests next to it.
- `template.ts`:
  - `TemplateStructure` (ordered `{ exerciseId, targetMode, targetValues }[]`).
  - `structureFromTemplate(workoutDetail)` and `structureFromSession(sessionDetail)`.
  - `sameStructure(a, b)`. Tests: identical → true. Changed target, added or removed set, removed, added or reordered exercise, changed mode → false. Different logged values, ✓ or notes → still true.
- `format.ts`: `formatExerciseList(names, max = 3)` → `'Free Throws, Mikan Drill, Layups'`, `'… +2 more'`, `'No exercises'`.
- `errors.ts` / `messages.ts`: new reasons `empty_workout` ("Add at least one exercise.") and `session_not_finished` ("This workout isn't finished yet."). `invalid_exercise_order` becomes `invalid_order` ("The order is out of date."), since routines and workouts use it too.

### 2. Data layer (`src/db/repositories/`)
- `common.ts`: `assertSameIds(currentIds, orderedIds)` (throws `invalid_order`), used by `reorderSessionExercises` and the new reorders. For routines and workouts, `currentIds` are the **active** ids only: archived rows stay out and keep their old position.
- `routines.ts`: `reorderRoutines(db, orderedIds)`, and `listRoutinesWithWorkouts(db)`: a relational query with active routines and their active workouts (a `where` on the nested `many` relation), both ordered, each with its ordered exercises (catalog name only), `.sync()`.
- `workouts.ts`:
  - `reorderWorkouts(db, routineId, orderedIds)`.
  - Extract the body of `addWorkoutExercise` into an internal `insertWorkoutExercise(tx, …)` with no transaction of its own. `addWorkoutExercise` keeps its signature.
  - `replaceWorkoutExercises(tx, workoutId, items)`: delete + insert through `insertWorkoutExercise`. At least one item (`empty_workout`).
  - `saveWorkout(db, { workoutId?, routineId, name, exercises })`: one transaction, create or rename, then replace. `routineId` is ignored when `workoutId` is given. Returns the workout.
- `sessions.ts`:
  - `discardAndStartFromWorkout(db, workoutId)`: one transaction, deletes the in-progress session, then runs the same start as `startSessionFromWorkout`.
  - `overwriteWorkoutFromSession(db, sessionId)`. An unknown session or one with no `workoutId` → `not_found`, one still in progress → `session_not_finished`, and its workout must be active. It builds the items from the session detail and calls `replaceWorkoutExercises`. It doesn't touch the name.
- Tests (`routines.test.ts`, `workouts.test.ts`, `sessions.test.ts`):
  - reorders (valid; missing, extra or repeated ids → `invalid_order`, nothing moved);
  - archived routines and workouts are left out of the list;
  - `saveWorkout` creates a workout with its exercises. Saving again replaces them (the old template sets are gone) and renames it;
  - an invalid exercise rolls everything back (no new workout row). `empty_name`, `empty_workout`;
  - **the template never changes on its own:** start from a template, add a set, change a target, remove an exercise, finish → `getWorkoutWithExercises` is unchanged;
  - `overwriteWorkoutFromSession` copies exercises, modes and targets but not logged values or notes, and refuses an in-progress session, a session with no template and an archived workout;
  - `discardAndStartFromWorkout` replaces the in-progress session. When the start fails (archived workout), the current session is still there;
  - existing sessions still point to the workout after an overwrite.
- Check: `npm run db:generate` leaves `src/db/migrations` unchanged.

### 3. Shared store and actions (`src/features/`)
- Move `workout/sessionStore.ts` → `dataStore.ts` (`notifyDataChanged`, `useDataVersion`, `subscribe`), plus `run` and `ActionResult` from `workout/actions.ts`. Update the imports and the existing tests (`sessionStore.test.ts` → `dataStore.test.ts`, `__tests__/active-workout.test.tsx`).
- `workout/actions.ts`: add `startWorkoutFromTemplate(workoutId)`, `discardAndStartFromTemplate(workoutId)`, `updateTemplateFromSession(sessionId)`, and the read `templateUpdateCandidate(sessionId)` (the active workout whose structure differs from the session's, else `undefined`; it doesn't notify).
- `routines/actions.ts`: `createRoutine`, `renameRoutine`, `deleteRoutine`, `moveRoutine`, `moveWorkout`, `deleteWorkout`, `saveWorkout`. Same `run` wrapper.
- `routines/hooks.ts`: `useRoutines()` (`listRoutinesWithWorkouts`), `useWorkoutTemplate(id)`, keyed by the version as in `workout/hooks.ts`.
- Tests: the actions against `createTestDb()` notify once per successful write. A `DomainError` comes back as a reason. `templateUpdateCandidate`: no workout, archived workout, same structure → `undefined`; changed structure → the workout.

### 4. Template draft (`src/features/routines/`)
- `templateDraft.ts`: pure functions over `TemplateDraft` (`{ workoutId?, routineId, name, exercises: { key, exerciseId, name, trackingType, targetMode, sets: { key, targetValue }[] }[] }`): `emptyDraft`, `draftFromWorkout`, `rename`, `addExercise` (one default set), `removeExercise`, `moveExercise`, `addSet` (copies the last target), `deleteSet` (refuses the last one), `setTarget`, `toSaveInput`, `isDirty(initial, current)` (trimmed name + `sameStructure`, so " Push" vs "Push" isn't a change). Keys come from a local counter. Unit tests for each.
- `draftStore.ts`: `openDraft`, `updateDraft(fn)`, `closeDraft`, `useDraft()`. `updateDraft` with no open draft does nothing (tested).

### 5. Components
- `src/components/NameDialog.tsx` (+ test): `visible`, `title`, `initialName`, `confirmLabel`, `onConfirm(name)`, `onClose`. Autofocused `TextField`; Save disabled while blank; the backdrop and the back button close it.
- `src/features/workout/useNumberCell.ts`: take `save(value) → { ok } | { ok: false, reason }` in place of both `updateSet` calls (keystroke and rollback). `set` is `{ targetValue, loggedValue }`, with no `id`. `ShootingSetRow` passes one `save` per field. Its tests keep passing unchanged.
- Extract `ShootingHeader` / `CheckHeader` / `HeaderLabel` and the mode subtitle from `ExerciseCard` into `src/features/workout/SetTableHeader.tsx`, with an option to hide the logged and FG% columns. Both cards use it.
- `src/features/routines/TemplateSetRow.tsx`: set number + `NumberInput` target (large, since it's the only input) for shooting drills, or just the number for check drills, inside `SwipeToDelete` (`deletable` false for the only set). Tests: a valid target updates the draft on the keystroke, an invalid one rolls back on blur with the reason, unmounting with an invalid draft after the draft was closed throws nothing, and the "delete" accessibility action removes the set.
- `src/features/routines/TemplateExerciseCard.tsx`: as in the decisions.
- `src/features/routines/RoutineSection.tsx` and `WorkoutCard.tsx`: as in the decisions (accessibility labels "<routine> menu", "Start <workout>", "<workout> menu").

### 6. Template editor (`app/edit-workout.tsx`)
- First, a spike: a minimal flow test shows that `usePreventRemove` blocks both the close button and `router.back()` under `renderRouter` (native stack in Jest). If `router.back()` can't be blocked there, decide right away: test only the close button, and check the back button on the phone.
- Registered on the root `Stack` in `app/_layout.tsx`.
- The draft is opened in a `useState` initializer on the first render, not in an effect.
- `Screen` titled "New Workout" / "Edit Workout", `left`: close `IconButton` ("Cancel"), `right`: "Save" button, `bottomInset`, `keyboardAvoiding`.
- Content: a "Workout name" `TextField`, the exercise cards, an empty state ("Add your first exercise"), and "Add Exercise" (`secondary`) → `/add-exercise?to=template`.
- Save: no changes → set the `leaving` ref, close the draft and go back, with no write. Otherwise `saveWorkout(toSaveInput(draft))`. On ok → set the `leaving` ref, close the draft and go back. On a reason → `Alert` with `reasonMessage`.
- Unsaved-changes guard as in the decisions (`usePreventRemove` from `expo-router/react-navigation`; the callback dispatches `data.action` when `leaving` is set, and "Discard" does the same). A stale link (unknown or archived workout, or unknown routine) → a plain "Workout not found" state with a way back.

### 7. Picker in template mode (`app/add-exercise.tsx`)
- Read `to` from `useLocalSearchParams`. `to === 'template'`: the session guard doesn't apply. Instead, with no open draft at mount → `<Redirect href="/" />`. The pick adds to the draft (`updateDraft(addExercise(…))`) and goes back. The mode sheet is the same.
- Without the param: unchanged.

### 8. Workout tab (`app/(tabs)/index.tsx`)
- Quick Start unchanged. Routines: heading + "New Routine" (opens `NameDialog`), the sections from `useRoutines()`, or the empty state with a "New Routine" action.
- Wire the menus, the confirmations, "New Workout" (`/edit-workout?routineId=…`), Edit / tap (`/edit-workout?workoutId=…`), and Start with the in-progress `Alert`.

### 9. Finish: update template (`app/active-workout.tsx`)
- After `finishWorkout` succeeds: `router.replace` to the summary. Then, if `templateUpdateCandidate(session.id)` (the captured id) returns a workout, show the "Update template" `Alert` (`updateTemplateFromSession` on "Update template"; if it fails, a second `Alert` with the reason).

### 10. Flow tests (`__tests__/routines.test.tsx`)
Same setup as `active-workout.test.tsx` (mocked `@/db/client` with `createTestDb()` + seed, `useDatabaseSetup` mocked, `Alert` spy, `userEvent` with `advanceTimers`, `renderRouter` Promise kept for `getPathname`). `afterEach` deletes sessions, then workouts (their exercises and sets cascade), then routines, and notifies. The DB is asserted directly. Separate tests for:
- New Routine → dialog → name → the section shows. Rename, move and delete (with confirmation) → reflected on the tab and archived in the DB.
- New Workout → editor → name → Add Exercise → Free Throws, fixed attempts → target 10 → change it to 20 → Add Set (copies 20) → add a check drill → Save → the card shows "Free Throws, <check drill>". The DB has two exercises, and the first has sets `[20, 20]`.
- Save with an empty name or no exercises → the reason is shown and nothing is written.
- Edit an existing workout, change something, Save → back on `/` with no `Alert` (the guard doesn't fire after a successful Save).
- Edit an existing workout, Save with no changes → back on `/`, DB unchanged (`updatedAt` included).
- Edit an existing workout, change something, Cancel → "Discard changes?" → Discard → DB unchanged. The same with the Android back button (`router.back()` via the guard), unless the step 6 spike ruled that out. The same with a target cell focused and left invalid when Cancel is pressed → no error.
- Start → the active workout has the template's name, exercises and targets. Log a set and finish with no structural change → no "Update template" question.
- Start → change a target and add a set → Finish → the summary is the pathname and the question shows → "Keep template" → template unchanged. Same again with "Update template" → the template has the new structure and no logged values.
- Start while a session is in progress → "Resume" opens the same session. "Discard and start" replaces it.
- Delete a workout whose session is in progress → Finish works and asks nothing.
- `active-workout.test.tsx` and `shell.test.tsx` still pass (the picker without the param is unchanged).

### 11. Check on the phone (Expo Go)
- Build a real routine with two or three workouts, mixing both shooting modes and check drills. Edit targets, add and swipe away sets, reorder exercises, save, reopen and check everything is there.
- Rename, reorder and delete routines and workouts. The Quick Start and resume banner still work.
- Editor: Cancel and the back button with unsaved changes ask first. With no changes they don't. The keyboard never hides the focused target cell, including in the last card. An invalid target (0, blank) rolls back on blur.
- Start from a template, log, change the structure, Finish → the summary shows behind the "Update template" question, and both answers behave as expected. The next Start of that workout reflects the choice.
- After killing the app mid-session started from a template, the banner resumes it with its values.
- Feedback from this check is written at the end of this file ("Results"), and changes are made before the commit, as in Phase 3.

### 12. CI and phase commit
- Run the full CI list locally (`lint`, `format:check`, `typecheck`, `test`, `db:generate` + clean `git status` on `src/db/migrations`, `npx expo-doctor`).
- Update `CLAUDE.md`: project state (the `edit-workout` route, the picker's `to=template`, `src/features/routines/`, the shared `src/features/dataStore.ts`, "every data write goes through a feature's `actions.ts`", "templates change only through Save or the Finish update", and that `useNumberCell`, `setDraft` and `SetTableHeader` in `src/features/workout/` are shared with `src/features/routines/`), current status (Phase 4 done, next: write `phase-5.md`).
- One commit: "Phase 4: routines and workout templates". Push and confirm CI is green. Tick the checklist.

## Final checklist

- [x] `npm run lint`, `format:check`, `typecheck`, `test` and `npx expo-doctor` pass locally, and `db:generate` leaves the migrations unchanged.
- [x] Domain helpers (`sameStructure` and the structure builders, `formatExerciseList`) and the template draft functions have unit tests.
- [x] Repository tests cover the reorders, `saveWorkout` (create, replace, rollback), `overwriteWorkoutFromSession`, and a template left unchanged by a session edited and finished.
- [x] Flow tests cover routine create/rename/move/delete, building and saving a template through the picker, Save (with and without changes, never followed by "Discard changes?"), Cancel with unsaved changes, Start (including with a session in progress), and Finish with Keep and with Update, asserting the DB.
- [x] On the phone (Expo Go): a routine with several workouts is built, edited and started without touching code, and the template changes only when "Update template" is chosen.
- [x] CI is green on `main`.

## Implementation notes

Where the code differs from, or settles, what is written above:

- **`usePreventRemove` spike (step 6):** under `renderRouter` it blocks both the close button and `router.back()` (the Android back button), so both are tested (`__tests__/routines.test.tsx`).
- **Save with no changes** skips the write only for an existing workout. A new, untouched workout still goes through `saveWorkout`, so Save says what is missing ("The name can't be empty.") instead of closing silently. Leaving it with nothing typed doesn't ask ("Discard changes?" only shows when `isDirty`).
- **`openDraft` doesn't notify** its subscribers: it runs inside the editor's first render, and the editor reads the draft right after.
- **Workout card:** the body (name and exercise list) is its own pressable next to the ⋮ button, with "Start" below, so no pressable is nested in another (accessibility label "Edit <workout>"). The routine's "New Workout" is labeled "New workout in <routine>", to tell the sections apart. The heading's "New Routine" button is hidden while there are no routines (the empty state has the action).
- **`SetTableHeader`** takes `hideLogged` (the editor's `SET | ATTEMPTS`, or just `SET` for a check drill), and exports `modeSubtitle`.
- **`.expo/types/router.d.ts`** (typed routes, git-ignored) is regenerated by `npx expo start`; run it once after adding a route or `tsc` reports the new path as unknown.

## Results

On-phone check (step 11), first pass: everything asked for works, with one exception.

- **Swiping a set row to delete it didn't start on its number field**, only on the row's edges. React Native's `TextInput` takes the whole touch on Android. First try: gesture-handler's `TextInput`, which lets the drag through. The swipe then worked, but after the delete the field got focused and its value selected. Its Android hook sends the whole drag to the field and decides it was a tap because the finger barely moved *relative to the field*, which moves with the row. Fix: `NumberInput` is back on React Native's `TextInput`. Until the field is focused, a transparent `Pressable` covers it and focuses it on a tap (`ref.focus()`). A drag that starts on the field starts on that layer, like on the row's edges, and the field never sees it. The layer is dropped while the field is focused, so the focused field keeps its native behavior (a swipe starting on the focused cell doesn't move the row, which is accepted). It applies to the template editor and the active workout.

Second pass: the swipe starts on the field and deletes the set with nothing selected afterward, and a tap still focuses the field. On-phone check passed.
