# Basket Routine

An Android-only, personal-use app for logging basketball training routines. It follows a
routines → workout templates → active workout → history flow, tracking **Attempts / Makes**
per set with automatically derived FG%.

See [docs/plan/PLAN.md](docs/plan/PLAN.md) for the full development plan.

## Development

Requires Node 24 (pinned in `.nvmrc`).

```bash
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your Android phone (same Wi-Fi network; add
`--tunnel` if the network blocks it).

## Commands

| Command                | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run lint`         | ESLint                                           |
| `npm run format`       | Format the project with Prettier                 |
| `npm run format:check` | Check formatting without writing                 |
| `npm run typecheck`    | TypeScript, no emit                              |
| `npm test`             | Run the test suite                               |
| `npm run db:generate`  | Generate a SQL migration from `src/db/schema.ts` |

## Building an APK

The APK is built by EAS Build and installed manually (no Play Store).

- **From GitHub:** run the "Build APK" workflow (Actions tab → workflow_dispatch). It runs CI
  first, then queues a build on EAS.
- **From the terminal:** `npx eas-cli@latest build -p android --profile preview`.

Once the build finishes, open its page on the [EAS dashboard](https://expo.dev), scan the QR
code (or open the link) on the phone, download the APK and install it. Installing over an
existing build updates the app in place without losing data, as long as it's signed with the
same key.
