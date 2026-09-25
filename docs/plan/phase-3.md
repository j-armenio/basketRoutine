# Phase 3 — Active Workout (prototype) (detailed plan)

Detailed plan for Phase 3 of [PLAN.md](PLAN.md).

**Goal:** the first usable version of the app. Start an empty workout, add exercises from the seed catalog (choosing the target mode for shooting drills), log every set on a set table with live FG%, and finish it with a summary or discard it. Every valid input is written to SQLite as it's typed, so a killed app loses nothing, and a Hevy-like "workout in progress" banner brings the session back. The data layer from Phase 1 already covers almost all of this. This phase is mostly screens, plus the components they need.

The phase closes in two parts, so an EAS problem can't hold up the code:

- **Part A (code), done when:** the whole flow works on the phone in Expo Go (step 11), `lint`, `format:check`, `typecheck`, `test` and `expo-doctor` pass, and CI is green on the phase commit (step 12). Phase 4 can start from here.
- **Part B (APK and court), done when:** the `preview` APK is installed and the keystore is backed up (step 13), and a real court session was logged end to end from it (start, add exercises, log sets, finish, see the summary), with its feedback written down (step 14). Part B can run while Phase 4 is in progress. From the APK install on, migrations are append-only, including Phase 4's.

## Decisions for this phase

