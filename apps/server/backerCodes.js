// Backer access codes — the one-time keys we hand Kickstarter backers to unlock signup for the
// backers-only group chat (see the backer-chat-system memory). Rex authenticates a code before he
// lets anyone start the sign-up: only a genuine, un-redeemed code gets through. A code is consumed
// (tied to the user id) the moment an account is created against it, so it can't be reused.
//
// Zero deps, same tiny-JSON-file storage as auth.js/db.js. Fail-safe: if the store can't be created,
// codes report unavailable (signup stays closed) rather than letting everyone in.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { randomInt } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = process.env.AUTH_DIR || join(__dirname, "data", "auth");
const CODES_FILE = join(AUTH_DIR, "backer-codes.json");

let ready = false;
try {
  mkdirSync(AUTH_DIR, { recursive: true });
  ready = true;
} catch (err) {
  console.error("[ff-server] backer-code store DISABLED:", err?.message || err);
}
export const backerCodesReady = () => ready;

function loadJson(f, fallback) {
  try { return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : fallback; } catch { return fallback; }
}
function saveJson(f, obj) {
  const tmp = f + ".tmp";
  writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  renameSync(tmp, f);
}

let codes = loadJson(CODES_FILE, {}); // NORMALIZED code -> { code, created, redeemedBy, redeemedAt, note }

// Human-friendly, unambiguous alphabet: no 0/O/1/I/L so a backer can read a code off a screen without
// second-guessing. Format PZ-XXXX-XXXX (8 chars of entropy ~= 1.1e12 combos; the /check endpoint is
// rate-limited, so guessing is infeasible).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const normalize = (raw) => String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

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
  for (let i = 0; i < n; i++) {
    let display, key;
    do { display = mintOne(); key = normalize(display); } while (codes[key]);
    codes[key] = { code: display, created: Date.now(), redeemedBy: null, redeemedAt: null, note: String(note || "").slice(0, 80) };
    out.push(display);
  }
  saveJson(CODES_FILE, codes);
  return { codes: out };
}

// 'valid' (exists + unused), 'used' (already redeemed), or 'unknown' (not a real code).
export function checkCode(code) {
  const rec = codes[normalize(code)];
  if (!rec) return "unknown";
  return rec.redeemedBy ? "used" : "valid";
}

// Consume a code for a user at account creation. Returns { ok } or { error }.
export function redeemCode(code, userId) {
  if (!ready) return { error: "Code store unavailable." };
  const key = normalize(code);
  const rec = codes[key];
  if (!rec) return { error: "That backer code isn't one of ours." };
  if (rec.redeemedBy) return { error: "That backer code has already been used." };
  rec.redeemedBy = userId;
  rec.redeemedAt = Date.now();
  saveJson(CODES_FILE, codes);
  return { ok: true };
}

// Founder view: every code + its state (for a future admin list). Never exposed publicly.
export function listCodes() {
  return Object.values(codes).map((r) => ({
    code: r.code, note: r.note, created: r.created,
    state: r.redeemedBy ? "used" : "valid", redeemedBy: r.redeemedBy, redeemedAt: r.redeemedAt,
  }));
}
