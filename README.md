<div align="center">
  <img src="public/icon.svg" alt="BruFin icon" width="88" />
  <h1>BruFin</h1>
  <p><strong>Brewing calmer finances.</strong><br />A private, local-first personal finance tracker for the web and Android.</p>
  <p>
    <a href="https://github.com/diamachi/BruFin/actions/workflows/android-apk.yml"><img src="https://github.com/diamachi/BruFin/actions/workflows/android-apk.yml/badge.svg?branch=main" alt="Android build status" /></a>
  </p>
</div>

BruFin helps you track day-to-day spending and keep an eye on your wider financial picture. It runs without an account, bank connection, or app backend: your records stay in local browser or Android WebView storage.

<p align="center">
  <a href="#screenshots">Screenshots</a> ·
  <a href="#features">Features</a> ·
  <a href="#privacy--data-storage">Privacy &amp; storage</a> ·
  <a href="#run-on-the-web">Run on the web</a> ·
  <a href="#build-for-android">Build for Android</a>
</p>

## Screenshots

Screenshots use BruFin's built-in sample data. The same dashboard is shown in both themes.

<div align="center">
  <img src="screenshots/dashboard-light.png" alt="BruFin dashboard in light theme" width="49%" />
  <img src="screenshots/dashboard-dark.png" alt="BruFin dashboard in dark theme" width="49%" />
</div>

<p align="center"><sub>Light theme · Dark theme</sub></p>

## Features

| Area | What you can do |
| --- | --- |
| **Dashboard** | Review monthly income, spending, budget remaining, category breakdown, balances, card activity, and loans. |
| **Transactions** | Record income and expenses with categories, dates, payment methods, notes, search, filters, and quick entry. |
| **Recurring bills** | Set monthly or split-payment schedules, see due dates, and post bills into expenses when paid. |
| **Balances** | Track opening and closing liquid balances by month, compare changes, and optionally enable balance prompts. |
| **Cards** | Manage credit cards, limits, statement dates, and card-linked spending. |
| **Investments & loans** | Keep a manual investment list, estimate returns, record loans, and explore the effect of extra repayments. |
| **Categories** | Add, remove, and restore default income and expense categories in Settings. Existing transactions keep their saved category label. |
| **Data tools** | Export JSON backups or transaction CSVs; import backups; preview older BruFin exports and restore only new transactions. |
| **Personalization** | Switch themes, adjust display scale, and optionally show compact storage and memory diagnostics. |
| **Demo mode** | Explore with sample records, then clear them and begin with an empty local database. |

Investment and loan figures are estimates based on values you enter. BruFin does not fetch live market, bank, or lender data.

## Privacy & data storage

BruFin has no application backend and does not sync data between devices. Financial records are stored in an IndexedDB database named `brufin-local` (schema version 2). App preferences such as theme and display scale use `localStorage`.

- **Web:** IndexedDB is managed by the browser and scoped to the exact origin and browser profile. For example, `localhost`, a LAN IP address, and a deployed domain each have separate data. The browser controls the physical files; BruFin does not create a separate database file you can move directly.
- **Android:** IndexedDB is held in the app's private WebView data area for application ID `com.diamachi.brufin`. Android isolates that storage from other apps; it is not exposed as a normal document or standalone SQLite file.
- **Backups:** Export a JSON backup regularly if you want a portable copy. Backups are unencrypted and contain financial records, so store them somewhere private. Clearing browser data or clearing/uninstalling the Android app can remove local records.

Browser storage is tied to the browser's origin and profile. IndexedDB is managed by each browser, and its on-disk location varies by browser and operating system; it is usually easiest to inspect it through that browser's developer tools. Android keeps WebView data in app-specific storage managed by the OS.

## Run on the web

### Requirements

- Node.js 20.19+ or 22.12+ (Vite requirement)
- npm, included with Node.js

### Start the development server

From the repository root:

```bash
npm ci
npm run dev
```

Open the address Vite prints (normally [http://localhost:5173](http://localhost:5173)). The dev server supports hot reload, and its data stays in IndexedDB for that origin.

### Build and preview

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

The static production site is generated in `dist/`. Type checking and the production build are separate steps.

### Serve a portable build

To serve the already compiled `dist/` folder without Vite:

```bash
./run_portable.sh
```

This requires Python 3, serves only on this computer, and does not compile source or hot reload. Run `npm run build` again after changing source.

## Build for Android

### Requirements

- Node.js and npm as above
- JDK 21
- Android SDK Platform 36 and Android SDK Build-Tools installed through Android Studio's SDK Manager
- Android platform tools (`adb`) to install on a connected device

Set `JAVA_HOME` to JDK 21 and configure the Android SDK in `android/local.properties` or `ANDROID_HOME`. Then sync the web build and compile:

```bash
npm ci
npm run cap:sync
cd android
./gradlew assembleDebug
```

The debug APK is created at `android/app/build/outputs/apk/debug/app-debug.apk`. Install it on a connected device with:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

The `build_apk.sh` helper also builds the APK, but expects a local JDK at `./jdk/Contents/Home`; use the manual steps if JDK 21 is installed elsewhere. Release signing is not configured, so the output is a debug APK.

## Continuous integration and releases

GitHub Actions checks the project and builds a debug APK on pushes and pull requests to `main`, and can be started manually from the Actions tab. The workflow runs type checking and the database/archive import tests, builds the web assets, syncs Capacitor, compiles the APK, and uploads `brufin-debug-apk` as a 14-day artifact.

Pushing a version tag such as `v0.4` runs the build and publishes the APK as a GitHub Release asset. The release description is written in `.github/release-notes/` for that tag, so users see a feature summary rather than an autogenerated list of source changes. Release signing is not configured.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependency versions from the lockfile |
| `npm run dev` | Run the web development server |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm test` | Check local database storage and historical JSON/CSV import |
| `npm run build` | Build the production web assets |
| `npm run preview` | Preview the production web build |
| `npm run cap:sync` | Build web assets and sync them into Android |
| `cd android && ./gradlew assembleDebug` | Compile the Android debug APK |

## Project structure

```text
src/
  components/      App views, forms, modals, navigation, and diagnostics
  data/            Demo data
  utils/           IndexedDB storage, archive import, categories, and date helpers
  App.tsx          App state and view composition
  types.ts         Data model types
android/           Capacitor Android project
public/            App icon and web manifest
screenshots/       Light and dark dashboard screenshots
```

## Built with

- React 19 and TypeScript
- Vite 8
- Tailwind CSS 4
- Capacitor 8 for Android
- Lucide icons
