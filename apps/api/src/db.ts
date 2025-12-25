import fs from "fs";
import path from "path";
import initSqlJs, { Database, SqlValue } from "sql.js";

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "crm.sqlite");

type Migration = {
  id: number;
  up: string;
};

const migrations: Migration[] = [
  {
    id: 1,
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        industry TEXT,
        website TEXT,
        phone TEXT,
        address TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        title TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        is_won INTEGER NOT NULL DEFAULT 0,
        is_lost INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        primary_contact_id INTEGER,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        stage_id INTEGER NOT NULL,
        owner_user_id INTEGER NOT NULL,
        close_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (primary_contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
        FOREIGN KEY (stage_id) REFERENCES stages(id),
        FOREIGN KEY (owner_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        assigned_user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER NOT NULL,
        author_user_id INTEGER NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
        FOREIGN KEY (author_user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);
      CREATE INDEX IF NOT EXISTS idx_deals_account ON deals(account_id);
      CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);
      CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);
      CREATE INDEX IF NOT EXISTS idx_notes_deal ON notes(deal_id);
    `
  }
];

let db: Database | null = null;

const persist = () => {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
};

const ensureDir = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

export const initDb = async () => {
  if (db) {
    return db;
  }
  ensureDir();
  const SQL = await initSqlJs();
  const fileExists = fs.existsSync(dbPath);
  const fileBuffer = fileExists ? fs.readFileSync(dbPath) : undefined;
  db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
  db.exec("PRAGMA foreign_keys = ON;");
  runMigrations();
  persist();
  return db;
};

const runMigrations = () => {
  if (!db) {
    throw new Error("Database not initialized");
  }
  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))"
  );
  const applied = all<{ id: number }>("SELECT id FROM migrations ORDER BY id").map((row) => row.id);
  for (const migration of migrations) {
    if (!applied.includes(migration.id)) {
      db.exec(migration.up);
      run("INSERT INTO migrations (id) VALUES (?)", [migration.id]);
    }
  }
};

const normalizeParams = (params?: SqlValue[] | Record<string, SqlValue>) => params ?? [];

export const run = (sql: string, params?: SqlValue[] | Record<string, SqlValue>) => {
  if (!db) {
    throw new Error("Database not initialized");
  }
  const stmt = db.prepare(sql);
  stmt.run(normalizeParams(params));
  stmt.free();
  persist();
};

export const get = <T>(sql: string, params?: SqlValue[] | Record<string, SqlValue>) => {
  if (!db) {
    throw new Error("Database not initialized");
  }
  const stmt = db.prepare(sql);
  stmt.bind(normalizeParams(params));
  const hasRow = stmt.step();
  const row = hasRow ? (stmt.getAsObject() as T) : undefined;
  stmt.free();
  return row;
};

export const all = <T>(sql: string, params?: SqlValue[] | Record<string, SqlValue>) => {
  if (!db) {
    throw new Error("Database not initialized");
  }
  const stmt = db.prepare(sql);
  stmt.bind(normalizeParams(params));
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
};

export const insertAndGetId = (sql: string, params?: SqlValue[] | Record<string, SqlValue>) => {
  run(sql, params);
  const row = get<{ id: number }>("SELECT last_insert_rowid() as id");
  if (!row) {
    throw new Error("Failed to retrieve last insert id");
  }
  return row.id;
};
