# Phase 6 — Exercise Catalog (detailed plan)

Detailed plan for Phase 6 of [PLAN.md](PLAN.md).

**Goal:** the Exercises tab stops being a placeholder. The user browses the catalog by category, searches it, sees every exercise's main media (an image, a GIF or a short video) next to its name, opens an exercise to see it larger with its description, and manages **custom** exercises: create, edit, delete, picking their media from the phone's gallery. Predefined exercises are read-only, their media included (it ships with the app). The data layer already has most of it (Phase 1: `listExercises` with category and search, `createCustomExercise`, `updateCustomExercise`, `archiveCustomExercise`, `exercises.mediaUrl`). This phase adds the media to the writes, settles what deleting a custom exercise does to the templates that use it (the open question Phase 4 left for this phase), and builds the screens.

**Done when:** on the phone (Expo Go), any exercise can be found by browsing or searching, every row shows the exercise's media (or a placeholder) and plays it when held, the detail shows it larger with the description, and a custom exercise can be created with media from the gallery (also from the picker while building a template), edited and deleted. `lint`, `format:check`, `typecheck`, `test` and `expo-doctor` pass, `db:generate` leaves the migrations unchanged, and CI is green on the phase commit. No APK this phase (Phase 5's Part B stays tracked in `phase-5.md` and doesn't block this one), but the new native modules mean the next APK must be built from this phase's code or later.

## Decisions for this phase

