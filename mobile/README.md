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
