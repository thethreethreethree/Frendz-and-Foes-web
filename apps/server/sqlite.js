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

// Record an event. Best-effort — audit logging must never break a request.
export function logEvent(type, actorId = null, data = null) {
  try {
    db.prepare("INSERT INTO events (ts, type, actor_id, data) VALUES (?, ?, ?, ?)")
      .run(Date.now(), String(type), actorId ?? null, data ? JSON.stringify(data) : null);
  } catch { /* swallow */ }
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
