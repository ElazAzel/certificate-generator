import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'certgen.db');

let db: Database.Database;

export function initDatabase(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations();
  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fonts (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      font_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('pdf','png','jpg','jpeg')),
      width REAL NOT NULL,
      height REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      total_rows INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      export_mode TEXT NOT NULL DEFAULT 'separate',
      output_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS generation_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generation_id TEXT NOT NULL,
      row_number INTEGER NOT NULL,
      message TEXT NOT NULL,
      FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE
    );
  `);

  const version = db.prepare('SELECT COALESCE(MAX(version), 0) as v FROM schema_version').get() as { v: number };
  // Future migrations can be added here
}

export function closeDatabase(): void {
  if (db) db.close();
}
