# Phase 2 — Design System & App Shell (detailed plan)

Detailed plan for Phase 2 of [PLAN.md](PLAN.md).

**Goal:** the app's visual language as code (dark theme tokens: colors, spacing, type, touch sizes), a small set of base components, and the navigation shell: bottom tabs **Workout · Exercises · History** with placeholder screens that use those components. It replaces the Phase 1 DB-check screen.

**Done when:** on the phone (Expo Go), the app opens on the Workout tab and all three tabs switch correctly. Everything is dark (no white flash between screens, tab bar clear of the Android navigation bar), icons render, and `lint`, `format:check`, `typecheck`, `test` and `expo-doctor` pass with CI green.

## Decisions for this phase

| Topic | Decision |
|---|---|
| Tabs navigator | `Tabs` from `expo-router` (the stable JS bottom tabs, React Navigation vendored inside expo-router, so nothing new to install). Fully stylable, so it can match Hevy's look. `NativeTabs` (`expo-router/unstable-native-tabs`) is still unstable and takes Material 3 styling on Android, so it isn't used. |
| Route layout | Root `Stack` in `app/_layout.tsx` stays (Phase 3 puts the active workout on it, above the tabs). The tabs live in a route group: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx` (Workout, the initial route `/`), `app/(tabs)/exercises.tsx`, `app/(tabs)/history.tsx`. A tab becomes a folder with its own `Stack` only when a later phase gives it a second screen. No empty scaffolding. |
| Headers | Navigator headers are off (`headerShown: false`). Each screen draws its own title through the `Screen` component, so later nested stacks never end up with two headers. |
| Dark only | Already forced in `app.json` (`userInterfaceStyle: "dark"`). The navigation tree is also wrapped in `ThemeProvider` with a custom `DarkTheme` (from `expo-router`) built from the color tokens. React Navigation's own backgrounds, borders and cards then use the tokens and never flash its light defaults. |
| Styling approach | `StyleSheet.create` + plain token constants from `src/theme/`. No styling library (NativeWind, Tamagui, Unistyles): no runtime theme switching is needed and every one would add config and dependencies. |
| Accent color | Basketball orange (around `#FF7A1A`, final value tuned on the phone). Text/icons on orange use near-black (`onAccent`), not white: white on orange fails 4.5:1 contrast. Orange stays the brand/action color. `success`/`danger` are separate tokens, so FG% coloring in Phase 3 doesn't clash with it. |
| Font | System font (Roboto). Nothing to load. The type scale (sizes, weights, line heights) lives in `src/theme/typography.ts`, so a custom font later is a one-file change. Numbers (set values, FG%) use `fontVariant: ['tabular-nums']` so columns don't jiggle while typing. |
| Icons | `expo-symbols` (Material Symbols, drawn from a font on Android, so it works in Expo Go). Wrapped in one `Icon` component that takes the Android symbol name, so the library can be swapped and mocked in one place. The icon font is **preloaded behind the splash screen** (with `useFonts` and `expo-symbols/androidWeights/regular`, the same weight `SymbolView` uses by default) together with the DB setup, so the tab icons don't wait for the font to load. `SymbolView` still draws an empty box for its very first frame (it re-checks the font asynchronously on every mount). That's a one-frame blink, not worth chasing. |
| Touch & "sweaty hands" | Minimum touch target 48 dp for everything pressable (Android guideline), 56 dp for primary actions. Small icons get `hitSlop` up to 48 dp. Every pressable shows visible pressed feedback (background/opacity change). Every action is a plain tap: nothing needs long-press or swipe. These live as tokens (`touch.min`, `touch.primary`). Input tokens (height, large numeric font size) are defined now too. The input component itself is built in Phase 3 with the set table, which is its first real use. |
| Base components | The six the placeholders use: `Screen`, `AppText`, `Button`, `Card`, `EmptyState`, `Icon`. Their options go slightly beyond what the placeholders use, but only options Phase 3 is already known to need. `Button` gets all four variants: `primary` for Start/Finish, `secondary` for Add Exercise, `ghost` for Add Set, `danger` for Discard. `Card` can be pressable (routine cards) and `EmptyState` takes an optional action. Everything else (set row, number input, list item, bottom sheet…) is extracted when a real screen needs it. |
| Accessibility | Base components pass through `accessibilityRole` / `accessibilityLabel` / `accessibilityState` (e.g. `Button` sets `role="button"` and `disabled`). Tabs use their titles as labels. A full accessibility pass is Phase 7. |
| Component tests | React Native Testing Library, next to the components (`*.test.tsx`). Shell navigation is tested with `renderRouter` from `expo-router/testing-library`, in `__tests__/`. Jest switches from the `jest-expo` preset (which simulates **iOS**) to `jest-expo/android`, so tests run the same code paths as the phone: `Platform.OS`, Android's `SymbolView` and Android tab roles. The existing 73 tests already pass under it (checked). |

