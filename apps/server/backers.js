// Backer accounts — the members of the backers-only group chat (see the backer-chat-system memory).
// Distinct from auth.js (which is brand-admin accounts): a backer signs up with a one-time backer
// CODE, which then becomes their login key. After signup they can optionally set a password to log
// in with username + password instead. Each backer carries a profile + an enclosure.
//
// STORAGE: SQLite (`backers` in sqlite.js), migrated from the original tiny-JSON-file store. The
// legacy JSON is auto-imported on first boot if the table is empty, so a deploy migrates live data
// with zero loss and re-running is a no-op. The JSON file is NOT deleted — it stays as backup.
//
// Exports are unchanged from the JSON version: index.js needs no edits. Records handed to callers
// keep their original camelCase shape (fullName, usernameLower, pwHash, ...) even though the columns
// are snake_case, so nothing downstream has to know the storage changed.
//
// Fail-safe preserved: if the database can't be opened, backers report unavailable rather than
// half-working. sqlite.js is loaded dynamically for exactly that reason — a static import that threw
// would take the whole server down instead of degrading this one feature.
//
// Sessions are unchanged: HMAC-signed cookie, secret persisted on disk so a restart doesn't sign
// everyone out. That secret deliberately stays a file, not a DB row — it is a key, not business data.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { ENCLOSURE_IDS } from "./enclosures.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = process.env.AUTH_DIR || join(__dirname, "data", "auth");
const BACKERS_FILE = join(AUTH_DIR, "backers.json");
const SECRET_FILE = join(AUTH_DIR, "backer-secret");

let db = null;
let logEvent = () => {};
let tx = (fn) => fn();
let ready = false;
try {
  mkdirSync(AUTH_DIR, { recursive: true });        // still needed: the session secret lives here
  const m = await import("./sqlite.js");
  db = m.db; logEvent = m.logEvent; tx = m.tx;
  ready = true;
} catch (err) {
  console.error("[ff-server] backer store DISABLED:", err?.message || err);
}
export const backersReady = () => ready;

// Session secret (persisted so a restart doesn't sign everyone out). Separate cookie from admin auth.
let SECRET;
try {
  if (existsSync(SECRET_FILE)) SECRET = readFileSync(SECRET_FILE);
  else { SECRET = randomBytes(32); writeFileSync(SECRET_FILE, SECRET); }
} catch { SECRET = randomBytes(32); }
if (process.env.BACKER_SECRET) SECRET = Buffer.from(process.env.BACKER_SECRET);

const normCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const normUser = (u) => String(u || "").trim().toLowerCase();

// Username: 3-20 chars, letters/numbers/_ . - , must start with a letter or number.
const usernameOk = (u) => typeof u === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,19}$/.test(u.trim());
// Avatar is a small cropped data URL (image/jpeg|png|webp). Cap keeps rows lean.
const AVATAR_MAX = 300_000; // ~300KB of base64
const avatarOk = (a) => a == null || (typeof a === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(a) && a.length <= AVATAR_MAX);
// DOB: YYYY-MM-DD, a real-ish past date.
const dobOk = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d) < new Date();

// snake_case row -> the camelCase record every caller already expects. One place, so a column rename
// can never silently reshape what the rest of the server sees.
const rowToBacker = (r) => (r ? {
  id: r.id, code: r.code, username: r.username, usernameLower: r.username_lower,
  fullName: r.full_name, dob: r.dob, country: r.country, avatar: r.avatar,
  enclosure: r.enclosure, pwSalt: r.pw_salt, pwHash: r.pw_hash, created: r.created,
} : null);

