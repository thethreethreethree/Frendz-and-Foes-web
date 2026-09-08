// Accounts + sessions for the white-label admin (Phase 2b). Zero external deps — Node's built-in
// crypto only. Passwords are scrypt-hashed; sessions are stateless HMAC-signed cookies (no session
// store to keep or leak); brand ownership maps a slug → the user id that owns it.
//
// STORAGE: SQLite (users and brand_owners in sqlite.js), migrated from data/auth/users.json and
// owners.json. Exports are unchanged, so index.js needed no edits. The legacy JSON is auto-imported
// on first boot if the tables are empty, and is NOT deleted - it stays as backup.
//
// The session SECRET deliberately stays a file, not a DB row: it is a key, not business data, and
// the games must keep running on the default brand even when the database cannot be opened - which
// is also why sqlite.js is imported dynamically here.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = process.env.AUTH_DIR || join(__dirname, "data", "auth");

const USERS_FILE = join(AUTH_DIR, "users.json");
const OWNERS_FILE = join(AUTH_DIR, "owners.json");
const SECRET_FILE = join(AUTH_DIR, "secret");

let db = null;
let logEvent = () => {};
let tx = (fn) => fn();
let hasMigrated = () => false;
let markMigrated = () => {};
let ready = false;
try {
  mkdirSync(AUTH_DIR, { recursive: true });      // still needed: the session secret lives here
  const m = await import("./sqlite.js");
  db = m.db; logEvent = m.logEvent; tx = m.tx;
  hasMigrated = m.hasMigrated; markMigrated = m.markMigrated;
  ready = true;
  console.log("[ff-server] auth store ready (sqlite)");
} catch (err) {
  console.error("[ff-server] auth store DISABLED (accounts off):", err?.message || err);
}
export const authReady = () => ready;

const rowToUser = (r) => (r ? {
  id: r.id, email: r.email, emailLower: r.email_lower, salt: r.salt, hash: r.hash, created: r.created,
} : null);

// --- One-time migration of the legacy JSON ------------------------------------------------------
// Each table imports only when empty, in a transaction: idempotent, and it cannot half-import.
function importLegacyJson() {
  if (!ready) return;
  try {
    if (!hasMigrated("users") &&
        db.prepare("SELECT COUNT(*) AS n FROM users").get().n > 0) {
      markMigrated("users", { backfilled: true });      // live before markers existed
    } else if (!hasMigrated("users") && existsSync(USERS_FILE)) {
      const legacy = JSON.parse(readFileSync(USERS_FILE, "utf8")) || {};
      const rows = Object.values(legacy);
      if (!rows.length) markMigrated("users", { empty: true });   // present but empty: still done
      if (rows.length) {
        tx(() => {
          const ins = db.prepare(
            "INSERT OR IGNORE INTO users (id, email, email_lower, salt, hash, created) VALUES (?, ?, ?, ?, ?, ?)",
          );
          for (const u of rows) {
            ins.run(u.id, u.email, u.emailLower || String(u.email || "").trim().toLowerCase(),
                    u.salt, u.hash, Number(u.created) || Date.now());
          }
        });
        console.log(`[ff-server] migrated ${rows.length} admin account(s) from JSON into SQLite`);
        logEvent("migrate.users", null, { count: rows.length, from: "users.json" });
        markMigrated("users", { migrated: true });
      }
    }
    if (!hasMigrated("brand_owners") &&
        db.prepare("SELECT COUNT(*) AS n FROM brand_owners").get().n > 0) {
      markMigrated("brand_owners", { backfilled: true });      // live before markers existed
    } else if (!hasMigrated("brand_owners") && existsSync(OWNERS_FILE)) {
      const legacy = JSON.parse(readFileSync(OWNERS_FILE, "utf8")) || {};
      const entries = Object.entries(legacy);
      if (!entries.length) markMigrated("brand_owners", { empty: true });   // present but empty: still done
      if (entries.length) {
        tx(() => {
          const ins = db.prepare("INSERT OR IGNORE INTO brand_owners (slug, user_id) VALUES (?, ?)");
          for (const [slug, uid] of entries) ins.run(slug, uid);
        });
        console.log(`[ff-server] migrated ${entries.length} brand owner(s) from JSON into SQLite`);
        logEvent("migrate.brand_owners", null, { count: entries.length, from: "owners.json" });
        markMigrated("brand_owners", { migrated: true });
      }
    }
  } catch (err) {
    console.error("[ff-server] auth JSON migration FAILED:", err?.message || err);
  }
}
importLegacyJson();