## Out of scope (belongs to later phases)

- Any real content in the tabs: routines list, "Start Empty Workout" behavior → Phase 3/6. Catalog browsing and search → Phase 5. Session list → Phase 4.
- The set-table input, list rows, modals/bottom sheets, "resume workout" banner → Phase 3 (extracted there).
- Haptics, empty-state polish, app icon and splash art, full accessibility pass → Phase 7.
- A light theme or a theme switcher: the app is dark only.
- A standalone component gallery screen: the placeholders plus component tests cover the base components.

## Tools

Nothing is installed without asking first. All three packages are already in `node_modules` as transitive dependencies. Installing makes them direct dependencies at the SDK's versions, so the imports are declared and `expo-doctor` stays happy:

| Package | What it does | Kind |
|---|---|---|
| `expo-symbols` | Material Symbols icons (`npx expo install expo-symbols`) | dependency |
| `expo-font` | `useFonts`, to preload the icon font behind the splash (`npx expo install expo-font`) | dependency |
| `expo-asset` | Required by `expo-font` (its font loader imports it). Today it's only nested under `node_modules/expo/node_modules/`, so it can't be resolved from the top-level `expo-font`. Jest fails with "Cannot find module 'expo-asset'" (checked), and Metro resolves modules the same way. Installing it hoists it (`npx expo install expo-asset`) | dependency |

## Steps

### 1. Theme tokens (`src/theme/`)
- `colors.ts`: grow the existing file (keep `background: '#121212'`, which `app.json` also uses for the splash and root view). Tokens: `background`, `surface` (cards), `surfaceElevated` (pressed/raised), `border`, `text`, `textMuted`, `textDisabled`, `accent`, `accentPressed`, `onAccent`, `success`, `danger`, `tabInactive`. Names describe the role, not the hue.
- `spacing.ts`: a 4 dp scale (`xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 24`, `xxl 32`), `radius` (`sm 8`, `md 12`, `lg 16`, `pill 999`), and the touch/input sizes (`touch.min 48`, `touch.primary 56`, `input.height`, `input.fontSize`).
- `typography.ts`: named text styles (`title`, `heading`, `body`, `label`, `caption`, `number`) as size + weight + line height. `number` is large and uses tabular numerals.
- `navigationTheme.ts`: the `DarkTheme` from `expo-router` with its colors mapped to the tokens (`background`, `card` → `surface`, `border`, `text`, `primary` → `accent`).
- A unit test (`src/theme/colors.test.ts`) that computes the WCAG contrast ratio. It asserts ≥ 4.5 for every token used as text or icon color, on the backgrounds it sits on:
  - `text`, `textMuted`, `accent` (the `accent` text tone, `ghost` buttons, the active tab) and `danger` (the `danger` button) on `background` and on `surface`;
  - `tabInactive` on `surface` (the tab bar);
  - `onAccent` on `accent` and on `accentPressed`.

  `textDisabled` is left out (WCAG exempts disabled controls). A table of `[foreground, background]` pairs with `test.each` keeps it to one assertion. This keeps the "readable on the court" requirement from drifting when colors are tuned.

### 2. Packages, Jest preset, icon font preload and theme at the root (`app/_layout.tsx`)
- Install `expo-symbols`, `expo-font` and `expo-asset` (see Tools). Check that `expo-asset` now resolves from the top level (`node -e "require.resolve('expo-asset')"`).
- Set `"preset": "jest-expo/android"` in `package.json`'s `jest` block and run `npm test`: all existing tests should still pass.
- Load the icon font with `useFonts({ [regular.name]: regular.font })` (`regular` from `expo-symbols/androidWeights/regular`). Keep the splash screen up until both the DB setup and the font are settled:
  - render `null` while `!ready || !(fontsLoaded || fontError)`;
  - hide the splash once that's false or there's a DB `error`.
