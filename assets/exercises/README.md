# Predefined exercises' media

One file per predefined exercise, named after its seed key (see `src/db/seed/exercises.ts`):
`free_throws.gif`, `mikan_drill.mp4`, `figure_8.jpg`…

Supported: `jpg`, `jpeg`, `png`, `webp` (image), `gif`, and `mp4`, `mov`, `webm`, `3gp` (video,
30 s at most). Keep the files small: they ship inside the APK.

After adding a file, add its line to `src/features/exercises/seedMedia.ts`; `npm test` says which
one is missing. The user can't change these media.
