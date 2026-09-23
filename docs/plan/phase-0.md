# Phase 0 — Project Setup (detailed plan)

Detailed plan for Phase 0 of [PLAN.md](PLAN.md).

**Goal:** a new Expo + TypeScript project (Android only, dark UI) with navigation, lint/format, tests and CI, plus a build pipeline that produces an APK to install on the phone.

**Done when:** an APK built from a commit with green CI installs and opens on the device.

## Decisions for this phase

| Topic | Decision |
|---|---|
| Package manager | npm (lockfile committed, `npm ci` in CI) |
| Node | Node 24 (active LTS), pinned in `.nvmrc`; CI and EAS Build use the same version. Node 26 is still "Current" until late October 2026, and Expo tooling may not support it yet. |
| Expo SDK | Latest stable SDK at setup time, pinned by `create-expo-app` |
| Android application ID | `com.jarmenio.basketroutine`. Changing it later means installing a separate app, and the data on the phone is lost. |
| Dev loop | `npx expo start` on the Mac, then scan the QR code with Expo Go on the phone (same Wi-Fi; `--tunnel` if the network blocks it). A development build is added only when a native module needs it. |
| CI | GitHub Actions: lint, format check, typecheck, tests, `expo-doctor` on every push and PR. All of them block the APK build, including `expo-doctor`. |
| APK build | EAS Build, `preview` profile (`buildType: apk`), started **manually** from a GitHub Actions workflow (`workflow_dispatch`) after the checks pass. This keeps the free EAS build quota for versions worth installing. |
| Signing | Keystore generated and stored by EAS; a backup copy is kept outside the repo |
| Commits | One commit for the whole phase, made when the work is done (step 11). Fix-up commits after that only if CI or the build fails. |

## Out of scope (belongs to later phases)

- Bottom tabs, theme tokens, base components → Phase 2.
- SQLite / Drizzle, domain logic → Phase 1.
- Final app icon and splash art → Phase 7.
- E2E tests and `production` build profile → Phase 7.

## Prerequisites

1. Node 24 available locally, matching `.nvmrc`. The machine currently has Node 26, so Node 24 must be installed first (ask before installing, see Tools).
2. GitHub repository `j-armenio/basketRoutine`, already added as `origin`, with SSH access working.
3. An Expo account (free) for EAS Build.
4. The Android phone allows installing apps from the browser ("Install unknown apps") and has the **Expo Go** app installed and up to date (Expo Go only runs the latest SDK).

## Tools

Nothing is installed without asking first. Tools used in this phase:

| Tool | What it does | Where it runs |
|---|---|---|
| `create-expo-app` | Generates the initial project | `npx`, one-off; nothing stays installed |
| Project npm packages (Expo, Expo Router, ESLint, Prettier, Jest…) | App and quality dependencies | Project `node_modules/` only |
| Node 24 | Runtime for the project and tooling | Local machine, next to the existing Node 26 (e.g., via a version manager) |
| `eas-cli` | Talks to EAS: login, project setup, build, credentials | `npx eas-cli@latest`; nothing global |
| Expo Go | Runs the dev version of the app on the phone | Phone (Play Store) |

## Steps

### 1. Scaffold the Expo project
- Run `npx create-expo-app@latest` with the **default** (TypeScript + Expo Router) template in a temporary folder, then move its files into the repo. The repo is not empty (`docs/`, `.gitignore`, `.claude/`), so scaffolding in place would conflict.
- Merge the template's `.gitignore` with the existing one. The current one already covers Expo and the generated `/android` and `/ios` folders.
- Create `.nvmrc` with `24`.
- Run the template's `reset-project` script to remove the example screens. Then delete the backup folder it creates, the `scripts/` folder and the `reset-project` entry in `package.json`.
- Remove what Android-only doesn't need: web dependencies (`react-native-web`, `react-dom`) and iOS/web-specific files or config. Keep `expo-system-ui`, which Android needs for the dark theme (step 2).
- Add Expo-related packages with `npx expo install` (here and in later steps), so their versions match the SDK. `expo-doctor` fails on mismatched versions.
- Check: `npx expo start` runs, and scanning the QR code with Expo Go opens the app on the phone.

### 2. App configuration (`app.json`)
- `name: "Basket Routine"`, `slug: "basket-routine"`, `scheme: "basketroutine"`.
- `platforms: ["android"]`.
- `android.package: "com.jarmenio.basketroutine"` (see decisions).
- `userInterfaceStyle: "dark"`, so the app is always dark and ignores the system theme. On Android this requires `expo-system-ui`.
- Dark background for the splash screen (in the `expo-splash-screen` plugin config) and the Android root view (`backgroundColor`, also through `expo-system-ui`), so the app doesn't flash white on launch.
- Keep Android Auto Backup at its default; nothing to configure (see PLAN risks).
- Keep the template's placeholder icon; the real icon comes in Phase 7.

### 3. Project structure and TypeScript
- `app/` holds routes only (Expo Router). Everything else goes in `src/` (`src/theme`, and later `src/db`, `src/domain`, `src/components`).
- Create folders only when they receive a file; no empty scaffolding.
- `tsconfig.json`: `strict: true` and the `@/*` → `src/*` path alias.
- Add `"typecheck": "tsc --noEmit"` to `package.json`.