- If the font fails, don't block: continue, since icons fall back to their empty box. The DB error branch doesn't wait for the font; it shows as soon as the error is known.
- Wrap the `Stack` in `ThemeProvider value={navigationTheme}`. Keep the existing error branch and light `StatusBar`.
- Check: `npx expo start`, the app still opens in Expo Go.

### 3. Base components (`src/components/`)
One file per component, each with a small `*.test.tsx` next to it where there's behavior to test.
- `AppText`: `Text` with a `variant` (typography style) and a `tone` (`default`, `muted`, `accent`, `danger`…). All text in the app goes through it, so the type scale is used everywhere.
- `Icon`: `SymbolView` with `name` (Android symbol), `size`, `color` (defaults to `text`). The only file that imports `expo-symbols`. Two traps it hides from callers:
  - `name` must be passed as `{ android: name }`: a plain string is read as an iOS SF Symbol and renders nothing on Android.
  - `tintColor` must always be set: without it, Android uses the system's Material You color taken from the wallpaper.
- `Button`: `Pressable` with `variant`, optional leading `icon`, `disabled`, `fullWidth`. All variant styling lives in one `variant → { background, pressedBackground, textColor }` table, so the JSX has no per-variant branches:

  | Variant | Fill (pressed) | Text/icon | Height |
  |---|---|---|---|
  | `primary` | `accent` (`accentPressed`) | `onAccent` | `touch.primary` |
  | `secondary` | `surface` (`surfaceElevated`) | `text` | `touch.min` |
  | `ghost` | transparent (`surfaceElevated`) | `accent` | `touch.min` |
  | `danger` | `surface` (`surfaceElevated`) | `danger` | `touch.min` |

  - **`danger` is red text on a neutral fill, not a red fill.** That's the Hevy look for Discard, and it needs no `onDanger` token.
  - **Disabled** looks the same for every variant: `surface` fill, `textDisabled` text, no pressed feedback.
  - **Accessibility:** `accessibilityRole="button"` and `accessibilityState={{ disabled }}`.
  - **Tests:** calls `onPress`, doesn't when disabled, exposes the disabled state. A `test.each` over the four variants checks that each renders its label and fires `onPress`.
- `Card`: a `surface` container with `radius.md` and padding. Becomes pressable only when given `onPress`: pressed fill `surfaceElevated`, `accessibilityRole="button"`. Test: plain `View` without `onPress`, fires it when given.
- `EmptyState`: centered icon + title + message + optional action `Button` (`secondary`). Test: renders the action only when given, and it fires.
- `Screen`: the screen frame. `SafeAreaView` (top edge only, since the tab bar handles the bottom), `background` color, a large title row with an optional right-side slot, then the content (scrollable by default, `scroll={false}` to opt out). Horizontal padding from tokens. The `ScrollView` gets `contentContainerStyle={{ flexGrow: 1 }}`, so an `EmptyState` can center vertically inside it.

### 4. Tabs shell (`app/(tabs)/`)
- `_layout.tsx`: `Tabs` with `headerShown: false`. Tab bar colors come from tokens: `surface` background, `border` top border, `accent` active tint, `tabInactive` inactive tint. The bar height leaves room for the ≥ 48 dp targets, and `tabBarHideOnKeyboard: true` keeps it from riding up on the keyboard in Phase 3. Icons: Workout `sports_basketball`, Exercises `format_list_bulleted`, History `history`.
- Safe area: the tab bar pads itself for the bottom inset (Android is edge-to-edge), so it sits above both the gesture bar and the 3-button navigation bar.
- Android back button: default `backBehavior` (`firstRoute`): back from Exercises/History returns to Workout, and back on Workout leaves the app.
- Delete `app/index.tsx` (the Phase 1 DB-check screen) together with `__tests__/index.test.tsx`, which imports it (otherwise `typecheck` and `test` stay broken until step 6). `app/(tabs)/index.tsx` now serves `/`. Routines created from that screen's "Add test routine" button stay in the phone's DB. Clear Expo Go's data if they get in the way (nothing reads routines until Phase 6).

