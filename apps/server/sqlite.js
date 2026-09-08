// The SQLite data backbone. Node's built-in node:sqlite (no native compile) — one file on the box
// (data/playzoo.db), WAL mode for concurrent reads. This replaces the tiny-JSON-file stores for the
// business-critical data (backer accounts, codes, and — later — subscriptions), where transactions
// and integrity actually matter. Each module that moves onto SQLite auto-imports its legacy JSON on
// first boot (idempotent), so a deploy migrates the live data with zero loss.
//
// Everything append-only where it counts: the `events` table is an immutable audit log (§3.1 of the
// project constitution — state changes are recorded as events, never quietly overwritten).

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "playzoo.db");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

db.exec(`
CREATE TABLE IF NOT EXISTS backers (
  id             TEXT PRIMARY KEY,
  username       TEXT NOT NULL,
  username_lower TEXT NOT NULL UNIQUE,
  code           TEXT,              -- normalized backer code bound as this account's login key
  full_name      TEXT,
  dob            TEXT,
  country        TEXT,
  avatar         TEXT,              -- small cropped data URL, or NULL
  enclosure      TEXT,              -- enclosure id, or NULL until sorted
  pw_salt        TEXT,
  pw_hash        TEXT,
  created        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_backers_code ON backers(code);

CREATE TABLE IF NOT EXISTS backer_codes (
  code_norm   TEXT PRIMARY KEY,     -- normalized (uppercase, no separators)
  code        TEXT NOT NULL,        -- display form, e.g. PZ-XXXX-XXXX
  note        TEXT,
  created     INTEGER NOT NULL,
  redeemed_by TEXT,                 -- backer id, or NULL if unused
  redeemed_at INTEGER
);

-- Subscriptions/entitlements — shape exists now; Stripe wiring lands in Phase 2.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                 TEXT PRIMARY KEY,
  backer_id          TEXT NOT NULL,
  plan               TEXT,          -- zoo-pass | founding-animal | head-keeper | NULL
  status             TEXT NOT NULL DEFAULT 'none',  -- none|active|trialing|past_due|canceled
  stripe_customer_id TEXT,
  stripe_sub_id      TEXT,
  current_period_end INTEGER,
  created            INTEGER NOT NULL,
  updated            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sub_backer ON subscriptions(backer_id);

-- Durable key/value marks. Its first job: recording that a JSON->SQLite migration has RUN.
--
-- The migrations originally used "is the table empty?" as the test for "has this migrated?", and
-- those are NOT the same question. Delete every row - which an admin legitimately can - and the next
-- restart re-imports the legacy JSON, resurrecting data that was deliberately removed. Found by the
-- brands test doing exactly that.
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT,
  at    INTEGER NOT NULL
);

-- Brand-admin accounts (auth.js) - distinct from the backers table, which is club members.
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  email_lower TEXT NOT NULL UNIQUE,
  salt        TEXT NOT NULL,
  hash        TEXT NOT NULL,
  created     INTEGER NOT NULL
);

-- Which admin account owns which white-label brand.
CREATE TABLE IF NOT EXISTS brand_owners (
  slug    TEXT PRIMARY KEY,
  user_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_brand_owners_user ON brand_owners(user_id);

-- White-label brand configs, one row per brand (was one JSON file per brand on disk).
CREATE TABLE IF NOT EXISTS brands (
  slug       TEXT PRIMARY KEY,
  config     TEXT NOT NULL,          -- the brand config as JSON
  updated_at INTEGER NOT NULL
);

-- Backer chat. One row per message, replacing a JSON blob that was rewritten IN FULL on every
-- single send: that was O(all messages) per message, and a partial write would have taken the whole
-- room's history with it. speaker is 'backer' | 'rex' | 'john'; backer_id is NULL for the characters.
CREATE TABLE IF NOT EXISTS messages (
  id        TEXT PRIMARY KEY,
  room      TEXT NOT NULL,
  at        INTEGER NOT NULL,
  text      TEXT NOT NULL,
  speaker   TEXT NOT NULL DEFAULT 'backer',
  backer_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_room_at ON messages(room, at);

-- Append-only audit log. Never UPDATE/DELETE — record what happened.
CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       INTEGER NOT NULL,
  type     TEXT NOT NULL,
  actor_id TEXT,
  data     TEXT               -- JSON blob, or NULL
);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
`);

// Has this one-time migration already run? Explicit, because "the table is empty" is not the same
// question - see the meta table's comment.
export function hasMigrated(key) {
  try {
    return !!db.prepare("SELECT 1 FROM meta WHERE key = ?").get("migrated:" + key);
  } catch { return false; }
}

export function markMigrated(key, note = null) {
  try {
    db.prepare("INSERT OR REPLACE INTO meta (key, value, at) VALUES (?, ?, ?)")
      .run("migrated:" + key, note ? JSON.stringify(note) : null, Date.now());
  } catch (err) {
    console.error("[ff-server] could not mark migration", key, err?.message || err);
  }
}

// Add a column to an existing table if it is missing.
//
// CREATE TABLE IF NOT EXISTS above only builds tables that do not exist yet: a database already
// live on the box keeps its ORIGINAL columns forever, so a new field added to the schema literally
// never appears there. Every column added after first deploy has to come through here.
export function ensureColumn(table, column, decl) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (cols.includes(column)) return false;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
    console.log(`[ff-server] schema: added ${table}.${column}`);
    logEvent("schema.add_column", null, { table, column });
    return true;
  } catch (err) {
    console.error(`[ff-server] could not add ${table}.${column}:`, err?.message || err);
    return false;
  }
}

// Record an event. Best-effort — audit logging must never break a request.
export function logEvent(type, actorId = null, data = null) {
  try {
    db.prepare("INSERT INTO events (ts, type, actor_id, data) VALUES (?, ?, ?, ?)")
      .run(Date.now(), String(type), actorId ?? null, data ? JSON.stringify(data) : null);
  } catch { /* swallow */ }
}

// Read the append-only audit log, newest first. Founder-only upstream.
//
// `before` pages backwards by id rather than by offset: ids only ever increase, so a page cannot
// shift under you while new events are being written - which OFFSET paging would allow.
export function listEvents({ limit = 100, before = null, type = null } = {}) {
  const n = Math.max(1, Math.min(500, Number(limit) || 100));
  const where = [];
  const args = [];
  if (before) { where.push("id < ?"); args.push(Number(before)); }
  if (type)   { where.push("type = ?"); args.push(String(type)); }
  const sql = `SELECT id, ts, type, actor_id, data FROM events
               ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY id DESC LIMIT ${n}`;
  return db.prepare(sql).all(...args).map((r) => ({
    id: r.id, ts: r.ts, type: r.type, actorId: r.actor_id,
    data: (() => { try { return r.data ? JSON.parse(r.data) : null; } catch { return null; } })(),
  }));
}

// The distinct event types actually present, for the filter - built from the data rather than a
// hardcoded list, so a new event type appears in the UI the moment something writes one.
export function listEventTypes() {
  return db.prepare("SELECT type, COUNT(*) AS n FROM events GROUP BY type ORDER BY type").all()
    .map((r) => ({ type: r.type, count: r.n }));
}

// True once the DB is open (it is, by the time this module finished importing).
export const dbReady = () => true;

// Run fn inside a transaction (all-or-nothing) — used by migrations + multi-row writes.
export function tx(fn) {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* ignore */ }
    throw e;
  }
}
