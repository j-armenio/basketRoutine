# Backlog

The **only** place for work left for later: deferred features, known issues, polish, ideas. Plan
docs (`PLAN.md`, `phase-N.md`) and `CLAUDE.md` describe what exists and what was decided; they
point here instead of carrying their own to-do lists. When a phase is planned, pick its items from
this file into its `phase-N.md` and delete them here; when something is deferred, add it here.

Each item says where it came from.

## Phase 7 — polish, testing & release

Phase 7 of `PLAN.md` is built from this section.

- **Hold-to-play preview stops when the finger moves** (known issue, Phase 6 phone check). In the
  exercise list (Exercises tab and picker), holding a row plays its media in place, but moving the
  finger a little while still holding the row stops it. Tried and reverted, since it didn't work on
  the phone: turning off the list's `scrollEnabled` and the row's `cancelable` while the preview
  plays. Leads: log `onPressOut` with the move distance to learn what ends the press (the list's
  scroll, or Pressability's own "moved outside the press rect / too far" logic); drive the preview
  with gesture-handler's `Gesture.LongPress()` (its `maxDistance` sets how far the finger may move)
  or a `Gesture.Manual`, alongside the list's native scroll, instead of the `Pressable`'s long
  press. Code: `src/features/exercises/ExerciseRow.tsx`.
- **FG% coloring**: success/danger by FG% on set rows, exercise totals, the Finish summary, and the
  History list and detail. Thresholds to decide. (Asked for after the first court session, Phase 3;
  History part from Phase 5.)
- **UX polish**: empty states, haptics, a full accessibility pass over every screen (the screens
  already have labels), final app icon and splash art (the template's placeholders are still in).
  (Phases 0, 2, 3, 6.)
- **Performance check on the phone**: a long active session (saving on every keystroke re-reads the
  session; if it lags, read per exercise card instead) and a long history (hundreds of sessions).
  (Phases 3, 5.)
- **E2E tests** of the main flow: create routine → start → log → finish → history. (Phase 0 plan.)
- **`production` build profile** in `eas.json`, for the v1.0 release APK. (Phase 0.)

## Content

- **Media for the 38 predefined exercises**: to be supplied by the developer. One file per exercise
  in `assets/exercises/<seedKey>.<ext>` (image, GIF, or video up to 30 s, kept small since it ships
  in the APK) plus its line in `src/features/exercises/seedMedia.ts`; `npm test` names a missing
  line. Until then they show the placeholder. (Phase 6.)

## Post-v1 (optional)

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
