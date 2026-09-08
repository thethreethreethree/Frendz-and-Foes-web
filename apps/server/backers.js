// Backer accounts — the members of the backers-only group chat (see the backer-chat-system memory).
// Distinct from auth.js (which is brand-admin accounts): a backer signs up with a one-time backer
// CODE, which then becomes their login key. After signup they can optionally set a password to log
// in with username + password instead. Each backer carries a profile + (later) an enclosure.
//
// Zero deps; same tiny-JSON-file storage + HMAC-cookie sessions as auth.js. Fail-safe: if the store
// can't be created, backers report unavailable rather than half-working.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { ENCLOSURE_IDS } from "./enclosures.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = process.env.AUTH_DIR || join(__dirname, "data", "auth");
const BACKERS_FILE = join(AUTH_DIR, "backers.json");
const SECRET_FILE = join(AUTH_DIR, "backer-secret");

let ready = false;
try { mkdirSync(AUTH_DIR, { recursive: true }); ready = true; }
catch (err) { console.error("[ff-server] backer store DISABLED:", err?.message || err); }
export const backersReady = () => ready;

function loadJson(f, fallback) {
  try { return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : fallback; } catch { return fallback; }
}
function saveJson(f, obj) {
  const tmp = f + ".tmp";
  writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  renameSync(tmp, f);
}

let backers = loadJson(BACKERS_FILE, {}); // id -> backer record

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
// Avatar is a small cropped data URL (image/jpeg|png|webp). Cap keeps the JSON store lean.
const AVATAR_MAX = 300_000; // ~300KB of base64
const avatarOk = (a) => a == null || (typeof a === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(a) && a.length <= AVATAR_MAX);
// DOB: YYYY-MM-DD, a real-ish past date.
const dobOk = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d) < new Date();

// What we send to the client — never the password hash/salt.
export function publicBacker(b) {
  if (!b) return null;
  return {
    id: b.id, username: b.username, fullName: b.fullName, dob: b.dob, country: b.country,
    avatar: b.avatar || null, enclosure: b.enclosure || null, hasPassword: !!b.pwHash, created: b.created,
  };
}

export const getBacker = (id) => backers[id] || null;
export const findBackerByCode = (code) => Object.values(backers).find((b) => b.code === normCode(code)) || null;
export const findBackerByUsername = (u) => Object.values(backers).find((b) => b.usernameLower === normUser(u)) || null;

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
  backers[id] = {
    id, code: normCode(code), username: uname, usernameLower: normUser(uname),
    fullName: fn, dob, country: ctry, avatar: avatar || null,
    enclosure: null, pwSalt: null, pwHash: null, created: Date.now(),
  };
  saveJson(BACKERS_FILE, backers);
  return { backer: publicBacker(backers[id]) };
}

// Edit profile after signup: change username and/or avatar. Pass only the fields to change.
export function updateBacker(id, { username, avatar } = {}) {
  const b = backers[id];
  if (!b) return { error: "No such account." };
  if (username !== undefined) {
    const uname = String(username || "").trim();
    if (!usernameOk(uname)) return { error: "Username must be 3-20 characters: letters, numbers, . _ -" };
    const existing = findBackerByUsername(uname);
    if (existing && existing.id !== id) return { error: "That username is taken." };
    b.username = uname;
    b.usernameLower = normUser(uname);
  }
  if (avatar !== undefined) {
    if (!avatarOk(avatar)) return { error: "That profile picture is too large or the wrong format." };
    b.avatar = avatar || null;
  }
  saveJson(BACKERS_FILE, backers);
  return { backer: publicBacker(b) };
}

// Optional password, set AFTER signup so they can log in with username+password too.
export function setBackerPassword(id, password) {
  const b = backers[id];
  if (!b) return { error: "No such account." };
  if (typeof password !== "string" || password.length < 8) return { error: "Password must be at least 8 characters." };
  const salt = randomBytes(16);
  b.pwSalt = salt.toString("hex");
  b.pwHash = scryptSync(password, salt, 64).toString("hex");
  saveJson(BACKERS_FILE, backers);
  return { ok: true };
}
export function verifyBackerPassword(id, password) {
  const b = backers[id];
  if (!b || !b.pwHash) return false;
  const computed = scryptSync(String(password || ""), Buffer.from(b.pwSalt, "hex"), 64);
  const stored = Buffer.from(b.pwHash, "hex");
  return computed.length === stored.length && timingSafeEqual(computed, stored);
}

// Assign an enclosure (called by the sorting flow, built next). id must be a canonical enclosure id.
export function setBackerEnclosure(id, enclosureId) {
  const b = backers[id];
  if (!b) return { error: "No such account." };
  if (!ENCLOSURE_IDS.includes(enclosureId)) return { error: "Unknown enclosure." };
  b.enclosure = enclosureId;
  saveJson(BACKERS_FILE, backers);
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
  if (!backers[data.uid]) return null;
  return { uid: data.uid };
}
export function backerCookie(token, secure = true) {
  return `${BACKER_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`;
}
export function clearBackerCookie(secure = true) {
  return `${BACKER_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
