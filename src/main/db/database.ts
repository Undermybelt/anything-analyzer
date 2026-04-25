import Database from 'better-sqlite3'
import { app } from 'electron'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import type { PathProvider } from '../runtime/path-provider'

let db: Database.Database | null = null
let pathProvider: PathProvider | null = null

export function setDatabasePathProvider(provider: PathProvider | null): void {
  pathProvider = provider
}

/**
 * Get or initialize the SQLite database connection.
 * Database file is stored in the app's user data directory.
 */
export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = pathProvider
    ? pathProvider.getDatabasePath()
    : join(app.getPath('userData'), 'data', 'anything-register.db')
  const dbDir = dirname(dbPath)

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(dbPath)

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return db
}

/**
 * Close the database connection (called on app quit).
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