// --- One-time migration of the legacy JSON store -------------------------------------------------
// Runs only when the table is empty, so it is idempotent: first boot after deploy imports, every
// boot after that does nothing. Wrapped in a transaction — a half-imported account list would be
// worse than none, because the "is it empty?" guard would then never fire again.
function importLegacyJson() {
  if (!ready) return;
  try {
    const n = db.prepare("SELECT COUNT(*) AS n FROM backers").get().n;
    if (n > 0) return;                          // already migrated (or already in use)
    if (!existsSync(BACKERS_FILE)) return;      // nothing to migrate: a fresh install
    const legacy = JSON.parse(readFileSync(BACKERS_FILE, "utf8"));
    const rows = Object.values(legacy || {});
    if (!rows.length) return;
    tx(() => {
      const ins = db.prepare(
        `INSERT OR IGNORE INTO backers
           (id, username, username_lower, code, full_name, dob, country, avatar, enclosure,
            pw_salt, pw_hash, created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const b of rows) {
        ins.run(
          b.id,
          b.username,
          b.usernameLower || normUser(b.username),
          b.code ?? null,
          b.fullName ?? null,
          b.dob ?? null,
          b.country ?? null,
          b.avatar ?? null,
          b.enclosure ?? null,
          b.pwSalt ?? null,
          b.pwHash ?? null,
          Number(b.created) || Date.now(),
        );
      }
    });
    console.log(`[ff-server] migrated ${rows.length} backer account(s) from JSON into SQLite`);
    logEvent("migrate.backers", null, { count: rows.length, from: "backers.json" });
  } catch (err) {
    console.error("[ff-server] backer JSON migration FAILED:", err?.message || err);
  }
}
importLegacyJson();

// What we send to the client — never the password hash/salt.
export function publicBacker(b) {
  if (!b) return null;
  return {
    id: b.id, username: b.username, fullName: b.fullName, dob: b.dob, country: b.country,
    avatar: b.avatar || null, enclosure: b.enclosure || null, hasPassword: !!b.pwHash, created: b.created,
  };
}

export const getBacker = (id) =>
  ready ? rowToBacker(db.prepare("SELECT * FROM backers WHERE id = ?").get(String(id || ""))) : null;

export const findBackerByCode = (code) =>
  ready ? rowToBacker(db.prepare("SELECT * FROM backers WHERE code = ?").get(normCode(code))) : null;

export const findBackerByUsername = (u) =>
  ready ? rowToBacker(db.prepare("SELECT * FROM backers WHERE username_lower = ?").get(normUser(u))) : null;

// Create a backer at signup. `code` must already be validated + about to be redeemed by the caller.
export function createBacker({ code, username, fullName, dob, country, avatar }) {
  if (!ready) return { error: "Sign-ups are unavailable right now." };
  const uname = String(username || "").trim();
  if (!usernameOk(uname)) return { error: "Username must be 3-20 characters: letters, numbers, . _ -" };
  if (findBackerByUsername(uname)) return { error: "That username is taken." };
  const fn = String(fullName || "").trim();
  if (fn.length < 1 || fn.length > 80) return { error: "Enter your full name." };
  if (!dobOk(dob)) return { error: "Enter a valid date of birth." };
  const ctry = String(country || "").trim();
  if (ctry.length < 2 || ctry.length > 60) return { error: "Pick your country." };
  if (!avatarOk(avatar)) return { error: "That profile picture is too large or the wrong format." };
  if (findBackerByCode(code)) return { error: "That backer code is already tied to an account." };

  const id = "b" + randomBytes(9).toString("hex");
  try {
    db.prepare(
      `INSERT INTO backers
         (id, username, username_lower, code, full_name, dob, country, avatar, enclosure,
          pw_salt, pw_hash, created)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
    ).run(id, uname, normUser(uname), normCode(code), fn, dob, ctry, avatar || null, Date.now());
  } catch (err) {
    // username_lower is UNIQUE, so a race between two signups on the same name lands here rather
    // than creating a duplicate. Report it as the ordinary "taken" message.
    console.error("[ff-server] createBacker failed:", err?.message || err);
    return { error: "That username is taken." };
  }
  logEvent("backer.signup", id, { username: uname, country: ctry });
  return { backer: publicBacker(getBacker(id)) };
}

// Edit profile after signup: change username and/or avatar. Pass only the fields to change.
export function updateBacker(id, { username, avatar } = {}) {
  if (!ready) return { error: "No such account." };
  const b = getBacker(id);
  if (!b) return { error: "No such account." };
  if (username !== undefined) {
    const uname = String(username || "").trim();
    if (!usernameOk(uname)) return { error: "Username must be 3-20 characters: letters, numbers, . _ -" };
    const existing = findBackerByUsername(uname);
    if (existing && existing.id !== id) return { error: "That username is taken." };
    db.prepare("UPDATE backers SET username = ?, username_lower = ? WHERE id = ?")
      .run(uname, normUser(uname), id);
  }
  if (avatar !== undefined) {
    if (!avatarOk(avatar)) return { error: "That profile picture is too large or the wrong format." };
    db.prepare("UPDATE backers SET avatar = ? WHERE id = ?").run(avatar || null, id);
  }
  logEvent("backer.update", id, { username: username !== undefined, avatar: avatar !== undefined });
  return { backer: publicBacker(getBacker(id)) };
}

// Optional password, set AFTER signup so they can log in with username+password too.
export function setBackerPassword(id, password) {
  if (!ready) return { error: "No such account." };
  const b = getBacker(id);
  if (!b) return { error: "No such account." };
  if (typeof password !== "string" || password.length < 8) return { error: "Password must be at least 8 characters." };
  const salt = randomBytes(16);
  db.prepare("UPDATE backers SET pw_salt = ?, pw_hash = ? WHERE id = ?")
    .run(salt.toString("hex"), scryptSync(password, salt, 64).toString("hex"), id);
  logEvent("backer.password_set", id);
  return { ok: true };
}

export function verifyBackerPassword(id, password) {
  const b = getBacker(id);
  if (!b || !b.pwHash) return false;
  const computed = scryptSync(String(password || ""), Buffer.from(b.pwSalt, "hex"), 64);
  const stored = Buffer.from(b.pwHash, "hex");
  return computed.length === stored.length && timingSafeEqual(computed, stored);
}

// Assign an enclosure (the sorting flow). id must be a canonical enclosure id.
export function setBackerEnclosure(id, enclosureId) {
  if (!ready) return { error: "No such account." };
  if (!getBacker(id)) return { error: "No such account." };
  if (!ENCLOSURE_IDS.includes(enclosureId)) return { error: "Unknown enclosure." };
  db.prepare("UPDATE backers SET enclosure = ? WHERE id = ?").run(enclosureId, id);
  logEvent("backer.sorted", id, { enclosure: enclosureId });
  return { ok: true };
}

// --- Sessions: base64url(payload) + "." + HMAC(payload), own cookie ---
const SESSION_DAYS = 60;
export const BACKER_COOKIE = "pz_backer";
export function makeBackerSession(id) {
  const payload = Buffer.from(JSON.stringify({ uid: id, exp: Date.now() + SESSION_DAYS * 86400_000 })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
export function readBackerSession(token) {
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
  if (!getBacker(data.uid)) return null;   // account deleted since the cookie was issued
  return { uid: data.uid };
}
export function backerCookie(token, secure = true) {
  return `${BACKER_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`;
}
export function clearBackerCookie(secure = true) {
  return `${BACKER_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
