// Backer access codes — the one-time keys we hand Kickstarter backers to unlock signup for the
// backers-only group chat (see the backer-chat-system memory). Rex authenticates a code before he
// lets anyone start the sign-up: only a genuine, un-redeemed code gets through. A code is consumed
// (tied to the user id) the moment an account is created against it, so it can't be reused.
//
// STORAGE: SQLite (`backer_codes` in sqlite.js), migrated from the original tiny-JSON-file store.
// The legacy JSON is auto-imported on first boot if the table is empty, so a deploy migrates live
// data with zero loss and re-running is a no-op. The JSON file is NOT deleted — it stays as backup.
//
// Exports are unchanged from the JSON version: index.js needs no edits.
//
// Fail-safe preserved: if the database can't be opened, codes report unavailable (signup stays
// CLOSED) rather than letting everyone in. sqlite.js is loaded dynamically for exactly this reason —
// a static import that threw would take the whole server down instead of degrading this one feature.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { randomInt } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = process.env.AUTH_DIR || join(__dirname, "data", "auth");
const CODES_FILE = join(AUTH_DIR, "backer-codes.json");

let db = null;
let logEvent = () => {};
let tx = (fn) => fn();
let ready = false;
try {
  const m = await import("./sqlite.js");
  db = m.db; logEvent = m.logEvent; tx = m.tx;
  ready = true;
} catch (err) {
  console.error("[ff-server] backer-code store DISABLED:", err?.message || err);
}
export const backerCodesReady = () => ready;

// Human-friendly, unambiguous alphabet: no 0/O/1/I/L so a backer can read a code off a screen without
// second-guessing. Format PZ-XXXX-XXXX (8 chars of entropy ~= 1.1e12 combos; the /check endpoint is
// rate-limited, so guessing is infeasible).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const normalize = (raw) => String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// --- One-time migration of the legacy JSON store -------------------------------------------------
// Runs only when the table is empty, so it is idempotent: first boot after deploy imports, every
// boot after that does nothing. Wrapped in a transaction — a partial import would be worse than none.
function importLegacyJson() {
  if (!ready) return;
  try {
    const n = db.prepare("SELECT COUNT(*) AS n FROM backer_codes").get().n;
    if (n > 0) return;                       // already migrated (or already in use) — leave it alone
    if (!existsSync(CODES_FILE)) return;     // nothing to migrate: a fresh install
    const legacy = JSON.parse(readFileSync(CODES_FILE, "utf8"));
    const rows = Object.entries(legacy || {});
    if (!rows.length) return;
    tx(() => {
      const ins = db.prepare(
        `INSERT OR IGNORE INTO backer_codes (code_norm, code, note, created, redeemed_by, redeemed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      for (const [key, r] of rows) {
        ins.run(
          key,
          String(r?.code || key),
          r?.note ?? null,
          Number(r?.created) || Date.now(),
          r?.redeemedBy ?? null,
          r?.redeemedAt ?? null,
        );
      }
    });
    console.log(`[ff-server] migrated ${rows.length} backer code(s) from JSON into SQLite`);
    logEvent("migrate.codes", null, { count: rows.length, from: "backer-codes.json" });
  } catch (err) {
    console.error("[ff-server] backer-code JSON migration FAILED:", err?.message || err);
  }
}
importLegacyJson();

function mintOne() {
  let body = "";
  for (let i = 0; i < 8; i++) body += ALPHABET[randomInt(ALPHABET.length)];
  return `PZ-${body.slice(0, 4)}-${body.slice(4)}`; // display form
}

// Mint `count` fresh, unique codes. Returns the display strings (with dashes). Founder-only upstream.
export function generateCodes(count = 1, note = "") {
  if (!ready) return { error: "Code store unavailable." };
  const n = Math.max(1, Math.min(500, Number(count) || 1));
  const out = [];
  const exists = db.prepare("SELECT 1 FROM backer_codes WHERE code_norm = ?");
  const ins = db.prepare(
    `INSERT INTO backer_codes (code_norm, code, note, created, redeemed_by, redeemed_at)
     VALUES (?, ?, ?, ?, NULL, NULL)`,
  );
  const cleanNote = String(note || "").slice(0, 80);
  tx(() => {
    for (let i = 0; i < n; i++) {
      let display, key;
      do { display = mintOne(); key = normalize(display); } while (exists.get(key));
      ins.run(key, display, cleanNote, Date.now());
      out.push(display);
    }
  });
  logEvent("codes.mint", null, { count: out.length, note: cleanNote });
  return { codes: out };
}

// 'valid' (exists + unused), 'used' (already redeemed), or 'unknown' (not a real code).
export function checkCode(code) {
  if (!ready) return "unknown";
  const rec = db.prepare("SELECT redeemed_by FROM backer_codes WHERE code_norm = ?").get(normalize(code));
  if (!rec) return "unknown";
  return rec.redeemed_by ? "used" : "valid";
}

// Consume a code for a user at account creation. Returns { ok } or { error }.
// The UPDATE carries `redeemed_by IS NULL` in its WHERE clause so the claim is atomic: two
// simultaneous signups against the same code cannot both succeed, which a read-then-write could
// allow. changes === 0 means someone else got there first (or the code was never real).
export function redeemCode(code, userId) {
  if (!ready) return { error: "Code store unavailable." };
  const key = normalize(code);
  const rec = db.prepare("SELECT redeemed_by FROM backer_codes WHERE code_norm = ?").get(key);
  if (!rec) return { error: "That backer code isn't one of ours." };
  if (rec.redeemed_by) return { error: "That backer code has already been used." };
  const res = db
    .prepare("UPDATE backer_codes SET redeemed_by = ?, redeemed_at = ? WHERE code_norm = ? AND redeemed_by IS NULL")
    .run(userId, Date.now(), key);
  if (!res.changes) return { error: "That backer code has already been used." };
  logEvent("codes.redeem", userId, { code: key });
  return { ok: true };
}

// Founder view: every code + its state (for the admin list). Never exposed publicly.
export function listCodes() {
  if (!ready) return [];
  return db
    .prepare("SELECT code, note, created, redeemed_by, redeemed_at FROM backer_codes ORDER BY created DESC")
    .all()
    .map((r) => ({
      code: r.code, note: r.note, created: r.created,
      state: r.redeemed_by ? "used" : "valid", redeemedBy: r.redeemed_by, redeemedAt: r.redeemed_at,
    }));
}
