# Backlog

Pending items that sit outside the phases in `docs/plan/`: known issues left open, content still
to come, and ideas for after v1. Each item says where it came from.

## Known issues

- **Hold-to-play preview stops when the finger moves** (Phase 6 phone check). In the exercise list
  (Exercises tab and picker), holding a row plays its media in place, but moving the finger a
  little while still holding the row stops it. Tried and reverted, since it didn't work on the
  phone: turning off the list's `scrollEnabled` and the row's `cancelable` while the preview plays.
  Leads: log `onPressOut` with the move distance to learn what ends the press (the list's scroll,
  or Pressability's own "moved outside the press rect / too far" logic); drive the preview with
  gesture-handler's `Gesture.LongPress()` (its `maxDistance` sets how far the finger may move) or a
  `Gesture.Manual`, alongside the list's native scroll, instead of the `Pressable`'s long press.
  Code: `src/features/exercises/ExerciseRow.tsx`.

## Content

- **Media for the 38 predefined exercises** (Phase 6), supplied by the developer. One file per
  exercise in `assets/exercises/<seedKey>.<ext>` (image, GIF, or video up to 30 s, kept small since
  it ships in the APK) plus its line in `src/features/exercises/seedMedia.ts`; `npm test` names a
  missing line. Until then they show the placeholder.
- **Images for the 6 category cards** (Phase 9), supplied by the developer. One image per card of
  the Exercises tab in `assets/categories/<key>.jpg` (`finishing`, `ball_handling`, `dribbling`,
  `shooting`, `footwork`, `custom`; jpg, png or webp, about 800 px wide) plus its line in
  `src/features/exercises/categoryImages.ts`; `npm test` names a missing line. Until then the cards
  show the placeholder.

## Post-v1 (optional)

From `PLAN.md`'s former backlog section and the phases' out-of-scope lists.

- "Previous" column showing the last performance per exercise during the active workout.
- Session duration and rest timers (the summary shows the duration, computed once).
- FG% progress charts per exercise / category, and stats over the history (personal bests, search,
  filters).
- Reps / time tracking types for non-shooting drills.
- Shot-zone tracking (court map), shot-type tags (free throws, 3PT).
- Fine-grained "update template" (a diff instead of the full overwrite).
- Drag & drop reordering for what still only has Move up / Move down: the workouts inside a
  routine (`WorkoutCard`'s menu). Routines themselves (`DraggableRoutineList`) and a template's
  exercises (`DraggableExerciseList`) already drag since Phase 9.
- **JSON export / import backup**, asked for 2026-09-30 after Phase 9's Profile/Settings work: a
  real APK with months of history is now on the phone, Android Auto Backup (`PLAN.md`'s accepted
  risk) is a best-effort fallback at most — its default 25 MB quota and its own schedule (wifi,
  charging, idle) leave it unverified for whether it actually restores the profile photo and
  exercise media files alongside the SQLite DB, and it never gives someone their own copy of their
  data — and `app/settings.tsx` is empty and the obvious place to put this. Shape it like an
  exercise's or the profile's media handling (`copySync` through `expo-file-system`, actions in
  their own `actions.ts`): "Export backup" writes one JSON file (the DB tables plus the profile
  name, with the photo and exercise media files either inlined as base64 or referenced by relative
  path next to it) to `<documents>/backups/`, then hands it off with `expo-sharing`'s `shareAsync`
  (not installed yet); "Import backup" picks a file with `expo-document-picker` (not installed yet)
  and replaces the local data in one transaction, confirmed first since it's destructive. Export is
  the smaller, safer half and could ship alone; import can follow once export is used for a while.
- Cloud sync / multi-device (would call for stable ids, e.g. UUIDs, instead of the autoincrement
  ones).
