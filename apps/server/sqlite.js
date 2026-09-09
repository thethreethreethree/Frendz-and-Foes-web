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
import { mkdirSync, statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "playzoo.db");
// Create the directory the DATABASE actually lives in. Only the default data dir was being created,
// so a DB_PATH pointing anywhere else failed to open - and because index.js imports this module,
// that killed the whole server at boot instead of degrading. Hit while testing exactly that.
mkdirSync(dirname(DB_PATH), { recursive: true });

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

-- Money ledger. APPEND-ONLY, like events: a payment is a fact that happened, and revenue is a
-- QUERY over these rows, never a stored total that can drift out of step with reality.
--
-- A refund is a NEW ROW with a negative amount, never an edit to the original charge. That is what
-- makes history reconstructible: subscriptions.status overwrites itself, so a backer who paid,
-- refunded and resubscribed leaves one row that looks like a single clean subscription.
CREATE TABLE IF NOT EXISTS payments (
  id                TEXT PRIMARY KEY,
  backer_id         TEXT,              -- null for venue/white-label money
  brand_slug        TEXT,              -- null for consumer money
  kind              TEXT NOT NULL,     -- charge | refund | chargeback | payout | manual
  source            TEXT NOT NULL,     -- stripe | kickstarter | bank | comp
  amount_cents      INTEGER NOT NULL,  -- MINOR UNITS as an integer; floats cannot hold money.
                                       -- Refunds and chargebacks are NEGATIVE.
  currency          TEXT NOT NULL DEFAULT 'usd',
  status            TEXT NOT NULL DEFAULT 'succeeded',  -- succeeded | pending | failed
  stripe_event_id   TEXT UNIQUE,       -- IDEMPOTENCY. Stripe retries webhooks; without this a
                                       -- retry books the same charge twice and inflates revenue.
  stripe_object_id  TEXT,              -- pi_… / ch_… / in_…
  description       TEXT,
  occurred          INTEGER NOT NULL,  -- when it happened AT THE SOURCE, not when we saw it, so a
                                       -- late webhook cannot land in the wrong month
  created           INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_occurred ON payments(occurred);
CREATE INDEX IF NOT EXISTS idx_payments_backer ON payments(backer_id);
CREATE INDEX IF NOT EXISTS idx_payments_brand ON payments(brand_slug);

-- What we OWE people. Phase 2 of docs/business-backend-design.md.
--
-- The campaign sells custom characters: Founding Animal ($30) includes one, Head Keeper ($50)
-- includes two, and the FAQ promises them within a month of the campaign closing. Nothing recorded
-- who was owed what, so the list of outstanding promises existed only in the tier definitions --
-- which say how many are owed but never whether any were delivered.
--
-- Unlike payments this table is MUTABLE: a promise is a piece of work that moves through states,
-- not an event that happened. Every transition is written to the events table, which is where the
-- immutable history lives, matching how the subscriptions table already works.
--
-- UNIQUE(backer_id, kind, seq) is the important line. Rows are generated FROM a backer's tier, and
-- that generation runs again every time their entitlements are looked at; without the constraint a
-- Head Keeper would accrue two more character slots on every visit. Same lesson as
-- payments.stripe_event_id: anything derived from a repeatable trigger needs a key that says
-- "this one already exists".
CREATE TABLE IF NOT EXISTS fulfilment (
  id          TEXT PRIMARY KEY,
  backer_id   TEXT NOT NULL,
  kind        TEXT NOT NULL,     -- custom-character | physical | other
  seq         INTEGER NOT NULL DEFAULT 1,   -- "1 of 2", "2 of 2" — what makes a tier's rows distinct
  title       TEXT,
  status      TEXT NOT NULL DEFAULT 'owed', -- owed | briefed | in-progress | review | delivered | cancelled
  due         INTEGER,           -- null until the owner sets a date; NEVER guessed from a
                                 -- campaign close date nobody has told us
  notes       TEXT,
  asset_path  TEXT,              -- where the finished art landed
  created     INTEGER NOT NULL,
  updated     INTEGER NOT NULL,
  UNIQUE(backer_id, kind, seq)
);
CREATE INDEX IF NOT EXISTS idx_fulfilment_status ON fulfilment(status);
CREATE INDEX IF NOT EXISTS idx_fulfilment_backer ON fulfilment(backer_id);
CREATE INDEX IF NOT EXISTS idx_fulfilment_due ON fulfilment(due);

-- What actually happened on a game night. Phase 3 of docs/business-backend-design.md.
--
-- Rooms live in a Map in index.js and vanish on restart, so until now nothing recorded that a game
-- night happened at all: not which game, not how many played, not whether anyone finished. That is
-- unrecoverable by nature -- you cannot backfill a night nobody wrote down -- and it is the single
-- most useful thing to know when deciding which of the fourteen games to build on.
--
-- DELIBERATELY THIN, AND IT MUST STAY THAT WAY. Players join by scanning a QR with no account and
-- never will have one; that is a product decision, not an oversight. So this table must never
-- require identity. peak_players is a COUNT, and player names are not stored at all -- there is no
-- business question here that needs them, and storing them would turn a party game into a system
-- holding data about people who never signed up for anything.
CREATE TABLE IF NOT EXISTS game_sessions (
  id            TEXT PRIMARY KEY,
  room_code     TEXT NOT NULL,
  game          TEXT,              -- trivia | codenames | murder2 | … ; null if a client never said
  brand_slug    TEXT,              -- whose branding was live, for venue reporting
  started       INTEGER NOT NULL,
  ended         INTEGER,           -- null while the room is still live
  peak_players  INTEGER NOT NULL DEFAULT 0,  -- high-water mark, not a running total
  completed     INTEGER NOT NULL DEFAULT 0   -- 1 only if the game actually reached its ending
);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON game_sessions(started);
CREATE INDEX IF NOT EXISTS idx_sessions_game ON game_sessions(game);
CREATE INDEX IF NOT EXISTS idx_sessions_brand ON game_sessions(brand_slug);
-- One LIVE session per room. A room that ends and is reopened is a new night and gets a new row;
-- this only stops a reconnect storm opening five sessions for one game.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_live ON game_sessions(room_code) WHERE ended IS NULL;

-- Named admin accounts. Phase 4 of docs/business-backend-design.md, MOVED UP from fifth on
-- 2026-09-09 because the owner confirmed one or two other people are getting access soon.
--
-- Everyone currently shares one passcode. Two problems follow, and both get worse with every day of
-- shared use rather than staying still:
--   * The audit log cannot say WHO acted. events.actor_id holds a backer id or nothing, so an
--     admin renaming a backer and the backer renaming themselves write identical rows. That history
--     cannot be repaired afterwards -- the information was never captured.
--   * Access cannot be revoked from one person. Changing the passcode changes it for everybody,
--     including the owner.
--
-- The shared passcode SURVIVES as an owner-only override. It is the way back in if the last staff
-- account is lost, and removing it would make this table a single point of lockout.
CREATE TABLE IF NOT EXISTS staff (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  email_lower TEXT NOT NULL UNIQUE,   -- lookups are case-insensitive; the display form is kept
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'readonly',  -- owner | admin | support | readonly
  pw_salt     TEXT NOT NULL,
  pw_hash     TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1,        -- deactivated, never deleted: their audit trail
                                                 -- has to keep resolving to a person
  created     INTEGER NOT NULL,
  last_seen   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(active);
`);

// Who performed an action, when it was a member of staff rather than a backer.
//
// A separate column from actor_id on purpose: actor_id holds a BACKER id, and overloading it would
// make "did the backer do this or did an admin do it to them" unanswerable — which is the exact
// question the audit log exists to answer.
ensureColumn("events", "actor_staff_id", "TEXT");

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

// Which JSON->SQLite migrations have run, and whether the legacy file is still on disk.
//
// Exists so the legacy files can be retired on EVIDENCE rather than on memory. Deleting a backup
// because you think a migration ran is how data disappears; this says which ones are provably done.
// Note that a separate deployment (Render) has its OWN database and may not have migrated yet, so
// "done here" is not "done everywhere" - check each environment.
export function legacyStatus(files) {
  return Object.entries(files).map(([key, path]) => {
    let exists = false, bytes = 0;
    try {
      const st = statSync(path);
      exists = true; bytes = st.size;
    } catch { /* not there */ }
    const row = db.prepare("SELECT value, at FROM meta WHERE key = ?").get("migrated:" + key);
    return {
      key, path, exists, bytes,
      migrated: !!row,
      migratedAt: row?.at ?? null,
      detail: (() => { try { return row?.value ? JSON.parse(row.value) : null; } catch { return null; } })(),
      // Only safe to remove once the migration is recorded AND the data is actually in the table.
      safeToRemove: !!row && exists,
    };
  });
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