### 4. Navigation and dark baseline
- `app/_layout.tsx`: root `Stack` with no header, dark `contentStyle` background, and a light `StatusBar`.
- `app/index.tsx`: a single placeholder screen with the text "Basket Routine" on a dark background, inside a `SafeAreaView` (`react-native-safe-area-context`) so the text isn't drawn under the status bar (Android is edge-to-edge).
- `src/theme/colors.ts`: only the minimum colors used now (`background`, `text`). Phase 2 grows this into the real design system.
- Check on the phone (Expo Go): dark screen, light status bar. Expo Go uses its own splash, so the "no white flash" check happens on the APK (steps 8 and 12).

### 5. Lint and format
- ESLint via `npx expo lint`, which creates the flat config with `eslint-config-expo`.
- Prettier with a small `.prettierrc` and `.prettierignore`, plus `eslint-config-prettier` so the two tools don't conflict. `docs/` and `.claude/` go in `.prettierignore`, so the planning docs and skills keep their hand-written formatting.
- Scripts: `lint`, `format` (`prettier --write .`), `format:check` (`prettier --check .`).
- Run `npm run format` once over the whole project.
- Optional: a `.vscode/settings.json` with format-on-save and Prettier as the default formatter.

### 6. Test setup
- Install `jest-expo` and `@testing-library/react-native`; set `"preset": "jest-expo"` in the Jest config.
- Map the path alias for Jest: `moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" }`. Metro reads the `tsconfig` paths, Jest doesn't, and the smoke test imports `@/theme/colors` through `app/index.tsx`.
- Script: `"test": "jest"`.
- One smoke test: render `app/index.tsx` and assert that "Basket Routine" is on screen. This proves the pipeline works; the real unit tests start in Phase 1.

### 7. CI workflow (GitHub Actions)
- `.github/workflows/ci.yml`, triggered on push to `main`, on pull requests, and callable by other workflows (`workflow_call`):
  1. `actions/checkout`
  2. `actions/setup-node` with `node-version-file: .nvmrc` and npm cache
  3. `npm ci`
  4. `npm run lint`
  5. `npm run format:check`
  6. `npm run typecheck`
  7. `npm test -- --ci`
  8. `npx expo-doctor` (it checks online; if a non-essential check such as the React Native Directory one gets in the way, turn it off in `package.json` → `expo.doctor` instead of dropping the step)
- Before committing, run the same commands locally to catch failures early. The workflow itself first runs after the push in step 11.

### 8. EAS Build configuration
- `npx eas-cli@latest login`, then `npx eas-cli@latest init` to create the EAS project and write `extra.eas.projectId` to the app config.
- `eas.json`:
  - `cli.appVersionSource: "remote"` (EAS manages `versionCode`).
  - `build.preview`: `distribution: "internal"`, `android.buildType: "apk"`, `autoIncrement: true`, and `node` set to the same version as `.nvmrc` (EAS otherwise uses its image's default Node).
- First build from the terminal: `npx eas-cli@latest build -p android --profile preview`. Let EAS generate the keystore. Install this APK on the phone as an early test: it opens with no white flash on launch. It is also the "first install" for the update test in step 12.
- Add `credentials.json` to `.gitignore` (`*.jks` is already there), since credential downloads land in the project folder.
- Download a backup of the keystore (`eas credentials`) and keep it **outside the repo** (password manager or a private drive). Every future APK must be signed with the same key to update the installed app without uninstalling it. Uninstalling wipes the data.

### 9. APK workflow (manual trigger)
- Create an Expo access token and save it in the GitHub repo secrets as `EXPO_TOKEN`.
- `.github/workflows/build-apk.yml`:
  - Trigger: `workflow_dispatch` (a "Run workflow" button on GitHub).
  - Job `checks`: calls `ci.yml` (`uses: ./.github/workflows/ci.yml`), so the steps are not copied.
  - Job `build` (`needs: checks`): `actions/checkout`, `actions/setup-node` (`node-version-file: .nvmrc`, npm cache), `expo/expo-github-action` with `eas-version: latest` and `token: ${{ secrets.EXPO_TOKEN }}`, `npm ci`, then `eas build -p android --profile preview --non-interactive --no-wait`.
- The APK only gets built if the checks pass, which is what "CI-green APK" means.
- With `--no-wait` the workflow turns green as soon as the build is queued. Whether the APK was actually built is checked on the EAS dashboard.

### 10. README
- Short `README.md`: what the app is, a link to `docs/plan/PLAN.md`, and the commands: run in dev (`npx expo start` + scan the QR code with Expo Go), `lint`, `format`, `typecheck`, `test`, how to build the APK (workflow button or `eas build`), and how to install it on the phone.

### 11. Phase commit and push
- One commit with the whole phase: "Phase 0: project setup". It also includes the planning changes made before the phase (`docs/plan/`, `.gitignore`) and the project skills in `.claude/skills/`.
- Push to `main` and confirm the CI run is green on GitHub. If it fails, fix it and push a fix-up commit.

### 12. Build and install the APK
- Start the "Build APK" workflow on GitHub and wait for the build to finish on the EAS dashboard.
- On the phone, scan the QR code on the build page (or open its link), download the APK and install it.
- Open the app: dark placeholder screen, no white flash on launch, no crash.
- This APK installs over the one from step 8, which confirms updating works without uninstalling (same signing key). No third build is needed.

## Final checklist

- [ ] `npx expo start` + QR code opens the app in Expo Go on the phone, in dark mode.
- [ ] `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` and `npx expo-doctor` pass locally.
- [ ] CI is green on GitHub for the latest commit on `main`.
- [ ] The "Build APK" workflow runs the checks, then queues a build on EAS, and the build finishes on the EAS dashboard.
- [ ] The APK installs on the phone and opens the dark placeholder screen.
- [ ] The workflow APK installs over the step 8 APK without uninstalling.
- [ ] Keystore backup stored outside the repo.
