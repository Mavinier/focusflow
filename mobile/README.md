# FocusFlow Mobile

This directory contains the iOS-first Expo app. It is intentionally separate
from the Vite web app and does not require the Express server to run.

## Requirements

- Node.js 22.13+, 24.3+, or 26+
- Expo Go on a physical iPhone for the current development workflow
- An iPhone and Mac on the same network for LAN mode, or an internet
  connection for tunnel mode

## Run on a physical iPhone

```bash
cd mobile
npm install
npm run start:device
```

Scan the QR code with the iPhone camera and open the project in Expo Go. The
tunnel command is the most reliable option when the phone and computer cannot
reach each other over the local network. `npm run start:lan` is faster when
both devices are on the same network.

Other useful commands:

```bash
npm run typecheck
npm run lint
npm run doctor
npm run web
```

## Installable preview build

Expo Go is only needed for development. To install FocusFlow as a standalone
preview app, use an EAS internal build. This build includes the local SQLite
database, notifications, app icon, and splash screen, and it does not require
Expo Go or the Express server after installation.

Requirements:

- An Expo account
- An Apple Developer account
- An iPhone registered for internal distribution

Log in and link the project the first time:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

Start the iOS preview build:

```bash
npx eas-cli@latest build --profile preview --platform ios
```

When the build finishes, open the build details link on the iPhone and follow
the installation instructions. EAS may ask for Apple signing credentials and
the device UDID during the first build.

The preview build is best for personal daily use and internal testing. It can
run without an internet connection after installation. Internet is only needed
to create or download the build.

## Production and TestFlight build

Use the production profile when the app should be distributed through
TestFlight or the App Store:

```bash
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios --latest
```

After submission processing completes, invite the device through TestFlight.
Production builds use the same on-device SQLite database and do not require the
FocusFlow web server.

To inspect previous builds:

```bash
npx eas-cli@latest build:list
```

## Android setup and builds

The Android package is already configured as `com.focusflow.mobile` in
[`app.json`](app.json). Android builds use the same React Native screens, local
SQLite database, notifications, backups, and activity logic as the iOS app.

### Test with Expo Go

Install Expo Go from Google Play on an Android phone, then run:

```bash
cd mobile
npm install
npm run start:device
```

Scan the QR code with the phone. This is enough to test the UI and most local
features without Android Studio.

### Build an installable APK

An APK can be built in the EAS cloud without Xcode or Android Studio:

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile preview --platform android
```

When the build finishes, open the build link on the Android phone, download
the APK, and install it. Android may ask you to allow installation from the
browser or file manager.

The preview APK is suitable for personal offline use. After installation it
does not require Expo Go, the Express server, or a computer. Internet is only
needed to download the build and optional future updates.

### Build for Google Play

Google Play uses an Android App Bundle rather than an APK:

```bash
npx eas-cli@latest build --profile production --platform android
```

After the build completes, submit it to Google Play:

```bash
npx eas-cli@latest submit --platform android --latest
```

You need a Google Play Developer account to publish the app. A preview APK
does not require a Play Developer account and can be installed directly.

### Optional local Android development

Android Studio is only needed for a local emulator or local native builds. If
it is installed and an emulator is running, use:

```bash
npm run android
```

For the current workflow, Expo Go and EAS cloud builds are sufficient.

## Local database

The app stores its data in `focusflow.db` using Expo SQLite and Drizzle.
`src/db/schema.ts` mirrors the web SQLite schema, `drizzle/` contains the
versioned SQL migrations, and `src/db/migrations.ts` is the bundle loaded by
the native app. The root layout applies pending migrations and seeds missing
starter activity areas, settings, and the current week's default goal.

When the schema changes:

```bash
npm run db:generate
npm run db:check
```

Keep the generated SQL and journal in `drizzle/`, and update the native
migration bundle in `src/db/migrations.ts` with the new journal entry and SQL.
Existing rows are preserved; seeding only inserts missing defaults.

## Reminders and backups

Settings can request iOS notification permission and schedule local inactivity,
weekly-goal, and streak reminders. Reminder requests are refreshed locally when
preferences or activity data changes; no server account or push-token service
is used.

The Data section exports the complete local database as a JSON file compatible
with the web app's export shape. Importing a backup replaces the phone's local
data after confirmation, and the import is validated and applied in one SQLite
transaction.

## EAS builds

The EAS profiles are prepared for a development client, internal preview, and
production distribution:

```bash
npx eas login
npx eas build --profile development --platform ios
npx eas build --profile production --platform ios
```

The development profile is for native modules that are not available in Expo
Go. The app can continue to use Expo Go during the local-first UI phase.
Apple Developer membership and an EAS project are required for device and
TestFlight builds.