### 5. Placeholder screens
Each placeholder shows the real screen's frame and uses the base components, without behavior that belongs to a later phase:
- **Workout** (`index.tsx`): `Screen` titled "Workout". A "Quick Start" `Card` with a disabled primary "Start Empty Workout" button, and a "Routines" section with an `EmptyState` ("No routines yet").
- **Exercises** (`exercises.tsx`): `Screen` titled "Exercises", with the catalog count from `listExercises(db)` ("38 exercises") as a subtitle. It's a real DB read on a real screen, so it keeps proving the data layer works in the app. Below it, an `EmptyState` saying browsing and search are coming.
- **History** (`history.tsx`): `Screen` titled "History" with an `EmptyState` ("No workouts yet").

### 6. Tests
- `__tests__/shell.test.tsx`: `renderRouter` with the real route files, **root `_layout` included**, so the test covers the DB + font gate, the `ThemeProvider` and the error branch as well as the tabs. Two mocks:
  - `@/db/client`, with `createTestDb()` + seed (the same `jest.mock` factory as the Phase 1 test), so Exercises reads the real catalog.
  - `@/db/useDatabaseSetup`, set per test through a `jest.fn()`. Drizzle's `useMigrations` needs expo-sqlite, which can't run in Jest, and migrations + seed are already covered by the Phase 1 tests.
- Asserts:
  - with setup `{ ready: true }`: the app starts on Workout; pressing the "Exercises" tab shows "38 exercises"; pressing "History" shows its empty state;
  - with setup `{ error }`: "Database error: …" is shown and no tab bar.
- `renderRouter` pitfalls with Testing Library v14 (all checked in a throwaway test):
  - Always `await renderRouter(...)`. v14's `render` is async, and `renderRouter` still calls it as if it were synchronous.
  - Its `getPathname()`-style helpers are attached to the returned Promise, not to the awaited result (and `expect(screen).toHavePathname(...)` doesn't work either). Keep the Promise: `const app = renderRouter(...); await app; expect(app.getPathname()).toBe('/history')`.
  - It turns on Jest fake timers, so create the user with `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })`, or `press` hangs.
  - On Android, tab buttons have the `tab` role, but their accessible name includes the icon glyph, so each `Tabs.Screen` sets `tabBarAccessibilityLabel` to its title: `screen.getByRole('tab', { name: 'Exercises' })`.
- No `Icon` mock needed: under `jest-expo/android`, Android's `SymbolView` renders fine, because `jest-expo` mocks the native font loader (checked, once `expo-asset` resolves).
- The component tests from step 3 and the contrast test from step 1.

### 7. Check on the phone (Expo Go)
- The app opens straight on Workout, with no white flash on launch or when switching tabs.
- All three tabs switch. Icons show with the tab bar (preloaded font: at most a one-frame blink, see Icons above), and the active tab is orange.
- The tab bar sits above the Android navigation bar. Try both gesture and 3-button navigation if the phone allows it.
- Back from Exercises/History goes to Workout.
- Buttons and tabs are easy to hit and show pressed feedback. Tune the accent and `textMuted` values here if needed; the contrast test guards the result.
- Optional, not a done-when item: this is a good moment to resume the pending Phase 0 `preview` APK build, since it's the first build that looks like the real app.

### 8. CI
- No workflow changes. Run the full CI command list locally before committing (`lint`, `format:check`, `typecheck`, `test`, `db:generate` + clean `git status` on `src/db/migrations`, `npx expo-doctor`).

### 9. Docs and phase commit
- Update `CLAUDE.md`: project state (tabs shell under `app/(tabs)/`, `src/components/`, theme files in `src/theme/`, the icon rule "only `Icon` imports `expo-symbols`", tests running on the `jest-expo/android` preset, the `renderRouter` pitfalls from step 6), current status.
- Tick the checklist below. One commit: "Phase 2: design system and app shell". Push, and confirm CI is green.

## Final checklist

- [x] `npm run lint`, `format:check`, `typecheck`, `test` and `npx expo-doctor` pass locally.
- [x] Theme tokens exist for colors, spacing/radius/touch sizes and typography, and the contrast test passes.
- [x] Base components (`Screen`, `AppText`, `Button`, `Card`, `EmptyState`, `Icon`) exist, and their tests pass.
- [x] Jest runs on the `jest-expo/android` preset.
- [x] The shell test goes through the real root layout, navigates between the three tabs, and covers the DB error branch.
- [ ] CI is green on `main`.
- [x] On the phone (Expo Go): three tabs work, everything is dark with no white flash, icons render, the tab bar clears the navigation bar, and back returns to Workout.