// Session-signing secret, persisted so a server restart doesn't log everyone out. Env overrides.
let SECRET;
try {
  if (existsSync(SECRET_FILE)) SECRET = readFileSync(SECRET_FILE);
  else { SECRET = randomBytes(32); writeFileSync(SECRET_FILE, SECRET); }
} catch { SECRET = randomBytes(32); }
if (process.env.AUTH_SECRET) SECRET = Buffer.from(process.env.AUTH_SECRET);

const emailOk = (e) => typeof e === "string" && e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const normEmail = (e) => String(e).trim().toLowerCase();
const publicUser = (u) => ({ id: u.id, email: u.email });

function hashPassword(pw) {
  const salt = randomBytes(16);
  return { salt: salt.toString("hex"), hash: scryptSync(pw, salt, 64).toString("hex") };
}
function verifyPassword(pw, saltHex, hashHex) {
  const computed = scryptSync(pw, Buffer.from(saltHex, "hex"), 64);
  const stored = Buffer.from(hashHex, "hex");
  return computed.length === stored.length && timingSafeEqual(computed, stored);
}

export function createUser(email, password) {
  if (!ready) return { error: "Accounts are unavailable right now." };
  if (!emailOk(email)) return { error: "Enter a valid email address." };
  if (typeof password !== "string" || password.length < 8) return { error: "Password must be at least 8 characters." };
  const emailLower = normEmail(email);
  if (db.prepare("SELECT 1 FROM users WHERE email_lower = ?").get(emailLower)) {
    return { error: "That email is already registered." };
  }
  const id = "u" + randomBytes(9).toString("hex");
  const { salt, hash } = hashPassword(password);
  try {
    db.prepare("INSERT INTO users (id, email, email_lower, salt, hash, created) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, email.trim(), emailLower, salt, hash, Date.now());
  } catch {
    // email_lower is UNIQUE, so a race between two signups lands here rather than duplicating.
    return { error: "That email is already registered." };
  }
  logEvent("user.signup", id, { email: emailLower });
  return { user: publicUser(rowToUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id))) };
}

export function authenticate(email, password) {
  if (!ready) return null;
  const u = rowToUser(db.prepare("SELECT * FROM users WHERE email_lower = ?").get(normEmail(email)));
  if (!u) { try { scryptSync(String(password || ""), "timing", 64); } catch { /* ignore */ } return null; } // blunt user-enumeration timing
  return verifyPassword(String(password || ""), u.salt, u.hash) ? publicUser(u) : null;
}

export function getUser(id) {
  if (!ready) return null;
  const u = rowToUser(db.prepare("SELECT * FROM users WHERE id = ?").get(String(id || "")));
  return u ? publicUser(u) : null;
}

// --- Stateless sessions: base64url(payload) + "." + HMAC(payload) ---
const SESSION_DAYS = 30;
export const SESSION_COOKIE = "pz_session";

export function makeSession(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 86400_000 })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
export function readSession(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1));
  const expect = Buffer.from(createHmac("sha256", SECRET).update(payload).digest("base64url"));
  if (sig.length !== expect.length || !timingSafeEqual(sig, expect)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
  if (!data || typeof data.uid !== "string" || typeof data.exp !== "number" || data.exp < Date.now()) return null;
  if (!getUser(data.uid)) return null; // user deleted since
  return { uid: data.uid };
}

// --- Ownership ---
export function ownerOf(slug) {
  if (!ready) return null;
  return db.prepare("SELECT user_id FROM brand_owners WHERE slug = ?").get(String(slug || ""))?.user_id || null;
}
export function setOwner(slug, userId) {
  if (!ready) return;
  db.prepare("INSERT INTO brand_owners (slug, user_id) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET user_id = excluded.user_id")
    .run(slug, userId);
  logEvent("brand.owner_set", userId, { slug });
}
export function removeOwner(slug) {
  if (!ready) return;
  db.prepare("DELETE FROM brand_owners WHERE slug = ?").run(slug);
  logEvent("brand.owner_removed", null, { slug });
}
export function brandsOwnedBy(userId) {
  if (!ready) return [];
  return db.prepare("SELECT slug FROM brand_owners WHERE user_id = ? ORDER BY slug").all(String(userId || ""))
    .map((r) => r.slug);
}

// --- Cookie helpers ---
export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
export function sessionCookie(token, secure = true) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`;
}
export function clearCookie(secure = true) {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
