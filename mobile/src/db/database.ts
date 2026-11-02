import * as SQLite from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'

import { seedDefaults } from './defaults'
import migrations from './migrations'
import * as schema from './schema'

const sqlite = SQLite.openDatabaseSync('focusflow.db')

// The mobile database owns its foreign-key behavior. This is set before any
// Drizzle query or migration can run.
sqlite.execSync('PRAGMA foreign_keys = ON;')

export const db = drizzle(sqlite, { schema })
export type AppDatabase = typeof db

let initialization: Promise<void> | undefined

/**
 * Apply all pending migrations once per app process, then add only missing
 * starter rows. Both operations are safe to call from the root layout and
 * from tests that open a fresh database.
 */
export function initializeDatabase() {
  initialization ??= migrate(db, migrations).then(() => {
    seedDefaults(db)
  })

  return initialization
}
