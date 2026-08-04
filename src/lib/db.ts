import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'alcoin.db');

// Ensure db directory exists
import fs from 'fs';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- USERS (combines auth.users + profiles)
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      email           TEXT UNIQUE NOT NULL,
      password_hash   TEXT NOT NULL,
      full_name       TEXT NOT NULL DEFAULT '',
      username        TEXT UNIQUE NOT NULL,
      phone           TEXT NOT NULL DEFAULT '',
      role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      is_activated    INTEGER NOT NULL DEFAULT 0,
      activated_at    TEXT,
      activation_code_id TEXT,
      referred_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      referral_code   TEXT UNIQUE NOT NULL,
      profile_picture TEXT,
      bank_name       TEXT,
      bank_account    TEXT,
      bank_account_name TEXT,
      email_verified  INTEGER NOT NULL DEFAULT 0,
      otp_code        TEXT,
      otp_expires_at  TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- WALLETS
    CREATE TABLE IF NOT EXISTS wallets (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL CHECK (type IN ('reward', 'deposit', 'profit')),
      balance    REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, type)
    );

    -- ACTIVATION CODES
    CREATE TABLE IF NOT EXISTS activation_codes (
      id           TEXT PRIMARY KEY,
      code         TEXT UNIQUE NOT NULL,
      value        REAL NOT NULL DEFAULT 5000,
      status       TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'disabled')),
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      redeemed_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
      redeemed_at  TEXT
    );

    -- DEPOSIT CODES
    CREATE TABLE IF NOT EXISTS deposit_codes (
      id           TEXT PRIMARY KEY,
      code         TEXT UNIQUE NOT NULL,
      amount       REAL NOT NULL,
      status       TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'disabled')),
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      redeemed_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
      redeemed_at  TEXT
    );

    -- ADS
    CREATE TABLE IF NOT EXISTS ads (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      thumbnail  TEXT NOT NULL,
      duration   INTEGER NOT NULL,
      reward     REAL NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- AD VIEWS
    CREATE TABLE IF NOT EXISTS ad_views (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ad_id      TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
      completed  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, ad_id)
    );

    -- TASKS
    CREATE TABLE IF NOT EXISTS tasks (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      instructions   TEXT NOT NULL,
      reward         REAL NOT NULL,
      requires_proof INTEGER NOT NULL DEFAULT 0,
      is_active      INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- TASK SUBMISSIONS
    CREATE TABLE IF NOT EXISTS task_submissions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      proof      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, task_id)
    );

    -- TRADES
    CREATE TABLE IF NOT EXISTS trades (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      funding_wallet    TEXT NOT NULL CHECK (funding_wallet IN ('reward', 'deposit', 'profit')),
      prediction        TEXT NOT NULL CHECK (prediction IN ('buy', 'sell')),
      amount            REAL NOT NULL,
      payout_multiplier REAL NOT NULL,
      duration          INTEGER NOT NULL,
      result            TEXT CHECK (result IN ('win', 'loss')),
      profit            REAL,
      start_price       REAL,
      end_price         REAL,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- WITHDRAWALS
    CREATE TABLE IF NOT EXISTS withdrawals (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wallet     TEXT NOT NULL CHECK (wallet IN ('reward', 'deposit', 'profit')),
      amount     REAL NOT NULL,
      status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- NOTIFICATIONS
    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      message    TEXT NOT NULL,
      is_read    INTEGER NOT NULL DEFAULT 0,
      type       TEXT NOT NULL DEFAULT 'info',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ANNOUNCEMENTS
    CREATE TABLE IF NOT EXISTS announcements (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      message    TEXT NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- AUDIT LOGS
    CREATE TABLE IF NOT EXISTS audit_logs (
      id         TEXT PRIMARY KEY,
      user_id    TEXT,
      action     TEXT NOT NULL,
      details    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- INDEXES
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
    CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
    CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_ad_views_user_ad ON ad_views(user_id, ad_id);
    CREATE INDEX IF NOT EXISTS idx_task_submissions_user_task ON task_submissions(user_id, task_id);
    CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  `);
}

// ============================================================
// Helper: map a snake_case user row to the app's camelCase format
// ============================================================
export function mapProfileRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email || '',
    phone: row.phone,
    role: row.role,
    isActivated: Boolean(row.is_activated),
    activatedAt: row.activated_at,
    referralCode: row.referral_code,
    profilePicture: row.profile_picture,
    bankName: row.bank_name,
    bankAccount: row.bank_account,
    bankAccountName: row.bank_account_name,
    createdAt: row.created_at,
  };
}

// ============================================================
// Helper: update the updated_at timestamp
// ============================================================
export function touchUpdated(db: Database.Database, table: string, id: string) {
  db.prepare(`UPDATE ${table} SET updated_at = datetime('now') WHERE id = ?`).run(id);
}

// ============================================================
// Helper: insert audit log
// ============================================================
export function insertAuditLog(db: Database.Database, userId: string, action: string, details?: string) {
  db.prepare(
    'INSERT INTO audit_logs (id, user_id, action, details) VALUES (?, ?, ?, ?)'
  ).run(crypto.randomUUID(), userId, action, details || null);
}

// ============================================================
// Helper: insert notification
// ============================================================
export function insertNotification(db: Database.Database, userId: string, title: string, message: string, type: string = 'info') {
  db.prepare(
    'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), userId, title, message, type);
}

// ============================================================
// Helper: get or create wallets for a user
// ============================================================
export function ensureWallets(db: Database.Database, userId: string) {
  const existing = db.prepare('SELECT * FROM wallets WHERE user_id = ?').all(userId);
  if (existing.length === 0) {
    const insert = db.prepare('INSERT INTO wallets (id, user_id, type, balance) VALUES (?, ?, ?, 0)');
    const types = ['reward', 'deposit', 'profit'];
    const insertMany = db.transaction((userId: string) => {
      for (const type of types) {
        insert.run(crypto.randomUUID(), userId, type);
      }
    });
    insertMany(userId);
    return db.prepare('SELECT * FROM wallets WHERE user_id = ?').all(userId);
  }
  return existing;
}

// ============================================================
// Helper: get user wallets as { reward, deposit, profit }
// ============================================================
export function getWallets(db: Database.Database, userId: string) {
  const rows = ensureWallets(db, userId);
  const wallets = { reward: 0, deposit: 0, profit: 0 };
  for (const row of rows as Array<Record<string, unknown>>) {
    if (row.type === 'reward') wallets.reward = Number(row.balance);
    if (row.type === 'deposit') wallets.deposit = Number(row.balance);
    if (row.type === 'profit') wallets.profit = Number(row.balance);
  }
  return wallets;
}

// ============================================================
// Pagination helper
// ============================================================
export function paginate(query: string, page: number, limit: number): { paginatedQuery: string; offset: number } {
  const offset = (page - 1) * limit;
  return { paginatedQuery: `${query} LIMIT ? OFFSET ?`, offset };
}

// Boolean conversion for SQLite (0/1 ↔ true/false)
export function bool(val: unknown): boolean {
  return Boolean(val);
}
export function intBool(val: boolean): number {
  return val ? 1 : 0;
}
