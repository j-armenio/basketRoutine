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

## Post-v1 (optional)

From `PLAN.md`'s former backlog section and the phases' out-of-scope lists.

- "Previous" column showing the last performance per exercise during the active workout.
- Session duration and rest timers (the summary shows the duration, computed once).
- FG% progress charts per exercise / category, and stats over the history (personal bests, search,
  filters).
- Reps / time tracking types for non-shooting drills.
- Shot-zone tracking (court map), shot-type tags (free throws, 3PT).
- Fine-grained "update template" (a diff instead of the full overwrite).
- Drag & drop reordering (routines, workouts and template exercises move with Move up / Move down
  now).
- JSON export / import backup.
- Cloud sync / multi-device (would call for stable ids, e.g. UUIDs, instead of the autoincrement
  ones).