| Topic | Decision |
|---|---|
| Exercises tab layout | The "N exercises" subtitle stays: N is the whole active catalog, not the filtered result, so it doesn't change while searching ("1 exercise" in the singular). Below it: a search field (same as the picker), a row of filter chips (All, Custom, then the five categories; single select: Custom shows only the user's own exercises, of every category, still grouped by category and combined with the search; with none, "No custom exercises yet"), and a `SectionList` grouped by category (`CATEGORY_LABELS`), exercises ordered by name. A row (`ExerciseRow`) shows the media thumbnail on the left (see "Media"), the name, and `<tracking label>` as subtitle (`Makes / Attempts` or `Check`, as in the picker), followed by ` · Custom` for custom ones; tapping it opens the detail, holding it plays its media in place. A header "New" `IconButton` opens the create form. With no match, the "No exercises found" empty state. The search stays on the name, case-insensitive (Phase 1's `listExercises`). The picker and this list share `groupByCategory` and `ExerciseRow`. |
| Routes | Two new routes on the root `Stack`, above the tabs, like the other screens: `app/exercise/[id].tsx` (the detail) and `app/edit-exercise.tsx` (the form: no param creates, `?exerciseId=<id>` edits a custom one). |
| Exercise detail | `Screen` titled with the name, subtitle `Category · tracking label`, back `IconButton` on the left and, for a custom exercise only, a ⋮ menu (`ActionSheet`) on the right with **Edit** and **Delete**. Content: the media, large (or the placeholder), then the description ("No description." when empty). A predefined exercise has no menu and shows a muted line "Predefined exercise. It can't be edited." An archived or unknown id shows "Exercise not found" with a way back, and the screen renders nothing once its exercise is deleted while mounted (the same pattern as the session detail). |
| Media | **One main media per exercise, stored on the phone, never loaded from the web** (it must work offline in the gym). Every exercise shows its media or, when it has none, a **placeholder** (the `sports_basketball` icon on the surface color). Media is optional. Kinds, by the file's extension (`mediaKind`): image (`jpg`, `jpeg`, `png`, `webp`), GIF (`gif`), video (`mp4`, `mov`, `webm`, `3gp`). **Custom exercises:** the media is picked from the gallery (`expo-image-picker`, the Android photo picker, which needs no permission; images and videos, no editing). A video longer than **30 s** is refused ("Choose a video of 30 seconds or less.") and so is an unsupported type. On Save, the file is copied (`expo-file-system`'s `copySync`, so the actions stay synchronous) into `<documents>/exercise-media/` under a new name, and `exercises.mediaUrl` stores that `file://` URI (the column keeps its name: no migration). Replacing or removing the media deletes the old file once the update succeeds; deleting the exercise deletes its file (history shows no media, and a deleted exercise has no screen); a failed Save deletes the copy it made. The repository validates the value (`validateMediaUri`: blank, or a `file://` URI with a supported extension, else `invalid_media`). **Predefined exercises:** their media ships with the app and can't be changed: a file `assets/exercises/<seedKey>.<ext>` per exercise, listed in `src/features/exercises/seedMedia.ts` (Metro only bundles static `require`s), with a test that keeps the folder and the list in sync and checks every key is a seed key. The developer supplies the files over time; until one exists, that exercise shows the placeholder. Their `mediaUrl` stays `null`. **Display:** a list row shows a 64 dp square thumbnail left of the name, cropped to fill it, not animated: the image, a GIF's first frame (`expo-image` with `autoplay={false}`) or a video's first frame (`expo-video`'s `generateThumbnailsAsync`, cached in memory per source, from the decoded file path; if it can't be made, a paused player shows the first frame instead). **Holding a row** (a long press) plays its media in place, at the same size, until the finger lifts (a GIF animates, a video plays muted in a loop), like a YouTube thumbnail on hover (known issue: moving the finger while holding stops it, see "Results"); releasing after a hold does nothing else, while a quick tap keeps the row's action (open the detail; add, in the picker). The detail shows the media large (full width, 240 dp high, `contain`) and animated: a GIF plays, a video plays muted in a loop with the native controls. A file that fails to load shows the placeholder. |
| Create / edit form | A plain screen with local state (no in-memory draft like the template editor: it's five fields, and nothing else reads it). Fields: **Name** (required), **Category** (chips, single select, default Shooting), **Tracking type** (two chips, `Makes / Attempts` and `Check`; when editing it's shown but locked, with the line "Tracking type can't be changed after the exercise is created", the Phase 1 rule: changing it under existing templates would leave them with an invalid `targetMode`), **Description** (multiline) and **Media** (the current media or the placeholder, a "Choose media" / "Change media" button that opens the gallery, and "Remove media" when there is one; a refused pick shows its message there). Save (primary) and Cancel (the close button). A domain failure (`empty_name`, `invalid_media`, `media_not_saved`) shows under the form through `reasonMessage`, and the screen stays. No "Discard changes?" guard: it's a short form and nothing is lost that matters. Names aren't unique: sessions keep their own snapshot, and blocking a repeated name would only get in the way. |
| Duplicating | **Dropped** after the first phone check: copying an exercise isn't needed. |
| Editing a custom exercise | Name, category, description and media can change; tracking type can't. Templates show the exercise through a join, so they show the new name and category right away. Sessions keep their snapshot (Phase 1), so **history keeps the old name**. That's intended: a finished session is a record of what was logged then. |
| Deleting a custom exercise | Soft (archive), after a confirmation: "Delete "<name>"?" with "It will be removed from N workouts. Your history stays." (N = active workouts that use it, the sentence is left out when it's 0), Cancel / Delete (destructive). **It is also removed from the templates that use it** (its `workout_exercises` rows are deleted, their `template_sets` cascade), in one transaction with the archive. Blocking the delete instead would make the user clean every template by hand, and keeping it in the templates would break them: `saveWorkout` requires every exercise to be active (`exercise_archived`), so a template holding a deleted exercise could never be saved again. A template that ends up with no exercise stays as it is (the card reads "No exercises"; starting it gives an empty workout; the editor won't Save until it has one). Positions of the remaining exercises keep a gap, which is harmless: only the order matters, as with archived routines. A session **in progress** that already holds the exercise keeps going (it's a snapshot). Finished sessions are never touched. The removal from templates can't be undone (there's no restore, see Out of scope), which is why the confirmation names the workout count. N counts active workouts only, while the removal covers archived workouts too: they can't be seen or started, so leaving the row there would only keep a dangling reference. |
| Update template with a deleted exercise | Follows from the above. If the exercise was deleted while a session that holds it was in progress, "Update template" at Finish would fail with `exercise_archived`. Instead, `overwriteWorkoutFromSession` leaves archived exercises out of what it copies, and `templateUpdateCandidate` compares the template with the session's structure **without** them, so the question isn't asked when that's the only difference. If nothing is left to copy, it refuses with `empty_workout` as before. |
| The picker | It follows the data version, so a custom exercise created (or deleted) while the picker is open shows up. It gets a header "New exercise" `IconButton`, which opens the create form; after Save the user is back in the picker, with the new exercise in the list, **not** added automatically (one thing at a time, and the mode choice still comes from the tap). It keeps listing only active exercises. |
| Keeping screens in sync | Unchanged: every write goes through `src/features/exercises/actions.ts` → `run` → one version bump, and the hooks re-read on the bump. The Exercises list reads at most a few dozen rows, so it follows the plain `useDataVersion` (no focus gate like the History list). |
| Data model | No schema change: `exercises` already has `mediaUrl` (now a local `file://` URI, custom exercises only), `isCustom` and `archivedAt`. **No migration.** `db:generate` must leave `src/db/migrations` unchanged. |

## Out of scope (belongs to later phases or the backlog)

- Taking a photo or recording a video from the form (camera), trimming or editing a video, media from a web link, uploading media anywhere → not planned (the gallery covers it, personal use).
- More than one media per exercise → not planned.
- The predefined exercises' media files themselves → supplied by the developer, added to `assets/exercises/` over time (see "Media").
- Changing a custom exercise's tracking type → not planned (see the decisions).
- Restoring a deleted exercise, or a "Deleted" list → not planned. It stays in the DB for history, but has no screen.
- Stats per exercise (personal bests, FG% over time) → backlog ("FG% progress charts").
- Search over descriptions, favorites, sorting options → not planned.
- Empty states, haptics, accessibility pass over the new screens → Phase 7 (the new screens still get accessibility labels, like every screen so far).

## Tools

Installed after the first phone check, with the developer's approval (2026-09-28), through `npx expo install` (SDK 57 versions): `expo-image-picker` (gallery), `expo-file-system` (copying the picked file into the app's storage), `expo-video` (playing a video, and its first frame) and `expo-image` (a GIF shown still or animated). All four work in Expo Go; they are native modules, so the next APK needs a new build. `expo-video` and `expo-image` added their config plugins to `app.json`. `SectionList` and `Alert` come from React Native. The chips and the form use the existing components (`TextField`, `Button`, `ActionSheet`, `IconButton`, `ListItem`, `Screen`, `EmptyState`), plus one new small component (`ChipRow`, step 4).

## Steps

### 1. Domain helpers (`src/domain/`)
Each with its unit tests next to it.
- `validation.ts`: `validateMediaUri(value)`: blank is valid (no media), otherwise a `file://` URI with a supported extension, else `invalid_media` (new `ValidationReason`; message "That file can't be used as media."). Tests: blank, each kind, an `https://` link, no extension, an unsupported one.
- `media.ts`: `mediaKind(uri)` → `'image' | 'gif' | 'video' | undefined` by the extension (case-insensitive, query and fragment ignored), with string operations, not `new URL` (Hermes' `URL` has had gaps that Node wouldn't catch). `pickedMedia(asset)`: what the form keeps from a gallery pick (`{ uri, extension, kind }`, the extension from the MIME type, else the file name), or why it's refused (`too_long` over 30 s, `unsupported`). Tests for both.
- `types.ts`: `TRACKING_LABELS` (`makes_attempts: 'Makes / Attempts'`, `check: 'Check'`), so the picker, the rows and the detail stop repeating the ternary. The picker's ternary moves to it.

### 2. Data layer (`src/db/repositories/exercises.ts`, `sessions.ts`)
- `CustomExerciseInput` and `CustomExerciseUpdate` gain `mediaUrl?: string`. The repository trims it, validates it with `validateMediaUri` through `assertValid`, and stores `null` for a blank one, so updating with `''` clears it. `updateCustomExercise` leaves it alone when it isn't given.
- `countWorkoutsUsingExercise(db, exerciseId)`: active (not archived) workouts that have the exercise, counted once each. For the confirmation. (An archived routine's workouts are archived with it, so no routine check is needed.)
- `archiveCustomExercise`: now in one transaction: archives the exercise and deletes every `workout_exercises` row that points to it, archived workouts included (`template_sets` cascade). Still `exercise_read_only` for a predefined one and `not_found` for an unknown one, before anything changes.
- `overwriteWorkoutFromSession`: leaves out the session's exercises that are archived (see the decisions), then `empty_workout` if none is left. A helper returns which ids among a list are archived, so the action's comparison can reuse it (step 3's `templateUpdateCandidate` depends on it).
- Tests (`exercises.test.ts`, `sessions.test.ts`, `workouts.test.ts`):
  - create and update with a media URI (trimmed, blank → `null`, anything but a supported `file://` URI → `invalid_media`, nothing written on failure); update without `mediaUrl` keeps it;
  - `countWorkoutsUsingExercise`: 0, 1, several workouts, an exercise used twice in one workout counts one, an archived workout doesn't count;
  - archive removes the exercise from every template that used it (and its template sets), leaves the other exercises of those templates and their order, leaves finished and in-progress sessions untouched (names, sets, values), and leaves other exercises alone; a predefined or unknown id changes nothing;
  - after the archive, `saveWorkout` on a template that used it works again (the reason for the decision), and `startSessionFromWorkout` gives a session without it;
  - `overwriteWorkoutFromSession` with an archived exercise in the session: copies the rest; with only archived ones: `empty_workout`.
- Check: `npm run db:generate` leaves `src/db/migrations` unchanged.

### 3. Exercises feature (`src/features/exercises/`)
- `catalogList.ts` (+ tests): `groupByCategory(exercises)` → `{ title, data }[]` in `CATEGORIES` order, empty categories left out (the logic now inline in the picker).
- `hooks.ts`: `useExercises({ search, category })` (through `useDataVersion`, then `listExercises`, then `groupByCategory`), `useExercise(id)` (`getExercise`, `undefined` when unknown or archived).
- `mediaFiles.ts`: `storeMedia(picked)` (copies into `<documents>/exercise-media/`, returns the new URI; a copy failure becomes `DomainError('media_not_saved')`, message "Couldn't save the media. Try another file.") and `deleteMedia(uri)` (only inside that folder; a failure is ignored).
- `seedMedia.ts`: the predefined exercises' bundled files by seed key (empty until the files arrive), and `exerciseMedia(exercise)`: the media to show, from `seedMedia` for a predefined exercise and from `mediaUrl` for a custom one, or `undefined`. Test: the list matches `assets/exercises/`, every key is a seed key, every extension is supported.
- `actions.ts`: `createExercise(input, media?)`, `updateExercise(id, input, media: keep / remove / replace)`, `deleteExercise(id)`, through `run`, handling the files as in "Media", plus `exerciseUsage(id)` (a read, for the confirmation: `countWorkoutsUsingExercise`, no notify). Tests against `createTestDb()`, as in `history/actions.test.ts`: one notification on success, and a `DomainError` comes back as a reason and doesn't notify.
- `src/features/workout/actions.ts`: `templateUpdateCandidate` compares without the archived exercises (see the decisions). Tests in `actions.test.ts`: the difference is only an archived exercise → no question; a real difference plus an archived exercise → still asked.

### 4. Components
- `src/components/ChipRow.tsx` (+ test): a horizontally scrollable row of single-select chips (`options: { value, label }[]`, `value`, `onChange`, and an optional `disabled`), each chip at least 48 dp (`touch.min`), selected one in the accent color, `accessibilityRole="radio"` with `accessibilityState.selected`. Used by the Exercises tab (with an "All" option) and by the form (category, tracking type).
- `ListItem` gains a `left` slot (the thumbnail).
- `src/features/exercises/MediaView.tsx` (+ test): one media at a given size, still or playing (image; GIF through `expo-image`; video through a thumbnail when still and a muted looping `VideoView` when playing), the placeholder when there is none or it fails to load. the row's 64 dp square and the detail's large block use it.
- `src/features/exercises/ExerciseRow.tsx`: the list row (a `ListItem` with the thumbnail and the "Custom" marker, holding it plays the thumbnail), shared with the picker (which passes its own `rightIcon="add"`).

### 5. Exercises tab (`app/(tabs)/exercises.tsx`)
- Search, chips, the `SectionList` (with `ExerciseRow`), the header "New" button, the "No exercises found" state. The subtitle counts the whole catalog, with singular/plural. A row → `/exercise/<id>`. Keyboard: `keyboardShouldPersistTaps="handled"`, like the picker.

### 6. Exercise detail (`app/exercise/[id].tsx`)
- Registered on the root `Stack`. As in the decisions: header, ⋮ menu, media, description, the predefined note.
- Edit → `/edit-exercise?exerciseId=<id>`. Delete → confirmation (with `exerciseUsage`) → `deleteExercise` → back. A failure shows an `Alert` with `reasonMessage`.
- "Exercise not found" for an unknown or archived id. Nothing is rendered once it's deleted while mounted.

### 7. Create / edit form (`app/edit-exercise.tsx`)
- The fields and rules from the decisions. The initial values come from `?exerciseId` (a custom exercise; a predefined or unknown one shows "Exercise not found"), or the defaults. `Screen` with `keyboardAvoiding`. The media field opens the gallery through `pickedMedia`; nothing is copied until Save. Save → `createExercise` / `updateExercise` → on success, back; on failure the reason shows under the form.
- Registered on the root `Stack` with the same slide-from-bottom animation as `edit-workout`.

### 8. Picker (`app/add-exercise.tsx`)
- Uses `useExercises` (so it follows the data version), `groupByCategory` and `ExerciseRow`. The header gets the "New exercise" button. The existing tests (`active-workout`, `routines`) must pass as they are, apart from anything that depended on the picker not following the version.

### 9. Flow tests (`__tests__/exercises.test.tsx`)
Same setup as `history.test.tsx` and `routines.test.tsx`. `afterEach` deletes what the test created (custom exercises through the DB, templates, sessions) and notifies. The DB is asserted directly. The gallery and the file copy are mocked (`expo-image-picker`, `expo-file-system`), as are `expo-video` and `expo-image`, which have no native side in Jest. Separate tests for:
- The tab lists the seeded exercises grouped by category, with the count in the subtitle. Search narrows it (case-insensitive, the subtitle keeps the total) and "No exercises found" shows with no match. A category chip filters to that category, "All" clears it, and search and chip combine.
- Every row shows a thumbnail or the placeholder; holding a row plays it and doesn't open the detail, a tap does.
- A predefined exercise's detail shows its description, the placeholder, the "Predefined exercise" note and no menu.
- Create: an empty name is refused (the message shows, the screen stays); a video over 30 s and an unsupported file are refused at pick time; a valid one is saved with category, tracking type, description and media (copied into the app's folder), and the user lands back on the list with it there.
- Edit: name, category, description and media change (replace and remove delete the old file) and the detail shows them; the tracking type is locked. An exercise used by a finished session: the history still shows the old name after the rename. A template that uses it shows the new name.
- Media: an image, a GIF and a video each show in the row and in the detail; no media shows the placeholder.
- Delete: cancel changes nothing. Confirm → the media file is deleted, back to the list, the exercise is gone from the list and the picker, removed from the template that used it (the confirmation said "1 workout"), and finished sessions still show it. A template left with nothing reads "No exercises".
- The picker: "New exercise" → form → Save → back in the picker with the new exercise listed, not added to the session. Picking it then adds it (as for any exercise, with the mode question for a shooting one).
- Finish with "Update template" after the exercise was deleted mid-session: no question when that is the only difference; the rest of the structure is offered otherwise, and copies without the deleted exercise.
- `active-workout.test.tsx`, `routines.test.tsx`, `history.test.tsx` and `shell.test.tsx` still pass.

### 10. Check on the phone (Expo Go)
- Browse the catalog: the sections, the chips, the search (including the keyboard: the list stays tappable while it's open). Open a few predefined exercises: description, placeholder, the read-only note.
- Create a shooting and a check exercise, with an image, a GIF and a short video from the gallery: the row shows a still thumbnail, holding it plays in place, the detail plays it larger. A video over 30 s is refused. Airplane mode changes nothing.
- Edit one (change and remove its media), delete a custom one that is inside a template: the confirmation names the workout count, the template loses it and still saves, the history keeps the old name.
- Create an exercise from the picker while building a template and add it.
- Feedback from this check is written at the end of this file ("Results"), and changes are made before the commit, as in Phases 3 to 5.

### 11. CI and phase commit
- Run the full CI list locally (`lint`, `format:check`, `typecheck`, `test`, `db:generate` + clean `git status` on `src/db/migrations`, `npx expo-doctor`).
- Update `CLAUDE.md`: project state (the `exercise/[id]` and `edit-exercise` routes, the Exercises tab, `src/features/exercises/`, `ChipRow`, the media rule: local files only, picked from the gallery for custom exercises, bundled for predefined ones; still thumbnail in rows, played on hold and in the detail; "deleting a custom exercise archives it and removes it from templates; history keeps its snapshot; tracking type can't change") and current status (Phase 6 done, next: write `phase-7.md`).
- `PLAN.md`: already edited in the working tree (the exercise's media, Phase 6's lines, the offline media risk). It rides in the phase commit, as the Phase 5 change did.
- One commit: "Phase 6: exercise catalog". Push and confirm CI is green. Tick the checklist.

## Final checklist

- [x] `npm run lint`, `format:check`, `typecheck`, `test` and `npx expo-doctor` pass locally, and `db:generate` leaves the migrations unchanged.
- [x] `validateMediaUri`, `mediaKind`, `pickedMedia`, `groupByCategory`, `ChipRow`, `MediaView` and the seed media list have unit tests.
- [x] Repository tests cover the media field, `countWorkoutsUsingExercise`, the archive removing the exercise from templates (and leaving sessions alone), `saveWorkout` working again on such a template, and `overwriteWorkoutFromSession` skipping archived exercises.
- [x] Flow tests cover browse, search, chips, thumbnails and hold-to-play, the predefined detail, create, edit, media, delete (confirmed and cancelled), the picker's "New exercise" and the update-template case, asserting the DB.
- [x] On the phone (Expo Go): any exercise can be found and read, a custom one can be created (also from the picker), edited, deleted and used in templates, and its media shows in the list (played on hold) and in the detail, or the placeholder.
- [ ] CI is green on `main`.

## Results

### On-phone check, first pass (2026-09-28): feedback

- **Media is not what was wanted.** Instead of a link, every exercise should have a slot for one **main media**: an image, a GIF or a short video. It must show **in the exercise list, next to the name**. Every exercise shows one: when it has no media, a placeholder takes its place.
- **Drop Duplicate.** Copying an existing exercise isn't needed.

Decided with the developer, then made before the phase commit (the decisions and steps above are already rewritten):

- Media comes from the **phone's gallery** (image, GIF or video up to 30 s), copied into the app's storage, so it works offline. Four packages installed with approval: `expo-image-picker`, `expo-file-system`, `expo-video`, `expo-image` (the next APK needs a new build).
- Media is **optional**: an exercise without one shows a placeholder.
- **Predefined exercises have media that the user can't change**: files bundled from `assets/exercises/<seedKey>.<ext>`, supplied by the developer over time; placeholder until then.
- Rows show a **still** thumbnail (image, or first frame of a GIF or video); the media plays **in place, at the same size, while the row is held** (like a YouTube thumbnail on hover), and larger in the detail. Reading of "touching the row starts the media": a hold plays it, a quick tap keeps opening the detail (or adding, in the picker). To be confirmed in the second check.
- **Duplicate removed** (menu option, the `?from` param, `copyName`).

Done (2026-09-28): all of the above, plus a hint on rows that have media ("Hold to play its media"); the thumbnail and placeholder are decorative for accessibility. `assets/exercises/` exists with a `README.md` saying how to add the predefined media. 438 tests; `lint`, `format:check`, `typecheck`, `expo-doctor` pass and `db:generate` changes nothing.

### On-phone check, second pass (2026-09-28): feedback

- Media is shown square and cropped in the list, and a video opens in its own (vertical) format in the detail: observed, and **as intended**, no change.
- **A saved video's thumbnail didn't show**, only the placeholder. Cause: expo-video builds the first frame from the file's path by only stripping `file://`, without decoding the URI; expo-file-system hands out encoded URIs, and in Expo Go the app's folder name contains a `%` (`%2540jarmenio%252F…` in the URI), so the file wasn't found. Fix: `thumbnailSource` decodes the path before asking for the frame (a no-op on the APK's plain paths), and if the frame still can't be made, the row shows a paused player's first frame instead of the placeholder. Tests for both.
- **Thumbnails a bit bigger in the list**: 48 → 64 dp.

440 tests; all CI checks pass locally.

### On-phone check, third pass (2026-09-28)

- **Everything works** (the video thumbnail and the new size included).
- Asked: a **Custom** filter next to the other chips. Added as the second chip (All, Custom, categories), single select like the rest: `listExercises` gained `customOnly`; with no custom exercise the list says "No custom exercises yet". Repository and flow tests added (443 tests, all CI checks pass locally).
- Then: **a moving finger stops the hold preview (known issue, left for Phase 7).** Holding a video plays it, but moving the finger a little while still holding the row stops it. Tried: while the preview plays, the list gets `scrollEnabled={false}` and the row `cancelable={false}` (on the guess that a starting scroll takes the touch away from the row and fires its `onPressOut`). **It didn't work on the phone**, so it was reverted. The developer judged it not worth stopping for; it's tracked in PLAN.md's Phase 7. Leads for then: find out what actually ends the press (log `onPressOut` with the move distance: the scroll, or Pressability's own "moved outside the press rect / too far" logic); drive the preview with gesture-handler's `Gesture.LongPress()` (its `maxDistance` sets how far the finger may move) or a `Gesture.Manual`, alongside the list's native scroll, instead of the `Pressable`'s long press.

Next: the phase commit (with the issue above left open).
