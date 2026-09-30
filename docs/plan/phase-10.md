# Phase 10 — Testing & Release (detailed plan)

Detailed plan for Phase 10 of [PLAN.md](PLAN.md).

**Goal:** close v1.0. Three pieces of work, in this order: **E2E tests** of the main flow driven on the phone, against a **separate test install** (its own application ID, so its own data), so the real data is never touched; a **performance check** on that same install with a long history and a long session, measured against budgets written down before measuring; and the **v1.0 release**: an APK built from the tagged phase commit, installed **over** the Phase 5 APK, keeping its data, then used in a real training session. The app itself gets no new feature and no schema change, unless the performance check calls for an index (see the decisions).

**Done when:** the Maestro flows pass on the phone against the test install, three runs in a row; the performance budgets are met (or the misses are fixed and measured again); `lint`, `format:check`, `typecheck`, `test` and `expo-doctor` pass, `db:generate` leaves the migrations unchanged (or adds only the planned index migration), and CI is green on the phase commit. Part B: the v1.0 APK is installed over the Phase 5 APK without uninstalling, the data logged before is still there, and it has been used in a real training session. Part B is tracked separately, like Phases 3 and 5, so an EAS problem can't hold up Part A.

## Decisions for this phase

| Topic | Decision |
|---|---|
| E2E tool | **Maestro**. Flows are YAML files, it drives a release APK already installed on the phone through `adb` (no native test code, no change to the build), it finds elements by their text, accessibility label or `testID` (which React Native exposes as the Android `resource-id`), and it can clear the app's data (`clearState`) and kill and relaunch it (`stopApp` / `launchApp`), which the resume flow needs. Detox was the alternative: it needs a debug build with its own native test runner, an emulator in practice, and far more setup for three flows. |
| Separate test install | An **app variant** chosen at build time by `APP_VARIANT=e2e`, in a new `app.config.ts` that starts from `app.json` and changes only what the variant needs: `android.package` `com.jarmenio.basketroutine.e2e` (a separate app on the phone, so a separate database and file storage), `name` "Basket Routine E2E" (so the two icons can be told apart on the launcher), `scheme` `basketroutine-e2e` (so a link never opens the wrong app), `android.allowBackup: false` (test data stays out of the phone's Google backup), and `extra.appVariant: 'e2e'`. Without `APP_VARIANT`, the config is exactly `app.json`'s: a unit test checks the default package is still `com.jarmenio.basketroutine` (immutable, see `CLAUDE.md`). `app.json` stays the source of every other value. |
| Keeping the real app safe | Maestro's `clearState` wipes the data of whatever app the flow names. Every flow's `appId` is the E2E package, and a Jest test reads every file in `.maestro/` and fails if any flow's `appId` is not `com.jarmenio.basketroutine.e2e`, if the real app's package (`com.jarmenio.basketroutine` not followed by `.e2e`) appears anywhere, or if the real app's scheme (`basketroutine://`, which an `openLink` would open in the real app) appears anywhere. |
| E2E build | A new `e2e` profile in `eas.json`: `extends: "preview"` plus `env: { "APP_VARIANT": "e2e" }` (so a release APK, like the one used on the court, which is what the performance check needs). EAS keeps a separate keystore and `versionCode` for the new package; its keystore is throwaway (no backup needed, nothing on the phone depends on it). Built **from the terminal** (`npx eas-cli@latest build -p android --profile e2e`), since it's needed before the phase commit and the "Build APK" workflow builds the pushed code; the workflow stays `preview`-only. Installed with `adb install -r`. |
| What the E2E flows cover | Three flows, each starting from a clean install (`launchApp` with `clearState: true`), so they don't depend on each other or on order: **main** (create routine → new workout with a shooting drill and a check drill → Save → Start → log → Finish → summary → History row → detail), **resume** (log a value, kill the app, relaunch: the Resume banner and the value are there, Discard clears it), **rollback** (an invalid value — more makes than the fixed attempts — rolls back to the value the cell had at focus when the keyboard hides). They check what the user sees, not the DB. No flow picks from the gallery (media is checked by hand on the APK, Part B). |
| Selectors | Text and accessibility labels first; they already exist on every control (`expectAccessibleControls`). A `testID` is added only where a label repeats on screen and Maestro can't tell the elements apart (the set cells: "Set 1 makes" appears once per exercise card, and so does the existing `testID` `set-1` on the set row), e.g. a `testID` on the exercise card so a flow can scope to it with `childOf`. Before any E2E build, `maestro hierarchy` against Expo Go confirms each new `testID` shows up as a `resource-id` (a selector that only fails on the APK costs a new EAS build). No behavior or look changes. |
| E2E in CI | No: CI has no phone, and an emulator on GitHub Actions is slow and flaky for a personal project. The flows run by hand (`npm run e2e`) on the phone. Jest and CI stay as they are, plus the `appId` guard test. |
| Performance data | "Long" means a few years of use: a **long history** of **500 finished sessions** over the last 24 months (~6 exercises × 5 sets each, ~15 000 sets, shooting drills in both modes and check drills, a few empty sets and notes) and a **long session** in progress with **15 exercises × 10 sets**, half of them logged. Generated by a deterministic function (a seeded PRNG, so every run builds the same data) through the repositories, with `startedAt` / `finishedAt` then set directly, like the Phase 5 flow tests. Each load runs in **one outer transaction** (the repositories' own transactions become savepoints inside it, since a transaction is a `Db`): on the phone, tens of thousands of separate commits would take minutes, and a failure halfway would leave half a history. It uses the seed catalog only. |
| Loading that data on the phone | A **dev tools** screen, `app/dev-tools.tsx`, only in the E2E variant: two buttons, "Load long history" and "Load long workout", each through `src/features/devTools/actions.ts` (every write goes through an `actions.ts`). In the real app the route redirects to `/` before rendering anything, and nothing links to it. It's opened with `adb shell am start -d basketroutine-e2e://dev-tools` (or a Maestro `openLink`). A route that exists but does nothing in the real app is simpler than excluding a file route at build time. |
| Performance budgets | Measured on the target phone, on the E2E release APK loaded with the data above, **written down before measuring**: cold start to a usable Workout tab ≤ 2 s (after `adb shell am force-stop`, never the first launch after an install, which also runs the migrations and the seed); History tab first open ≤ 1 s, and back to it after a write (the focus gate's catch-up) ≤ 1 s; session detail and exercise detail ("Your stats" over 500 sessions) open ≤ 1 s; typing ten quick digits into set cells of the long session: every digit shows up on the screen recording with no frame where it's still missing after the next key, and ≤ 10 % janky frames over the typing; scrolling History, Exercises and the long session with ≤ 10 % janky frames. Cold start is timed with `adb shell am start -W` (first frame) plus a screen recording (until the tab is usable, since the splash waits for migrations and fonts); jank with `adb shell dumpsys gfxinfo <package>` (reset, scroll, read "Janky frames"); the rest with the screen recording. |
| When a budget is missed | Profile before changing anything (the React DevTools profiler in Expo Go with the same data, or timing logs around the query and the render). Suspects known from the code: History reads every finished session with its sets on focus (`listFinishedSessionsWithExercises`), and so does the FG% chart; each keystroke in the active workout bumps the data version and re-reads the whole session; "Your stats" reads every result of an exercise. The fix is the smallest one that meets the budget (memoizing, reading less, a list's `initialNumToRender` / `windowSize`), with tests. A new **index** is the one schema change allowed: generated by `db:generate` as a new migration (append-only policy), tested with `createTestDb()`, and it reaches the phone with v1.0. v1.0 would then be the first APK to run a migration on the real data, so the fixed E2E APK is installed with `adb install -r` **over** the E2E install still holding the long history: the migration runs on 500 sessions there first. Anything larger goes to `docs/backlog.md` and is decided with the developer. |
| Version | `app.json`'s `version` is already `1.0.0` (the Android `versionName`); `versionCode` stays remote and auto-incremented by EAS. The release is the phase commit tagged **`v1.0.0`**. |
| Release build profile | The existing `preview` profile, from the "Build APK" workflow, run with the `v1.0.0` tag selected in "Use workflow from" (the workflow checks out the ref it's run on; left on `main`, it would build whatever `main` holds). Phase 0 and 7 listed a `production` profile for this phase; it would be a copy of `preview` (same APK type, same package, same keystore, same distribution), since the app is sideloaded and never goes to the Play Store. The tag, not the profile, marks the release. |
| Installing v1.0 | Over the Phase 5 APK, **never uninstalling** (that wipes the data). If Android refuses the update, stop, write down the error and decide the next step before doing anything. v1.0 is the first APK with the code of Phases 6–9, so its on-phone check covers what only an APK shows: the final logo (launcher icon under the phone's mask, themed icon, splash), media picked from the gallery (the path fix is a no-op on the APK), haptics, fonts. |
| Feedback after v1.0 | From the training session: a bug is fixed and released as `v1.0.1` (a fix-up commit, a new tag and APK); anything else goes to `docs/backlog.md`. The "nothing beyond the planned phases until v1.0" rule (PLAN risks) ends with this phase, and the backlog opens. |

## Out of scope

- Running E2E in CI, or on an emulator.
- E2E flows for the catalog, custom exercises, media, template reordering or deleting routines: they're covered by the Jest flow tests, and the media only by hand.
- Performance work beyond meeting the budgets (no pagination of History unless a budget calls for it, and then only after asking).
- A `production` build profile, the Play Store, an AAB.
- Backup / export (post-v1, backlog).
- Anything in `docs/backlog.md`, including the hold-to-play known issue.

## Tools

Nothing is installed without asking first. The Mac has none of these yet (checked: no Java runtime, no `adb`, no Maestro).

| Tool | What it does | Where it runs |
|---|---|---|
| JDK 17 (`brew install openjdk@17`) | Java runtime Maestro needs | Local machine, Homebrew |
| Android platform-tools (`brew install --cask android-platform-tools`) | `adb`: talks to the phone over USB or Wi-Fi (install the APK, launch, record the screen, frame stats) | Local machine, Homebrew |
| Maestro CLI (`curl -Ls "https://get.maestro.mobile.dev" \| bash`) | Runs the E2E flows on the phone | Local machine, `~/.maestro` |
| `eas-cli` | Builds the E2E APK | `npx eas-cli@latest`, as in Phase 0; nothing global |
| Phone: developer options, USB debugging (or wireless debugging) | Lets `adb` and Maestro reach the phone | Phone settings; turned off again at the end if the developer wants |

No npm package is added: the flows are YAML, and the data generator uses the existing repositories.

## Steps

### Part A — E2E tests and performance check

### 1. Tools and phone setup
- Ask for approval, then install JDK 17, platform-tools and Maestro.
- Turn on developer options and USB debugging on the phone, connect it, accept the key prompt.
- Check: `adb devices` lists the phone, `maestro --version` prints a version.

### 2. App variant (`app.config.ts`)
- `app.config.ts` exports `({ config }) => …`: with `process.env.APP_VARIANT === 'e2e'` it returns `config` with the changes listed in the decisions; otherwise `config` unchanged. `android` and `extra` are merged field by field (`{ ...config.android, package, allowBackup }`, `{ ...config.extra, appVariant }`): a shallow spread would drop `adaptiveIcon`, `extra.eas.projectId` and `extra.router`.
- `src/appVariant.ts`: `isE2EVariant()`, reading `Constants.expoConfig?.extra?.appVariant`.
- Tests (`app.config.test.ts`, called with `app.json`'s `expo` as `config`): without the variable, the result deep-equals `app.json`'s config (the package is `com.jarmenio.basketroutine`); with `e2e`, it deep-equals `app.json`'s config with the five changes applied, so a lost field fails the test.
- Check: `npx expo config --type public` prints the real app's config; `APP_VARIANT=e2e npx expo config --type public` prints the E2E one; `npx expo-doctor` still passes.

### 3. Performance data (`src/db/seed/perfData.ts`)
- `seedLongHistory(db, { sessions, months, now, seed })` and `seedLongSession(db, { exercises, sets, seed })`, as in the decisions: each in one outer `db.transaction((tx) => …)` that calls the repositories with `tx` (`startEmptySession`, `addSessionExercise`, `addSessionSet`, `updateSessionSet`, `finishSession`), then sets the dates directly; a small seeded PRNG (mulberry32, a few lines) inside the file.
- Both refuse to run while a session is in progress, since `startEmptySession` already throws `session_in_progress_exists`. So the long history is loaded first and the long workout second (step 8); in the other order the history button shows that reason.
- Tests against `createTestDb()` (`@jest-environment node`), with small numbers: the right count of finished sessions, all inside the date range and newest `startedAt` ≤ `now`; the same seed builds the same data; every session passes the domain rules (makes ≤ attempts, at least one exercise); the long session has the asked shape, in progress; `seedLongHistory` with a session in progress throws `session_in_progress_exists` and adds nothing.
- The load time is measured on the phone, not in Jest (better-sqlite3 in memory on the Mac says nothing about the phone's disk): the dev tools `Alert` shows it (step 4). It should take seconds; if it takes minutes even in one transaction, profile before going on.

### 4. Dev tools screen (E2E variant only)
- `src/features/devTools/actions.ts`: `loadLongHistory()` and `loadLongWorkout()`, through `run` (one notification each).
- `app/dev-tools.tsx`: `Screen` titled "Dev tools", the two buttons (disabled while running, then an `Alert` with how many sessions were added and how long it took, or the reason on failure). The load is sync and blocks the JS thread, so the press sets the running state first and starts the load in a `setTimeout(…, 0)`: otherwise React never draws the disabled state before the load ends. Not in the real app: `isE2EVariant()` false → `<Redirect href="/" />`. Registered on the root `Stack`.
- Tests (`__tests__/devTools.test.tsx`, `renderRouter`, `isE2EVariant` mocked): in the E2E variant the buttons load the data (DB asserted with small sizes, the generator mocked to them) and `expectAccessibleControls` passes; in the real variant `/dev-tools` lands on `/`.
- Check in Expo Go with `APP_VARIANT=e2e npx expo start`: the screen opens from Expo Go's own link (`exp://<mac-ip>:8081/--/dev-tools`, since the custom scheme only exists on an APK) and loads the data (Expo Go's data is separate from the installed app).

### 5. Selectors
- Walk the three flows in Expo Go and list every element a flow must tap or read. Where a label repeats on screen, add a `testID` (e.g. the exercise card in the active workout and the template editor) so a flow can scope with `childOf`; the existing `set-<n>` row `testID` repeats per card too, so it's only used scoped. Existing Jest tests keep passing; nothing visible changes.
- Check with `maestro hierarchy` while Expo Go shows each screen: every new `testID` appears as a `resource-id`, and scoping with `childOf` picks the right card. Only then build the E2E APK (step 7).

### 6. Maestro flows (`.maestro/`)
- `main.yaml`, `resume.yaml`, `rollback.yaml`, as in the decisions, each with `appId: com.jarmenio.basketroutine.e2e` and `launchApp: { clearState: true }` first. Main, in detail: create routine "E2E Routine" → new workout "Shooting Day" → add "Form Shooting" (or another seed shooting drill) in attempts mode and one check drill → two sets each, targets set on the shooting drill's sets (a check drill has no target) → Save → Start → log makes on both shooting sets and check one set → Finish Workout → the summary shows the makes, attempts and FG% expected from the logged values → History tab: one row with that FG% → the detail shows the same sets.
- Resume: Start Empty Workout → add a shooting drill → log a value in "Set 1 makes" (saved on the keystroke) → `stopApp` → `launchApp` (no `clearState`) → the Resume banner is there → Resume → the active workout shows the value → back to the tabs → the banner's "Discard" → the confirmation's "Discard" (the "Discard workout?" alert) → the banner is gone.
- Rollback: Start Empty Workout → add a shooting drill in attempts mode (attempts fixed at the default 10, the user logs makes) → "Set 1 makes": type `7` → `hideKeyboard` → the cell shows 7 → "Set 1 makes" again: `eraseText`, type `12` (the `1` is saved on its keystroke, `12` is refused) → `hideKeyboard` → the active workout is still on screen (Maestro's `hideKeyboard` presses back on Android; if the keyboard had already closed, that back would leave the screen) → the cell shows **7**, the value it had at focus, not the intermediate `1`.
- `package.json`: `"e2e": "maestro test .maestro/"`.
- `__tests__/maestroFlows.test.ts` (`@jest-environment node`, reads the files with `fs`, no YAML package): every flow `.yaml` in `.maestro/` has `appId: com.jarmenio.basketroutine.e2e`, and no file contains the real package (`com.jarmenio.basketroutine` not followed by `.e2e`) or `basketroutine://` (the safety guard from the decisions). A Maestro workspace `config.yaml`, if one is added, has no `appId` and is skipped by the first check only.
- The YAML goes through Prettier like the rest (`format:check`).

### 7. Run E2E on the phone
- Build the E2E APK from the terminal (`npx eas-cli@latest build -p android --profile e2e`), download it and `adb install -r` it. Both apps are on the phone, side by side.
- `npm run e2e`: all three pass. Then two more full runs: three green runs in a row, so a flaky step shows up now, not later. A flaky step is fixed with a wait on what the screen shows (`extendedWaitUntil`), never a fixed sleep.
- Open the real app afterwards: its data is untouched.

### 8. Performance check (E2E install)
- Open dev tools, "Load long history", then "Load long workout" (in that order: the history load refuses while a session is in progress). Write down both load times from the `Alert`.
- Measure each budget from the decisions, with the commands listed there, and write the numbers in "Results" as a table (budget, measured, pass/miss).
- A miss → profile, fix (see the decisions), rebuild the E2E APK, install it with `adb install -r` over the loaded E2E install (not after a `clearState`), and measure again. A fix gets its tests; if it's an index, `db:generate` adds the migration, CI's in-sync check covers it, and the reinstall over the long history is its upgrade test: the app opens, History shows the 500 sessions, the long workout is still in progress.
- Run the E2E flows once more if anything was changed.

### 9. CI and phase commit
- Run the full CI list locally (`lint`, `format:check`, `typecheck`, `test`, `db:generate` + clean `git status` on `src/db/migrations`, `npx expo-doctor`).
- `README.md`: a "Testing on the phone (E2E)" section (the tools, the E2E build and install, `npm run e2e`, the dev tools link, "the real app is never touched"), and v1.0.
- `CLAUDE.md`: project state (`app.config.ts` and the E2E variant, `.maestro/`, the dev tools route, `perfData.ts`, the `e2e` profile), current status (Phase 10 Part A done).
- One commit: "Phase 10: E2E tests and performance check". Push and confirm CI is green. Tick Part A's checklist.

### Part B — v1.0 release

### 10. Build and install v1.0
- Tag the phase commit `v1.0.0` and push the tag.
- Run the "Build APK" workflow (`preview`) with the `v1.0.0` tag selected in "Use workflow from", not `main`.
- Install it **over** the Phase 5 APK, without uninstalling (see the decisions if Android refuses).
- On the phone: the sessions logged before are in History with their values; the app info shows version 1.0.0; the launcher icon looks right under the phone's mask, and as a themed icon if the phone uses them; the splash shows the logo on the dark background with no white flash; a custom exercise gets a video from the gallery and its thumbnail shows in the list; a set delete fires the haptic.

### 11. Real training session
- Use v1.0 for a full training session on the court, from a template.
- Write the feedback in "Results": bugs are fixed and released as `v1.0.1` (fix-up commit, new tag, new APK over v1.0); everything else goes to `docs/backlog.md`.
- Update `CLAUDE.md` (v1.0 installed, Phase 10 done) and tick the checklist, in its own small commit ("Mark v1.0 as released"), like Phase 5's Part B.

## Final checklist

### Part A — E2E tests and performance check

- [ ] JDK 17, platform-tools and Maestro installed with approval; `adb` sees the phone.
- [ ] `app.config.ts` builds the E2E variant; the default config is still `com.jarmenio.basketroutine` (tested).
- [ ] `perfData.ts` and the dev tools actions have tests; `/dev-tools` redirects in the real app (tested).
- [ ] The `appId` guard test passes.
- [ ] The three Maestro flows pass on the phone against the E2E install, three runs in a row; the real app's data is untouched.
- [ ] Every performance budget is met on the E2E install with the long history and the long session, with the numbers in "Results".
- [ ] `npm run lint`, `format:check`, `typecheck`, `test` and `npx expo-doctor` pass locally, and `db:generate` leaves the migrations unchanged (or holds only the planned index migration).
- [ ] CI is green on `main`.

### Part B — v1.0 release

- [ ] `v1.0.0` tagged; the v1.0 APK installs over the Phase 5 APK without uninstalling, and the old data is in History.
- [ ] The final logo, splash, gallery media and haptics work on the APK.
- [ ] v1.0 used in a real training session; the feedback is in "Results".

## Results
