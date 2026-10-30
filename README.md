# FocusFlow

FocusFlow is a personal work and study activity tracker inspired by GitHub's
contribution profile. It shows activity intensity across a calendar heatmap,
lets you select a day to inspect its focus areas, and tracks weekly goals,
streaks, and the yearly focus mix.

## Features

- GitHub-style activity heatmap for the tracking year
- Day details grouped by activity, with total time per focus area
- Activity logging with a date and explicit start/end times
- SQLite persistence through Drizzle ORM
- Weekly focus goal with editable target minutes
- Actual active-day streak calculation
- Data-driven focus mix with hover details for hours and active days
- Responsive, componentized React UI
- Automatic colors for new activities from the shared study-area palette

## Tech stack

- React 18 and TypeScript
- Vite
- Express
- SQLite with `better-sqlite3`
- Drizzle ORM and Drizzle Kit
- Lucide React icons

## Getting started

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

`npm run dev` starts both processes:

- Vite client: `http://localhost:5173`
- Express API: `http://localhost:3001`

The server runs migrations and seeds the local database before starting. The
SQLite file is created at `data/focusflow.db`.

## Database commands

```bash
# Generate a migration after changing server/db/schema.ts
npm run db:generate

# Apply existing migrations
npm run db:migrate

# Seed the sample activity data if the database is empty
npm run db:seed

# Run migrations and seed together
npm run db:setup
```

The local database is intentionally ignored by Git. Remove
`data/focusflow.db` and run `npm run db:setup` to recreate the sample database
from scratch.

## Project structure

```text
src/
  api/          Typed client requests
  components/   Dashboard, heatmap, modal, and insight components
  data/         Sample data and the shared activity color palette
  styles/       Split CSS files organized by UI area
  types/        Shared TypeScript domain types
  utils/        Analytics and formatting helpers
server/
  db/           SQLite client and Drizzle schema
  index.ts      Express API routes
  migrate.ts    Migration runner
  seed.ts       Sample data seeder
drizzle/        Generated SQL migrations
```

## Activity color palette

The current areas use lime, mint, lavender, periwinkle, peach, and rose. The
following 16 additional colors are available in
`src/data/activityColors.ts` for future work or study areas:

- Sky `#72c9f4`
- Aqua `#61ddd4`
- Leaf `#8fe388`
- Gold `#f0dc75`
- Tangerine `#f29b69`
- Coral `#ff8f70`
- Ruby `#f27d8a`
- Berry `#e98ab6`
- Orchid `#e29bff`
- Violet `#a88cff`
- Indigo `#8f9bff`
- Blue `#89a7f5`
- Sage `#9bb7a5`
- Seafoam `#8dd7c7`
- Pink `#f0a7d7`
- Silver `#c7d4e8`

New activities logged through the API automatically receive the next color in
the combined palette unless a color is explicitly supplied.

## Production build

```bash
npm run build
npm run preview
```

The build checks the client and server TypeScript projects before producing the
Vite bundle.