| Topic | Decision |
|---|---|
| Routes | Three new screens on the root `Stack`, above the tabs: `app/active-workout.tsx` (the in-progress session, no id param since there is at most one), `app/add-exercise.tsx` (the exercise picker, `presentation: 'modal'`) and `app/workout-summary/[id].tsx` (shown after Finish). The active workout slides up from the bottom (`animation: 'slide_from_bottom'`). The Android back button, or its "minimize" chevron, returns to the tabs while the session keeps going, as in Hevy. `active-workout` and `add-exercise` redirect to `/` when they **mount** with no in-progress session (a stale link, or a session discarded elsewhere). If the session goes away while the screen is already mounted (Finish, Discard), the screen renders nothing and leaves navigation to the action's own `router.replace` / `router.back()`. A `<Redirect>` there would race with it: `notifySessionChanged()` re-renders the screen before the handler navigates, and `Redirect` calls `router.replace('/')` from a focus effect, which could replace the summary with `/`. |
| Where the code lives | Route files compose the screens. Workout-specific pieces (store, actions, exercise card, set rows, resume banner) live in a new `src/features/workout/`. Reusable pieces that later phases will need too (number input, text field, icon button, action sheet, list item) go into `src/components/`. Pure helpers (formatting, parsing, default names and targets, list moves, error messages) go into `src/domain/`, with unit tests. |
| Reading data | Synchronous reads straight from the repositories (`getInProgressSession`, `getSessionDetail`…), the same way the Exercises placeholder already reads the catalog. A session is small and SQLite is local, so a read takes well under a millisecond. Drizzle's `useLiveQuery` is not used: it depends on expo-sqlite's change listener, which doesn't exist under `better-sqlite3` in Jest, and it's async where the repositories are sync. |
| Keeping screens in sync | A tiny module store, `src/features/workout/sessionStore.ts`: a version counter with `subscribe` / `notifySessionChanged()`, read through `useSyncExternalStore`. Every write goes through `src/features/workout/actions.ts`, which calls the repository with `db`, bumps the version, and turns a `DomainError` into `{ ok: false, reason }`. Hooks (`useInProgressSession()`, `useSessionDetail(id)`, `useFinishedSessionCount()`) re-read the DB when the version changes. The active workout, the resume banner, the Workout tab and the History placeholder then stay in sync with no focus listeners and no prop drilling. Pure JS, so Jest runs it unchanged. |
| When a value is saved | On every keystroke that leaves the set **valid**. The DB is then never more than one keystroke behind the screen, so a killed app, or a tap on "Finish" / "Add Set" while the keyboard is still open (see Keyboard), loses nothing. No extra mechanism is needed for that. A number cell keeps a local draft only while focused. When it isn't focused it shows the stored value, so a draft can never go out of sync with the DB. Each keystroke is checked with `validateSet` from `src/domain` (the repository validates again before writing, so nothing can bypass the invariant). A valid draft is saved at once, and the row's FG% follows it. An invalid draft is **not** saved and **not marked yet**, because it's often a prefix of a valid value: in `makes` mode with target 5, typing "12" passes through "1". On blur (the keyboard's "done" key, or tapping elsewhere), an invalid draft is rolled back to the value the cell had when it got focus. That value is written back too, since a prefix may have been saved on the way, e.g. the "1" of "11" when the target is 10. Only then does the cell get a red border, and the reason shows under the row until the next edit. The same rollback runs if the row unmounts with an invalid draft (Minimize with the keyboard open). "Finish" calls `Keyboard.dismiss()` first, so an invalid entry is rolled back before the user answers the confirmation. All of this lives in the set row. The note field and ✓ toggles save on every change with no validation. |
| Adding an exercise | `addSessionExercise` also inserts the exercise's first set in the same transaction, like Hevy: a new card is never empty. A shooting drill's first set gets a default target per mode (`attempts` → 10, `makes` → 5, defined once in `src/domain`), which the user edits in the Target cell. An exercise always keeps at least one set: `deleteSessionSet` refuses to delete the last one (`invalid_set_count`), and its row can't be swiped (added after step 11; to drop the whole exercise, remove it from the ⋮ menu). `addSessionSet` still falls back to the same default when an exercise has no sets, as a safety net the app can't reach. No schema change, so **no migration** this phase. |
| Target mode choice | In the picker. Tapping a `makes_attempts` exercise opens an action sheet with two options: "Fixed attempts — log makes" (e.g. take 10 shots, count the makes) and "Fixed makes — log attempts" (e.g. make 5, count the shots). A `check` exercise is added at once. The mode can't be changed after adding: the stored values would mean something else. To change it, remove the exercise and add it again. The same exercise can be added twice. |
| Set table | `makes_attempts`: `Set │ <target> │ <logged> │ FG%`. The target and logged headers use their meaning, not "Target/Logged": `ATTEMPTS │ MAKES` in `attempts` mode, `MAKES │ ATTEMPTS` in `makes` mode. The card subtitle states the mode ("Fixed attempts · log makes"). The logged cell is the big one (`input.height`, `input.fontSize`), the target cell is compact but still ≥ 48 dp. FG% per set is shown next to the row, and the exercise total (Σmakes/Σattempts and FG%) under the table, both from `src/domain`. `check`: `Set │ ✓`, where ✓ is a 48 dp toggle (`accent` fill when done). |
| FG% display | Rounded to a whole percent, `—` when there is nothing to divide (`formatFgPct` in `src/domain/format.ts`). No color thresholds yet (success/danger coloring is left for feedback). |
| Deleting sets, moving and removing exercises | **A set is deleted by dragging its row to the left** (changed after the phone check in step 11, where the first version, a "Delete set" menu behind the set number, wasn't found). This is the one exception to Phase 2's "every action is a plain tap" rule, and it was the developer's choice. A red "Delete" area shows behind the row, and letting go past half of it deletes the set, with no confirmation (a set is cheap to add back). It's built as a reusable `SwipeToDelete` on `ReanimatedSwipeable` from `react-native-gesture-handler` (already installed, works in Expo Go), with a `GestureHandlerRootView` around the root layout. The row also exposes a "delete" accessibility action, for TalkBack and for the tests, since Jest can't run the gesture. The set number is plain text. Everything else stays a plain tap: each exercise card has a ⋮ button whose action sheet holds "Move up", "Move down" (disabled at the ends) and "Remove exercise". Moving swaps with the neighbor through `reorderSessionExercises` (drag & drop is backlog). Removing asks for confirmation. |
| Menus and confirmations | A small `ActionSheet` component (RN `Modal`, slides from the bottom, 56 dp rows, destructive rows in `danger`, a Cancel row; the backdrop and the Android back button close it). Android's `Alert` holds at most three buttons, too few for the card menu. Yes/no confirmations (Discard, Remove exercise, Finish) use the native `Alert.alert`. |
| Finish | "Finish" (primary, top right of the active workout). If nothing is logged (no shooting set with a value, no ✓), finishing is blocked and the dialog offers "Discard workout" or "Keep going" instead. Otherwise a confirmation ("Finish workout?", which also says how many empty sets won't count), then `finishSession`, then `router.replace` to the summary so back doesn't reopen the finished session. Empty sets are kept in the DB and excluded from every summary (Phase 1 rule). Whether they should be dropped on finish is a feedback question. |
| Summary screen | Built from `getSessionDetail(id)` + `summarizeSession` / `summarizeExercise`, not from `finishSession`'s return value. The route then works for any session id and Phase 5 (History) can link to it. It shows: name, date, duration (`finishedAt − startedAt`), shooting totals (makes, attempts, FG%, only if something was logged), check totals (completed / total), one line per exercise. "Done" goes back to the Workout tab. |
| Session name | An empty workout is named after the time of day it starts, like Hevy: "Morning Workout" (before 12:00), "Afternoon Workout" (before 18:00), "Evening Workout" (`defaultWorkoutName(date)` in `src/domain`). Renaming is Phase 5 (editing past sessions). |
| Resume banner | Rendered above the tab bar on every tab, through the `Tabs` `tabBar` prop: the `ResumeBanner`, then the default `BottomTabBar` (both `Tabs` and `BottomTabBar` imported from `expo-router/js-tabs`, since the root `Tabs` export is deprecated). `tabBarHideOnKeyboard` only hides the `BottomTabBar`, so the banner stays up while the keyboard is open. There are no inputs on the tabs in this phase, but Phase 6's catalog search will hit this (hide the banner on keyboard there). It shows "Workout in progress" + the session name. Tapping the banner opens the active workout. Its "Discard" (danger text) asks for confirmation first. It's hidden when no session is in progress. On the Workout tab, the Quick Start button reads "Resume Workout" instead of "Start Empty Workout" while a session is in progress. On launch, the app opens on the tabs with the banner, not straight into the workout (Hevy's behavior). |
| Keyboard | `keyboardType="number-pad"`, `selectTextOnFocus` (typing replaces the value), `returnKeyType="done"`. The active workout's scroll view uses `keyboardShouldPersistTaps="handled"`, so "Add Set" works on the first tap while the keyboard is open (the input keeps focus, but its last valid value is already saved). `Screen` wraps its `ScrollView` in a `KeyboardAvoidingView` (`behavior="padding"`) when `keyboardAvoiding` is set, so the focused input in the last card stays above the keyboard. A `KeyboardAvoidingView` placed inside the scroll view would do nothing. The app is edge-to-edge, so Android's own resize can't be relied on. **Hiding the keyboard leaves the field** (added after step 11): Android's back button hides the keyboard but keeps the input focused, so the root layout blurs the focused input on `keyboardDidHide` (`useBlurOnKeyboardHide`, for every input: number cells roll back an invalid entry, the note closes its editor). This gets checked on the phone (step 11). If it doesn't hold up, the fallback is `react-native-keyboard-controller` (works in Expo Go), asked about before installing. |
| No live timer | Session and rest timers are backlog. The summary shows the duration, computed once. |
| Where the court test runs | From the `preview` APK, not Expo Go. Expo Go loads the bundle from the laptop's dev server, which isn't at the court. This is the "first APK after Phase 3" decision from `CLAUDE.md`. It also clears the pending Phase 0 items (build, install, keystore backup). **From that install on, migrations are append-only** (migration policy). |

## Out of scope (belongs to later phases)

- Starting from a template, "overwrite template" on Finish, routines on the Workout tab → Phase 4 (moved up from Phase 6 after the phone check: it's the app's main flow). `startSessionFromWorkout` already exists but gets no UI yet.
- History list and session detail, editing, deleting or renaming a finished session → Phase 5. The History placeholder only gains a count of finished sessions, as proof they're saved.
- Catalog browsing by category, exercise detail, custom exercises → Phase 6. The picker is a plain searchable list.
- Timers, the "Previous" column, drag & drop, FG% charts → backlog.
- Haptics, FG% coloring, accessibility pass, performance check on a long session → Phase 7 (or earlier if the feedback round asks for it).
- Multi-select in the picker (add several exercises at once).

## Tools

Nothing new is expected to be installed. Everything used here (`Modal`, `KeyboardAvoidingView`, `SectionList`, `Alert`, `useSyncExternalStore`, `BottomTabBar`) ships with React Native, React or expo-router, and swipe to delete uses `react-native-gesture-handler` and `react-native-reanimated`, which were already dependencies. In Jest, `jest.setup.js` loads gesture-handler's own mocks and swaps `ReanimatedSwipeable` for a plain view. The one possible exception, asked about first:

| Package | What it does | When |
|---|---|---|
| `react-native-keyboard-controller` | Reliable keyboard avoidance on edge-to-edge Android (`npx expo install`) | Only if `KeyboardAvoidingView` fails the phone check in step 11 |

`eas-cli` keeps being run through `npx eas-cli@latest`, as in Phase 0 (no global install).

## Steps

### 1. Domain helpers (`src/domain/`)
Each with its unit tests next to it.
- `format.ts`:
  - `formatFgPct(ratio | null)`: `'70%'`, `'67%'` for 2/3, `'100%'`, `'—'` for `null`.
  - `parseCount(text)`: `''` → `null` (empty); only digits → integer; anything else (`'1.5'`, `'-1'`, `','`) → invalid. The number pad on some keyboards still offers `.`, `,` and `-`.
  - `formatDuration(ms)`: `'42 min'`, `'1 h 05 min'`.
- `defaults.ts`: `DEFAULT_TARGET_VALUE: Record<TargetMode, number>` (`attempts: 10`, `makes: 5`) and `defaultWorkoutName(date)` (tests at the 11:59 / 12:00 and 17:59 / 18:00 boundaries, built with local-time `Date`s).
- `order.ts`: `moveItem(ids, index, delta)`, which returns a new array with the item swapped with its neighbor, or the same order at the ends. Phase 4 reuses it for templates and routines.
- `messages.ts`: `reasonMessage(reason: DomainErrorReason): string`, a `Record` over every reason, so a new reason fails `typecheck` until it has a message (e.g. `makes_exceed_attempts` → "Makes can't exceed attempts.").
- `hasLoggedData(summary: SessionSummary)`: true when any shooting set has a value or any check set is done (in `summary.ts`).
- `countEmptySets(exercises: SummaryExercise[])`: the shooting sets with no logged value, the ones left out of FG%. The Finish confirmation uses it (in `summary.ts`).

### 2. Data layer changes (`src/db/repositories/sessions.ts`)
- `addSessionExercise` inserts the first set in the same transaction: `DEFAULT_TARGET_VALUE[targetMode]` for `makes_attempts`, no values for `check`.
- `addSessionSet`: when no target is passed and there is no previous set, falls back to `DEFAULT_TARGET_VALUE[targetMode]`.
- `deleteSessionSet` refuses to delete an exercise's last set (`invalid_set_count`, added after step 11).
- Update `sessions.test.ts`:
  - adding an exercise creates exactly one set with the right default (both modes and `check`);
  - "Add Set" on an exercise with no sets uses the default (that state is set up straight in the DB);
  - the last set can't be deleted;
  - update existing assertions that counted sets after `addSessionExercise`.
- No schema change. Check: `npm run db:generate` leaves `src/db/migrations` unchanged.

### 3. Base components (`src/components/`)
One file each, with a `*.test.tsx` where there's behavior.
- `IconButton`: an `Icon` in a 48 dp pressable with pressed feedback; `accessibilityLabel` required (it has no visible text). Used for ⋮, the minimize chevron, and the picker's close button.
- `NumberInput`: `TextInput` with the number-pad settings from the decisions, `tabular-nums`, sizes `large` (`input.height` / `input.fontSize`) and `compact` (≥ 48 dp), an `invalid` flag (red `danger` border, set by the row after an invalid entry is rolled back on blur), `accessibilityLabel` required (e.g. "Set 2 makes"). Pure presentation: the draft logic lives in the set row.
- `TextField`: single- or multi-line text input on `surface`, for the picker search and the exercise note (`maxLines` caps a multi-line field's height, then it scrolls inside).
- `SwipeToDelete` (added after step 11): wraps a row; dragging it left deletes it (see the decision). Test: the "delete" accessibility action calls `onDelete`.
- `ListItem`: a 56 dp pressable row with a title, an optional subtitle and an optional right icon. Picker rows now, routine and workout rows in Phase 4, History rows in Phase 5 and catalog rows in Phase 6.
- `ActionSheet`: `visible`, `title?`, `options: { label, icon?, destructive?, disabled?, onPress }[]`, `onClose`. Tests: renders the options; a disabled option doesn't fire; an option fires and then closes; Cancel closes.
- `Screen`: three small additions: an optional `left` slot (the minimize/close buttons), `bottomInset` for screens outside the tabs (which have no tab bar to pad the bottom), and `keyboardAvoiding`, which wraps the `ScrollView` in a `KeyboardAvoidingView` (`behavior="padding"`). Its `ScrollView` gets `keyboardShouldPersistTaps="handled"`. Test: with `keyboardAvoiding`, the scroll view renders inside the `KeyboardAvoidingView`.

### 4. Session store, hooks and actions (`src/features/workout/`)
- `sessionStore.ts`: version counter, `subscribe`, `notifySessionChanged`, `useSessionVersion()`.
- `hooks.ts`: `useInProgressSession()`, `useSessionDetail(id)`, `useFinishedSessionCount()`. Each is `useMemo` over a sync repository read, keyed by the version. The memo callback references the version (`void version;`, with a comment) because `react-hooks/exhaustive-deps` flags a `useMemo` dependency the callback doesn't use.
- `actions.ts`: one function per user action (`startEmptyWorkout`, `addExercise`, `removeExercise`, `moveExercise`, `updateNote`, `addSet`, `deleteSet`, `updateSet`, `finishWorkout`, `discardWorkout`). Each calls the repository with `db`, notifies, and returns `{ ok: true, value }` or `{ ok: false, reason }` for a `DomainError`. Any other error is rethrown, so a real bug still shows up.
- `setDraft.ts`: the pure draft rule for a number cell. `evaluateDraft({ exercise, set, field, text })` → `{ kind: 'valid', value }` or `{ kind: 'invalid', reason }` (`parseCount` + `validateSet`, using the other field's stored value). Unit-tested for both modes: target and logged edits, an empty logged value (valid, clears), an empty target (invalid), non-digits, and a target change that makes the stored logged value invalid.
- Tests: actions against `createTestDb()`. The store notifies once per successful write. A `DomainError` comes back as a reason and doesn't notify.

### 5. Set rows and exercise card (`src/features/workout/`)
- `ShootingSetRow`: set number, compact target `NumberInput`, large logged `NumberInput`, FG%. The draft/save/rollback behavior from the decisions, built on `evaluateDraft`. Tests with a real test DB:
  - a valid value is saved on the keystroke, and the FG% follows it;
  - an invalid one isn't saved and isn't marked while typing;
  - blur rolls it back to the value it had at focus (in the DB too), marks the cell invalid and shows the reason;
  - unmounting with an invalid draft rolls it back as well.
- Both rows are wrapped in `SwipeToDelete`.
- `CheckSetRow`: set number + ✓ toggle (`accessibilityRole="checkbox"`, `accessibilityState={{ checked }}`).
- `ExerciseCard`: header with name, mode subtitle and ⋮ menu; the table header for its tracking type; the rows; the exercise total under the table (shooting only); "Add Set" (`ghost`); the note last (`ExerciseNote`, placeholder "Add a note"). At rest the note shows at most two lines ending in "…"; tapping it opens a `TextField` that grows up to four lines and then scrolls (both from the step 11 feedback).
- Saving on every keystroke means one write and one re-read of the session per keystroke, well under a millisecond each at this size. `React.memo` on the card wouldn't help: `getSessionDetail` returns new objects on every read. If a long session ever lags, the fix is a per-card read. The long-session performance check is Phase 7.

### 6. Active workout screen (`app/active-workout.tsx`)
- Registered on the root `Stack` in `app/_layout.tsx` with `animation: 'slide_from_bottom'` (and `add-exercise` with `presentation: 'modal'`).
- `Screen` titled with the session name, `left`: a chevron-down `IconButton` ("Minimize", `router.back()`), `right`: "Finish" button, `bottomInset`, `keyboardAvoiding`.
- Content: the exercise cards; an empty state ("Add your first exercise") when there are none; "Add Exercise" (`secondary`, full width, opens the picker); "Discard Workout" (`danger`, confirmation).
- Finish and Discard as in the decisions. After Discard: back to the tabs. After Finish: `router.replace('/workout-summary/<id>')`.
- "Finish" calls `Keyboard.dismiss()` before anything else (see the saving decision).
- Redirects to `/` only if it mounts with no in-progress session. If the session goes away later, it renders nothing (see Routes). Same guard in `add-exercise`.

### 7. Exercise picker (`app/add-exercise.tsx`)
- `Screen` titled "Add Exercise" (`scroll={false}`, since it holds a `SectionList`, which must not sit inside a `ScrollView`), `left`: a close `IconButton`.
- A search `TextField` over `listExercises(db, { search })`. Results in a `SectionList` grouped by category, in `CATEGORIES` order, with `CATEGORY_LABELS` headers. Rows are `ListItem`s with a subtitle "Makes / Attempts" or "Check".
- Tap: `check` → add + `router.back()`. `makes_attempts` → the mode `ActionSheet`, then add + `router.back()`. The active workout picks up the new card through the store.
- When Phase 4 needs a picker for templates, this screen gets a param for "where to add". Not built now.

### 8. Summary screen (`app/workout-summary/[id].tsx`)
- As in the decisions. "Done" (`primary`, full width) → `router.dismissTo('/')`. Check that the Android back button from the summary also lands on the tabs, not on the finished workout.
- A missing or in-progress id shows a plain "Workout not found" state with a way back.

### 9. Tabs: resume banner, Workout and History placeholders
- `app/(tabs)/_layout.tsx`: switch the imports to `expo-router/js-tabs` and add `tabBar={(props) => <><ResumeBanner /><BottomTabBar {...props} /></>}`. Check that the tab bar's bottom inset and `tabBarHideOnKeyboard` still behave as before (the banner itself doesn't hide, see the decision).
- `src/features/workout/ResumeBanner.tsx`: as in the decisions; renders nothing without an in-progress session.
- Workout tab (`index.tsx`): the Quick Start button is now live. "Start Empty Workout" → `startEmptyWorkout` → `router.push('/active-workout')`. It becomes "Resume Workout" while a session is in progress. The Routines section keeps its empty state (Phase 4).
- History tab (`history.tsx`): subtitle "N workouts logged" from `useFinishedSessionCount()`. With 0 it keeps "No workouts yet"; with more, the empty state says the list is coming.

### 10. Flow tests (`__tests__/active-workout.test.tsx`)
`renderRouter` with the real routes and root layout, and the same two mocks as `shell.test.tsx` (`@/db/client` with `createTestDb()` + seed, `@/db/useDatabaseSetup` returning `{ ready: true }`). `renderRouter` enables fake timers, so set the clock with `jest.setSystemTime` to get a known workout name. Confirmations go through `jest.spyOn(Alert, 'alert')`, pressing the wanted button from the spy's arguments. The DB is asserted directly, not only the screen, since "saved immediately" is the point. Typing: `selectTextOnFocus` isn't simulated in Jest and `user.type` appends to the current value, so clear the cell first (`user.clear`, which on a logged cell saves an empty value, which is valid). `user.type` ends with blur. To check the state while the cell is still focused, use `fireEvent.changeText` instead. Separate tests for:
- Start → add Free Throws in `attempts` mode → set 1 shows target 10 → type 7 → FG% "70%" on screen, `loggedValue` 7 in the DB, already before blur.
- Invalid entry: over a stored 7, type 11 → the "1" is saved on the way, "11" isn't; blur → 7 again in the DB and on screen, with the reason.
- Add Set copies the target; delete a set (through the row's "delete" accessibility action, since Jest can't run the swipe); add a `check` exercise and toggle ✓; move an exercise up; remove one after confirmation.
- Keyboard still open: change a target with `changeText` (no blur) and press "Add Set" → the new set copies the new target.
- Minimize → the banner shows on the tabs. **App kill:** unmount, render the router again on the same DB → the banner is still there, Resume shows the same values.
- Finish → confirmation → the summary shows 7 / 10 and 70%, check 1 / 1 (and the pathname is the summary, not `/`) → Done → Workout tab, no banner, History says "1 workout logged".
- Finish with nothing logged → only Discard / Keep going are offered.
- Discard from the active workout → confirmation → pathname `/`, no session left in the DB.
- Discard from the banner → confirmation → no session left in the DB.
- Update `shell.test.tsx` for the now enabled Quick Start button.

### 11. Check on the phone (Expo Go)
Before building the APK, in the dev loop:
- The whole flow from the tests, by hand: start, add shooting drills in both modes and a check drill, log sets, edit a target, delete a set, reorder, note, finish, summary, Done.
- **Keyboard:** the focused input in the last card stays above the keyboard; "done" closes it; "Add Set" works with the keyboard open. If it doesn't, stop and ask about the fallback in Tools.
- **App kill:** type a value (both after pressing "done" and while the keyboard is still open), kill the app from recents, reopen: the banner shows and the value is there. An **invalid** value typed right before the kill leaves its last valid prefix (e.g. the "1" of "11" with target 10). That's expected, not a bug.
- "Finish" or "Add Set" tapped with the keyboard open and a value just typed: the value counts.
- Inputs are easy to hit and read at arm's length. Tune sizes and labels here if needed.

**Results (first pass).** Start, both shooting modes, a check drill, logging sets, reorder, finish, summary and Done all worked. The last card stayed above the keyboard, values survived an app kill, and the inputs were big enough, with clear labels. Deleting a set (then a menu behind the set number) and editing a target weren't found. Changes made from this:

- Delete a set by dragging its row to the left (see the decision), instead of the menu.
- Target editing stays as it is for now (the compact first cell).
- The note moved to the end of the card and folds to two lines with "…" at rest.
- Hiding the keyboard (Android back button) now also leaves the field, for every input.
- An exercise's last set can't be deleted, so a card is never left without sets.
- Routines and workout templates move up to Phase 4 (History → Phase 5, Catalog → Phase 6). The Quick Start (empty workout) stays as it is.

**Second pass (done, all passed):** swipe to delete on the phone, on a shooting row and a check row, including that a vertical scroll over a row doesn't delete it; the last set of each card can't be swiped; hiding the keyboard with the back button leaves the field (an invalid number rolls back, the note closes its editor), while moving between cells keeps the keyboard up; and the new note behavior.

### 12. CI and phase commit (closes Part A)
- No workflow changes. Run the full CI command list locally (`lint`, `format:check`, `typecheck`, `test`, `db:generate` + clean `git status` on `src/db/migrations`, `npx expo-doctor`).
- Update `CLAUDE.md`: project state (the three new routes, `src/features/workout/`, the store/actions rule "every session write goes through `actions.ts`", the input rule "a valid number is saved on every keystroke, and the set row rolls back an invalid one on blur", the new base components), current status ("Phase 3 Part A done, Part B pending").
- One commit: "Phase 3: active workout prototype". Push, and confirm CI is green.
- Tick the Part A checklist. Phase 4 planning can start.

### 13. APK and keystore (Part B)
- Start the "Build APK" workflow (or `npx eas-cli@latest build -p android --profile preview`, resuming the Phase 0 build) and let EAS generate the keystore. Install the APK on the phone: it opens with no white flash, and the flow works offline (airplane mode).
- Back up the keystore (`npx eas-cli@latest credentials`) **outside the repo**.
- Tick the pending Phase 0 checklist items that this covers, and note in `CLAUDE.md` that migrations are now append-only. If Phase 4 has already generated a migration that isn't in this APK, that migration is append-only from here on as well.

### 14. Court session and feedback round (Part B)
Everything runs from the APK, in airplane mode.

- **Before the session (at home, about 10 minutes):** a real session won't naturally hit every path, so start a throwaway workout and go through the ones marked *(home)* below: invalid entries, the empty-workout Finish, delete, move and remove, app kill, and Discard. Discard it at the end.
- **The session:** log a real training session with at least one drill in each mode (fixed attempts, fixed makes) and one `check` drill. Keep a rough paper count of one shooting drill to check the totals against.
- **After the session:** answer every question below in a "Feedback" section at the end of this file, with yes/no and a short note. Every "no" in the functional check is a bug. The usability questions are opinions that feed the next phases.

**Functional check.** Does everything the phase built work?

- Start and resume
  - Did "Start Empty Workout" open the active workout, named after the time of day ("Morning", "Afternoon" or "Evening Workout")?
  - Did Minimize (the chevron and the Android back button) return to the tabs, with the banner showing the session name on all three tabs?
  - Did the Workout tab read "Resume Workout" while the session was in progress, and did both it and the banner reopen the same session?
  - *(home)* After killing the app from recents and reopening it, did it open on the tabs with the banner (not inside the workout), with every value still there, including one typed with the keyboard still open?
- Exercise picker
  - Did search find exercises by part of the name, ignoring case? Was the list grouped by category, with headers?
  - Did a shooting drill ask for the mode with the two options, and did a `check` drill get added directly?
  - Did the close button go back without adding anything? Could the same exercise be added twice?
- Logging sets
  - Did a new card come with one set, with target 10 in fixed-attempts mode and 5 in fixed-makes mode, and an unchecked ✓ for a `check` drill?
  - Did the column headers match the mode (`ATTEMPTS │ MAKES` / `MAKES │ ATTEMPTS`), and did the card subtitle state it?
  - Did tapping a cell open the number pad with the value selected, so typing replaced it? Did "done" close the keyboard?
  - Did the set's FG% update while typing, and did the total under the table (makes / attempts, FG%) match the paper count?
  - Did editing a target work, with the FG% recalculated?
  - Did "Add Set" copy the last set's target? Was the last set of a card impossible to swipe away?
  - Did "Add Set" work on the first tap with the keyboard open, keeping the value just typed?
  - Did clearing a logged value leave the set empty (FG% `—`), with no error?
  - Did ✓ toggle on and off?
- Validation
  - *(home)* Was an impossible value refused in both modes (11 makes out of 10 attempts; 3 attempts for 5 makes)? On leaving the cell, did it go back to the previous value, with a red border and a readable reason?
  - Did a valid two-digit value (e.g. 12 attempts for 5 makes) go in with no red flash while typing?
- Managing the workout
  - *(home)* Did dragging a set row to the left delete that set, and only when dragged on purpose?
  - *(home)* Did the ⋮ menu move cards up and down (with "Move up" / "Move down" disabled at the ends)? Did "Remove exercise" ask for confirmation and then remove the card?
  - Was the note still there after minimizing and reopening (and after the app kill)? Did a long note fold to two lines ending in "…"?
- Keyboard
  - Did the keyboard never hide the focused input, including in the last card?
- Finish and summary
  - *(home)* On a workout with nothing logged, did Finish offer only "Discard workout" / "Keep going"?
  - Did the Finish confirmation show the right number of empty sets?
  - Did the summary show the name, date and a plausible duration? Did the shooting totals and FG% match the paper count, and the `check` totals (completed / total) match what was ticked? Was there one line per exercise?
  - Did both "Done" and the Android back button from the summary land on the Workout tab, with no banner, and no way back into the finished workout?
  - Did History show "N workouts logged" with the right count?
- Discard
  - *(home)* Did Discard, from the active workout and from the banner, ask for confirmation and leave no banner and no session behind?
- APK and stability
  - Did the whole session work in airplane mode? Did the app open with no white flash, with the right icon and name?
  - Was there no crash, freeze, or lag while typing?

**Usability feedback.** What should change?

- Are the default targets (10 / 5) right?
- Are the column labels clear in both modes? Are the two mode options in the picker clear?
- Are the inputs big enough to hit and read at arm's length, between reps?
- Is swipe to delete easy to do on purpose, and hard to trigger by accident (e.g. while scrolling)?
- Should empty sets be dropped on finish?
- Is the finish confirmation needed?
- Should focus jump to the next set after "done"?
- Is a live timer or FG% coloring missed?
- Was anything missing that forced a paper note or another app during the session?

**Then:**

- A functional "no" that blocks logging is fixed now (fix-up commits) and rechecked on the APK. Any other "no", and every usability change worth making, goes into `PLAN.md` (the fitting phase or the backlog).
- A final commit ticks the Part B checklist ("Mark Phase 3 as done").

## Final checklist

### Part A — code

- [x] `npm run lint`, `format:check`, `typecheck`, `test` and `npx expo-doctor` pass locally, and `db:generate` leaves the migrations unchanged.
- [x] Domain helpers (FG% formatting, count parsing, duration, default name and targets, `moveItem`, reason messages, empty-set count, draft evaluation) have unit tests.
- [x] Adding an exercise creates its first set, its last set can't be deleted, and "Add Set" works on an exercise with no sets (repository tests).
- [x] Flow tests cover start → log → invalid entry → finish → summary, "Add Set" with the keyboard open, discard, and resume after an app kill, asserting the DB and the final pathname.
- [x] On the phone (Expo Go): the full flow works, the keyboard never hides the focused input, and a value typed before killing the app is there after reopening.
- [x] CI is green on `main`.

### Part B — APK and court session

- [x] The `preview` APK installs and works (build 4, from the "Build APK" workflow), and the keystore backup is stored outside the repo. A clean install (not over an earlier APK) was confirmed to work offline.
- [x] A real court session was logged end to end from the APK, and every question in step 14 is answered in this file's "Feedback" section, with the blocking bugs fixed (there were none).

## Feedback

The session was logged from the `preview` APK (EAS build 4, clean install, airplane mode). The developer's answers, in the order of step 14.

**Functional check:** every item worked, including the *(home)* paths. No bugs, so no fix-up commits were needed.

**Usability feedback**

| Question | Answer |
|---|---|
| Are the default targets (10 / 5) right? | Yes. |
| Are the column labels clear in both modes? Are the two mode options in the picker clear? | Yes. |
| Are the inputs big enough to hit and read at arm's length, between reps? | Yes. |
| Is swipe to delete easy to do on purpose, and hard to trigger by accident? | Yes. |
| Should empty sets be dropped on finish? | No: keep the current behavior (they stay in the DB and are left out of every summary). |
| Is the finish confirmation needed? | Keep the current behavior. |
| Should focus jump to the next set after "done"? | No. After "done" the field should end up unfocused, as it does now. |
| Is a live timer or FG% coloring missed? | FG% coloring would be nice. No timer. |
| Was anything missing that forced a paper note or another app? | No. |

**What goes where**
- FG% coloring (success/danger by FG%, on set rows, exercise totals and the summary) → added to Phase 7 (polish) in `PLAN.md`. The thresholds are still to be decided then.
- Nothing else changes: the rest of the answers confirm the current behavior.
