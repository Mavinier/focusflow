import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { resolve } from 'node:path'
import { db } from './db/client'

migrate(db, {
  migrationsFolder: resolve(process.cwd(), 'drizzle'),
})

console.log('SQLite database is up to date.')
