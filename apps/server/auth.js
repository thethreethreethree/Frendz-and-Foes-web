// Accounts + sessions for the white-label admin (Phase 2b). Zero external deps — Node's built-in
// crypto only. Passwords are scrypt-hashed; sessions are stateless HMAC-signed cookies (no session
// store to keep or leak); brand ownership maps a slug → the user id that owns it.
//
// Storage mirrors db.js: tiny JSON files on the box under data/auth/. Fail-safe: if the dir can't be
// created, accounts report unavailable and the games keep running on the default brand.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = process.env.AUTH_DIR || join(__dirname, "data", "auth");

let ready = false;
try {
  mkdirSync(AUTH_DIR, { recursive: true });
  ready = true;
  console.log(`[ff-server] auth store ready at ${AUTH_DIR}`);
} catch (err) {
  console.error("[ff-server] auth store DISABLED (accounts off):", err?.message || err);
}
export const authReady = () => ready;

const USERS_FILE = join(AUTH_DIR, "users.json");
const OWNERS_FILE = join(AUTH_DIR, "owners.json");
const SECRET_FILE = join(AUTH_DIR, "secret");

function loadJson(f, fallback) {
  try { return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : fallback; } catch { return fallback; }
}
function saveJson(f, obj) {
  const tmp = f + ".tmp";
  writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  renameSync(tmp, f);
}

let users = loadJson(USERS_FILE, {}); // id -> { id, email, emailLower, salt, hash, created }
let owners = loadJson(OWNERS_FILE, {}); // slug -> userId

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
  if (Object.values(users).some((u) => u.emailLower === emailLower)) return { error: "That email is already registered." };
  const id = "u" + randomBytes(9).toString("hex");
  const { salt, hash } = hashPassword(password);
  users[id] = { id, email: email.trim(), emailLower, salt, hash, created: Date.now() };
  saveJson(USERS_FILE, users);
  return { user: publicUser(users[id]) };
}

export function authenticate(email, password) {
  if (!ready) return null;
  const u = Object.values(users).find((x) => x.emailLower === normEmail(email));
  if (!u) { try { scryptSync(String(password || ""), "timing", 64); } catch { /* ignore */ } return null; } // blunt user-enumeration timing
  return verifyPassword(String(password || ""), u.salt, u.hash) ? publicUser(u) : null;
}

export function getUser(id) { const u = users[id]; return u ? publicUser(u) : null; }

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
  if (!users[data.uid]) return null; // user deleted since
  return { uid: data.uid };
}

// --- Ownership ---
export function ownerOf(slug) { return owners[slug] || null; }
export function setOwner(slug, userId) { owners[slug] = userId; saveJson(OWNERS_FILE, owners); }
export function removeOwner(slug) { delete owners[slug]; saveJson(OWNERS_FILE, owners); }
export function brandsOwnedBy(userId) { return Object.entries(owners).filter(([, uid]) => uid === userId).map(([slug]) => slug); }

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
