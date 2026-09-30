# Category card images

The background of each card on the Exercises tab, one per card, named after its key:
`finishing`, `ball_handling`, `dribbling`, `shooting`, `footwork` and `custom` (the user's own
exercises), e.g. `shooting.jpg`.

Supported: `jpg`, `jpeg`, `png`, `webp`. The card is half the screen wide and 120 dp tall, and
crops the image to fill it: about 800 px wide is plenty. Keep the files small: they ship inside
the APK.

After adding a file, add its line to `src/features/exercises/categoryImages.ts`; `npm test` says
which one is missing. A card with no image shows the placeholder.
