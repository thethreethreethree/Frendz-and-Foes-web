// Frendz and Foes — real-time relay server.
//
// Deliberately "dumb": it does NOT run the game engine. The host phone is the single source of
// truth; this server just keeps the last snapshot per room and fans out updates so the display
// (and spectators) stay in lockstep. Two message kinds:
//   - "sync"  : the authoritative game snapshot { state, buzzersArmed }. Stored + relayed, and
//               replayed to anyone who joins late (so a refreshed display catches up instantly).
//   - "pulse" : one-shot cues that aren't game state (sfx, banner, timer start/stop). Relayed,
//               never stored.
// Presence counts are broadcast so each side can show a live connection status.

import "./env.js"; // MUST be first — loads .env into process.env before any module reads it.
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import { Server } from "socket.io";
// Murder Mystery: The Villagers — the 100-character roster with item-set card art. This replaced the
// earlier 30-character mode (retired 2026-07-17; its last state is commit 1705229). The `murder2`
// filenames are historical: there is only one murder game now, reached as ?game=murder.
import { registerMurder2Handlers } from "./murder2.js";
import { registerCodenamesHandlers } from "./codenames.js";
import { registerJustOneHandlers } from "./justone.js";
import { registerBallparkHandlers } from "./ballpark.js";
import { registerTelestrationsHandlers } from "./telestrations.js";
import { registerAfterDarkHandlers } from "./afterdark.js";
import { hostLine, hostChat, hostReady } from "./host.js";
import { johnChat, johnReady } from "./john.js";
import { generateCodes, checkCode, redeemCode, listCodes, revokeCode, backerCodesReady } from "./backerCodes.js";
// The database-backed modules are loaded DEFENSIVELY, not with a static import.
//
// Every store (backers, codes, chat, auth, brands) already wraps its own `await import("./sqlite.js")`
// in a try/catch, precisely so "a storage problem never takes down the games" - the principle written
// into db.js from the start. Importing sqlite.js statically HERE quietly undid that: an unopenable
// database (bad permissions, full disk) would throw during module evaluation and kill the whole
// server, taking the game relay down with it.
//
// Loaded this way, a database failure costs the founder tools and subscriptions - which need it -
// while the games, which do not, keep running.
let SQL = null;
let SUBS = null;
try {
  SQL = await import("./sqlite.js");
  SUBS = await import("./subscriptions.js");
} catch (err) {
  console.error("[ff-server] database unavailable - founder tools and subscriptions are OFF:", err?.message || err);
}
const dbUp = () => !!(SQL && SUBS);
// 503, not 500: the request was fine, the dependency is not, and it may well be back next time.
const needDb = (res) => {
  if (dbUp()) return false;
  res.status(503).json({ error: "The database is unavailable right now." });
  return true;
};
const PLANS = () => (SUBS ? SUBS.PLANS : {});
import { stripeConfigured, verifyStripeSignature } from "./stripe.js";
import {
  createBacker, getBacker, findBackerByCode, findBackerByUsername,
  setBackerPassword, verifyBackerPassword, setBackerEnclosure, updateBacker, publicBacker,
  makeBackerSession, readBackerSession, backerCookie, clearBackerCookie, BACKER_COOKIE, backersReady,
  listBackers, adminGetBacker, adminClearPassword,
} from "./backers.js";
import { sortQuestions, sortInto } from "./sorting.js";
import { getEnclosure } from "./enclosures.js";
import { makeFounderPass, founderFromCookieHeader, founderCookie, clearFounderCookie,
         FOUNDER_PASS_HOURS } from "./founderPass.js";
import { canAccess, getMessages, addMessage, addRexMessage, addJohnMessage, roomMeta, ROOM_IDS, chatStats } from "./chat.js";
import { initBanter, noteMessage as banterNote, forceScene } from "./banter.js";
import { addressedCharacter, ensureTag } from "./mentions.js";
import { getBrand, listBrandSlugs, upsertBrand, deleteBrand, dbReady } from "./db.js";
import {
  authReady, createUser, authenticate, getUser, makeSession, readSession,
  ownerOf, setOwner, removeOwner, brandsOwnedBy,
  SESSION_COOKIE, parseCookies, sessionCookie, clearCookie,
} from "./auth.js";

const PORT = process.env.PORT || 8787;
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.set("trust proxy", 1); // behind nginx — so req.secure reflects X-Forwarded-Proto (Secure cookies)
// --- Stripe webhook -------------------------------------------------------------------------
// Registered BEFORE the global JSON parser, with express.raw(): Stripe's signature covers the exact
// bytes it sent, and once express.json() has parsed and re-serialised them the signature can never
// match again. This is the single door subscription state comes through from Stripe.
//
// Until STRIPE_WEBHOOK_SECRET is set this returns 503 rather than processing anything. Accepting an
// UNVERIFIED webhook would let anyone on the internet grant themselves a subscription by POSTing
// here, so "not configured" must fail closed, never open.
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripeConfigured()) return res.status(503).json({ error: "Stripe is not configured." });
  if (needDb(res)) return;
  const v = verifyStripeSignature(req.body, req.get("stripe-signature"));
  if (!v.ok) {
    console.warn("[ff-server] rejected Stripe webhook:", v.error);
    return res.status(400).json({ error: v.error });
  }
  const r = SUBS.applyStripeEvent(v.event);
  // Always 200 on a VERIFIED event, even if we could not map it to a backer: a non-2xx makes Stripe
  // retry the same event indefinitely, and an event we do not understand will never succeed on a
  // retry. It is logged instead.
  if (r.error) console.warn("[ff-server] Stripe event not applied:", r.error, v.event?.type);
  res.json({ received: true });
});

app.use(express.json({ limit: "256kb" }));
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Pre-launch access gate. The web app reads this at boot to decide whether the games are reachable
// or every entry point funnels to /waitlist instead. Public games stay LOCKED until Kickstarter
// completes: flip GAMES_OPEN=true in the box's .env and restart to open everything at once. The
// client fails CLOSED (treats games as locked) if this can't be reached, so a launch gate never
// fails open.
app.get("/api/status", (req, res) => {
  res.json({
    gamesOpen: process.env.GAMES_OPEN === "true",
    // A valid founder pass opens the games for THIS BROWSER ONLY, while the public gate stays shut.
    founder: !!founderFromCookieHeader(req.headers.cookie),
    // So the client can say WHY hosting is refused instead of showing a dead button.
    enforceEntitlements: process.env.ENFORCE_ENTITLEMENTS === "true",
  });
});

// --- Founder pass ------------------------------------------------------------------------------
// Exchange the admin passcode for a short-lived signed cookie that lets this browser into the games
// before launch. Rate-limited on the SAME bucket as the admin header, so a guesser cannot use this
// door to sidestep the limit on that one.
app.post("/api/founder/pass", (req, res) => {
  if (!ADMIN_PASSCODE) return res.status(503).json({ error: "No admin passcode is configured." });
  const given = req.body && req.body.passcode;
  if (!timingSafeStrEq(given, ADMIN_PASSCODE)) {
    if (rateLimited(req, res, "adminpass", 20, 15 * 60_000)) return;
    return res.status(401).json({ error: "Wrong passcode." });
  }
  const token = makeFounderPass();
  res.setHeader("Set-Cookie", founderCookie(token, isSecure(req)));
  res.json({ ok: true, hours: FOUNDER_PASS_HOURS });
});

app.post("/api/founder/pass/revoke", (req, res) => {
  res.setHeader("Set-Cookie", clearFounderCookie(isSecure(req)));
  res.json({ ok: true });
});

// --- Rex, the AI host --------------------------------------------------------------------------
// The display posts a game "moment"; Rex returns one line of MC banter (Claude, or a canned line
// if no key). Public + best-effort — never blocks a game.
app.post("/api/host", async (req, res) => {
  const { room, game, moment, detail } = req.body || {};
  const out = await hostLine({ room, game, moment, detail });
  res.json({ ...out, ready: hostReady() });
});

// Free-form chat with Rex (the "Chat with Rex" page). Body: { room?, messages: [{role, content}] }
// where role is "user" | "assistant". Returns { reply, source, ready }. Best-effort; never blocks.
app.post("/api/rex-chat", async (req, res) => {
  const { room, messages } = req.body || {};
  const out = await hostChat({ room, messages });
  res.json({ ...out, ready: hostReady() });
});

// John, the schemer — hosts the pre-launch waitlist and subtly pitches the Kickstarter. Same shape
// as Rex's chat, his own persona. Body: { room?, messages: [{role, content}] }.
app.post("/api/john-chat", async (req, res) => {
  // `mode: "agent"` puts John on the support desk (the /ask-john page): same persona, plus the
  // help-them-then-try-to-sell-them-rubbish rules. Absent = the plain waitlist doorman John.
  const { room, messages, mode } = req.body || {};
  const out = await johnChat({ room, messages, mode });
  res.json({ ...out, ready: johnReady() });
});

// --- Accounts (Phase 2b) --------------------------------------------------------------------
// Open self-serve signup; scrypt passwords + stateless HMAC cookie sessions (see auth.js). The
// legacy ADMIN_PASSCODE (below) still works as a superadmin override so the founder keeps god-mode.
const isSecure = (req) => req.secure || req.get("x-forwarded-proto") === "https";
const sessionUser = (req) => {
  const tok = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  const s = tok && readSession(tok);
  return s ? getUser(s.uid) : null;
};

// Simple in-memory per-IP rate limiter for the public auth endpoints (open signup invites abuse).
// req.ip is the real client behind nginx because trust proxy is set above.
const authHits = new Map(); // `${ip}:${bucket}` -> { windowStart, count }
// Evict expired buckets. Without this the map kept one entry per (IP, bucket) FOREVER - every
// visitor who ever tried to sign in, held in memory for the life of the process.
let lastSweep = 0;
function sweepAuthHits(now, windowMs) {
  if (now - lastSweep < 60_000) return;      // at most once a minute; this is cleanup, not accounting
  lastSweep = now;
  for (const [k, v] of authHits) {
    if (now - v.windowStart > Math.max(windowMs, 60 * 60_000)) authHits.delete(k);
  }
}

function rateLimited(req, res, bucket, max, windowMs) {
  const key = `${req.ip}:${bucket}`;
  const now = Date.now();
  sweepAuthHits(now, windowMs);
  const s = authHits.get(key) || { windowStart: now, count: 0 };
  if (now - s.windowStart > windowMs) { s.windowStart = now; s.count = 0; }
  s.count += 1;
  authHits.set(key, s);
  if (s.count > max) {
    res.status(429).json({ error: "Too many attempts — please wait a minute and try again." });
    return true;
  }
  return false;
}

app.post("/api/auth/signup", (req, res) => {
  // Pre-launch gate: public account creation is closed and funnelled to the /waitlist page. The
  // founder can still create accounts by passing the admin passcode (or setting SIGNUPS_OPEN=true).
  // CONSTANT-TIME, and rate-limited on the SAME bucket as the x-admin-passcode header.
  //
  // This used to be a plain `===` with no limit of any kind. The limiter below never ran for a bad
  // passcode because the 403 returned first, so this route was an unlimited, full-speed guessing
  // oracle for the passcode that opens all sixteen founder endpoints AND (since the founder pass)
  // the games. Measured before the fix: 30 wrong guesses, 30 x 403, never a 429.
  const given = req.body && req.body.passcode;
  const founder = !!(ADMIN_PASSCODE && timingSafeStrEq(given, ADMIN_PASSCODE));
  const signupsOpen = process.env.SIGNUPS_OPEN === "true";
  if (!signupsOpen && !founder) {
    // Only a FAILED founder attempt is counted. A visitor who simply hit a closed signup form sent
    // no passcode and must not be pushed toward a lockout for it.
    if (given && rateLimited(req, res, "adminpass", 20, 15 * 60_000)) return;
    return res.status(403).json({ error: "PlayZoo isn't open for new accounts yet — join the waitlist.", waitlist: true });
  }
  if (rateLimited(req, res, "signup", 6, 15 * 60_000)) return; // 6 new accounts / 15 min / IP
  const { email, password } = req.body || {};
  const r = createUser(email, password);
  if (r.error) return res.status(400).json({ error: r.error });
  res.append("Set-Cookie", sessionCookie(makeSession(r.user.id), isSecure(req)));
  res.json({ user: r.user });
});

app.post("/api/auth/login", (req, res) => {
  if (rateLimited(req, res, "login", 12, 10 * 60_000)) return; // 12 tries / 10 min / IP
  const { email, password } = req.body || {};
  const user = authenticate(email, password);
  if (!user) return res.status(401).json({ error: "Wrong email or password." });
  res.append("Set-Cookie", sessionCookie(makeSession(user.id), isSecure(req)));
  res.json({ user });
});

app.post("/api/auth/logout", (req, res) => {
  res.append("Set-Cookie", clearCookie(isSecure(req)));
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: sessionUser(req), ready: authReady() });
});

// Brands owned by the signed-in user (for the admin's "my brands" list).
app.get("/api/my/brands", (req, res) => {
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: "Sign in first." });
  const brands = brandsOwnedBy(user.id).map((slug) => {
    const b = getBrand(slug);
    return { slug, productName: b?.productName || slug };
  });
  res.json({ brands });
});

// --- White-label brand API (Phase 2) --------------------------------------------------------
// Reads are public (the web app fetches its active brand at bootstrap). Writes are gated by a
// shared passcode header (ADMIN_PASSCODE) until real accounts land with HTTPS. If the passcode
// env isn't set, writes are refused rather than defaulting to something guessable.
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "";
const validSlug = (s) => typeof s === "string" && /^[a-z0-9][a-z0-9-]{0,39}$/.test(s);

function validBrand(b) {
  return (
    b && typeof b === "object" &&
    typeof b.productName === "string" && b.productName.length > 0 && b.productName.length <= 60 &&
    b.colors && typeof b.colors === "object" &&
    b.fonts && typeof b.fonts === "object" &&
    Array.isArray(b.wordmark) &&
    b.games && typeof b.games === "object"
  );
}

app.get("/api/brand/:slug", (req, res) => {
  if (!validSlug(req.params.slug)) return res.status(400).json({ error: "Bad slug." });
  const brand = getBrand(req.params.slug);
  if (!brand) return res.status(404).json({ error: "No such brand." });
  res.json(brand);
});

// Superadmin check. Two things this deliberately does that a plain === did not:
//
// 1. CONSTANT-TIME COMPARE. `===` on strings short-circuits at the first differing byte, which leaks
//    through timing how much of a guessed passcode was right - enough to recover it character by
//    character given enough attempts.
// 2. RATE LIMIT on FAILURES. Sixteen founder endpoints sit behind this one check - backer PII, code
//    minting and revoking, username edits, password clearing, subscription grants. The backer-code
//    endpoint was rate-limited from the start; this was not, so the passcode could be guessed at
//    full speed. Successes are not counted, so the founder is never locked out of their own tools.
const timingSafeStrEq = (a, b) => {
  const A = Buffer.from(String(a || ""), "utf8");
  const B = Buffer.from(String(b || ""), "utf8");
  // Compare a fixed-size digest so differing LENGTHS do not short-circuit (and do not leak length).
  const ha = createHash("sha256").update(A).digest();
  const hb = createHash("sha256").update(B).digest();
  return timingSafeEqual(ha, hb) && A.length === B.length;
};

function isSuperadmin(req, res) {
  if (!ADMIN_PASSCODE) return false;
  if (timingSafeStrEq(req.get("x-admin-passcode"), ADMIN_PASSCODE)) return true;
  // Count only failures. 20 wrong guesses / 15 min / IP, matching the backer-code guard.
  //
  // rateLimited RESPONDS with 429 when it trips, so its answer must be honoured: the old code
  // discarded it and the caller then sent its own 401 on an already-finished response, throwing
  // ERR_HTTP_HEADERS_SENT on every request past the limit. The client still saw the correct 429 --
  // this was log noise, and log noise is where a real error goes to hide.
  if (res && rateLimited(req, res, "adminpass", 20, 15 * 60_000)) {
    res.locals = res.locals || {};
    res.locals.rateLimitSent = true;   // the caller checks this before answering
  }
  return false;
}

// Callers use this instead of writing their own 401: it returns true when the request has ALREADY
// been answered (a 429 from the limiter), so the route must simply return.
function denySuperadmin(req, res) {
  if (res.locals && res.locals.rateLimitSent) return true;
  res.status(401).json({ error: "Superadmin only." });
  return true;
}

// Superadmin-only: list every brand in the store (founder god-mode).
app.get("/api/brands", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  res.json({ ready: dbReady(), brands: listBrandSlugs() });
});

// --- Backer access codes (backers-only group chat) ------------------------------------------
// The one-time keys we hand Kickstarter backers. Rex calls /check to authenticate a code before he
// starts a sign-up; only a genuine, un-redeemed code passes. Minting + the full list are founder-only
// (superadmin passcode). Redemption happens at account creation (added with the signup flow).
app.post("/api/backer/check", (req, res) => {
  if (rateLimited(req, res, "backercode", 20, 10 * 60_000)) return; // 20 tries / 10 min / IP — blunt brute-force guard
  const state = checkCode(req.body && req.body.code); // 'valid' | 'used' | 'unknown'
  res.json({ valid: state === "valid", state, ready: backerCodesReady() });
});

// Founder-only: mint N codes. Body { count, note }. Returns the plain code strings to hand out.
app.post("/api/backer/codes", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  const { count, note } = req.body || {};
  const r = generateCodes(count, note);
  if (r.error) return res.status(503).json({ error: r.error });
  res.json({ codes: r.codes });
});

// Founder-only: list every code + its state (valid/used, who redeemed it).
app.get("/api/backer/codes", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  res.json({ ready: backerCodesReady(), codes: listCodes() });
});

// Founder-only: take an unredeemed code out of circulation (or put it back). Body { code, revoked }.
app.post("/api/backer/codes/revoke", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  const { code, revoked } = req.body || {};
  const r = revokeCode(code, revoked !== false);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ ok: true, codes: listCodes() });
});

// Founder-only: the append-only audit log. ?limit&before&type — `before` pages by id, not offset,
// so a page cannot shift while new events are being written.
app.get("/api/backer/admin/events", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  if (needDb(res)) return;
  const { limit, before, type } = req.query || {};
  res.json({ events: SQL.listEvents({ limit, before, type: type || null }), types: SQL.listEventTypes() });
});

// A backer's own subscription + what it entitles them to. Entitlements are DERIVED here rather than
// read from a column, so an expired period stops granting access even if a webhook was missed.
app.get("/api/backer/subscription", (req, res) => {
  if (needDb(res)) return;
  // parseCookies, NOT req.cookies: no cookie-parser is mounted, so req.cookies is always
  // undefined and this route answered 401 even for a signed-in backer. Nothing called it yet,
  // which is the only reason it was not user-facing.
  const sess = readBackerSession(parseCookies(req.headers.cookie)[BACKER_COOKIE]);
  if (!sess) return res.status(401).json({ error: "Not signed in." });
  res.json({ subscription: SUBS.getSubscription(sess.uid), entitlements: SUBS.entitlementsFor(sess.uid) });
});

// Founder-only: every subscription, and the plan catalogue behind them.
app.get("/api/backer/admin/subscriptions", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  if (needDb(res)) return;
  res.json({ subscriptions: SUBS.listSubscriptions(), plans: PLANS() });
});

// Founder-only: chat volume per room. Deliberately counts only - never message CONTENT. The founder
// can moderate through the room itself; a dashboard that quietly exposes private enclosure chat to
// an admin is a different product from the one that was promised to backers.
app.get("/api/backer/admin/chat", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  res.json(chatStats());
});

// Founder-only: what Stripe configuration is actually in place. Reports presence, NEVER the secret.
// Exists so "is Stripe connected?" is answerable from the dashboard instead of by guessing - the
// webhook failing closed looks identical to a webhook nobody has called yet.
app.get("/api/backer/admin/stripe", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  if (needDb(res)) return;
  res.json(SUBS.stripeStatus());
});

// Founder-only: which legacy JSON stores are still on disk, and whether their migration is RECORDED
// as done. Retiring a backup should rest on evidence, not on remembering that a deploy went fine.
//
// Nothing here deletes anything. The files are the only copy of the pre-SQLite data, and a separate
// deployment (Render) has its own database that may not have migrated - so removal is a deliberate,
// per-environment act, taken by a human who can see this report.
app.get("/api/backer/admin/legacy", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  if (needDb(res)) return;
  const authDir = process.env.AUTH_DIR || join(__dirname, "data", "auth");
  const dataDir = join(authDir, "..");
  res.json({
    files: SQL.legacyStatus({
      backers: join(authDir, "backers.json"),
      codes: join(authDir, "backer-codes.json"),
      users: join(authDir, "users.json"),
      brand_owners: join(authDir, "owners.json"),
      chat: join(dataDir, "chat.json"),
      brands: process.env.DATA_DIR || join(dataDir, "brands"),
    }),
    note: "Nothing is deleted automatically. Each deployment has its own database — check every one.",
  });
});

// Founder-only: set a backer's subscription by hand. This exists BEFORE Stripe so tiers can be
// honoured manually - Kickstarter rewards are fulfilled by hand at first - and afterwards as the
// override for when a payment provider and reality disagree. Recorded in the audit log either way.
app.post("/api/backer/admin/subscriptions/:id", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  if (needDb(res)) return;
  if (!adminGetBacker(req.params.id)) return res.status(404).json({ error: "No such account." });
  const { plan, status, currentPeriodEnd } = req.body || {};
  const r = SUBS.setSubscription(req.params.id, { plan: plan || null, status: status || "none", currentPeriodEnd: currentPeriodEnd || null });
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ subscription: r.subscription, entitlements: SUBS.entitlementsFor(req.params.id) });
});

// Founder-only: the backer roster for the admin dashboard. Avatars are excluded (see listBackers).
app.get("/api/backer/admin/users", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  res.json({ ready: backersReady(), users: listBackers() });
});

// Founder-only: one backer in full, including their avatar.
app.get("/api/backer/admin/users/:id", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  const b = adminGetBacker(req.params.id);
  if (!b) return res.status(404).json({ error: "No such account." });
  res.json({ user: b });
});

// Founder-only: edit a backer. Only the fields the founder may legitimately change - a username
// (someone picked something unusable) and clearing a password (the forgot-password path). Enclosure
// is NOT editable here: it is the outcome of the sorting quiz, and quietly overriding it would make
// the quiz a lie. Profile fields belong to the backer.
app.post("/api/backer/admin/users/:id", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  const { username, clearPassword } = req.body || {};
  // Check existence FIRST: without this an unknown id fell through to updateBacker's generic
  // "No such account." and was reported as 400 (bad request) instead of 404 (no such thing).
  if (!adminGetBacker(req.params.id)) return res.status(404).json({ error: "No such account." });
  if (clearPassword) {
    const r = adminClearPassword(req.params.id);
    if (r.error) return res.status(404).json({ error: r.error });
  }
  if (username !== undefined) {
    const r = updateBacker(req.params.id, { username });
    if (r.error) return res.status(400).json({ error: r.error });
  }
  const b = adminGetBacker(req.params.id);
  if (!b) return res.status(404).json({ error: "No such account." });
  res.json({ user: b });
});

// Founder-only: manually kick off a John banter scene in a room (for testing / a nudge). Normally
// scenes fire on their own, occasionally, in rooms with a live audience.
app.post("/api/backer/banter", (req, res) => {
  if (!isSuperadmin(req, res)) return denySuperadmin(req, res) && undefined;
  const roomId = req.body && req.body.roomId;
  if (!ROOM_IDS.includes(roomId)) return res.status(400).json({ error: "Unknown room." });
  res.json({ started: forceScene(roomId) });
});

// --- Backer accounts (the group-chat members) -----------------------------------------------
// Signup consumes the one-time code and binds it to the new account (the code becomes their login
// key). After signup they can optionally set a password to log in with username+password too.
const sessionBacker = (req) => {
  const tok = parseCookies(req.headers.cookie)[BACKER_COOKIE];
  const s = tok && readBackerSession(tok);
  return s ? getBacker(s.uid) : null;
};

// Rex-run signup: { code, username, fullName, dob, country, avatar? }. Re-checks the code server-side
// (never trust the client's earlier /check), creates the account, redeems the code, opens a session.
app.post("/api/backer/signup", (req, res) => {
  if (rateLimited(req, res, "backersignup", 10, 30 * 60_000)) return; // 10 / 30 min / IP
  const { code, username, fullName, dob, country, avatar } = req.body || {};
  if (checkCode(code) !== "valid") {
    return res.status(403).json({ error: "That backer code isn't valid — it may be wrong or already used." });
  }
  const r = createBacker({ code, username, fullName, dob, country, avatar });
  if (r.error) return res.status(400).json({ error: r.error });
  const rc = redeemCode(code, r.backer.id); // bind the code to this account (single-use for signup)
  if (rc.error) return res.status(409).json({ error: rc.error }); // lost a race for the same code
  res.append("Set-Cookie", backerCookie(makeBackerSession(r.backer.id), isSecure(req)));
  res.json({ backer: r.backer });
});

// Login: by CODE (the default key), or by username+password once one has been set.
app.post("/api/backer/login", (req, res) => {
  if (rateLimited(req, res, "backerlogin", 15, 10 * 60_000)) return;
  const { code, username, password } = req.body || {};
  let b = null;
  if (code) b = findBackerByCode(code);
  else if (username && password) {
    const u = findBackerByUsername(username);
    if (u && verifyBackerPassword(u.id, password)) b = u;
  }
  if (!b) return res.status(401).json({ error: "That didn't match — check your code, or your username and password." });
  res.append("Set-Cookie", backerCookie(makeBackerSession(b.id), isSecure(req)));
  res.json({ backer: publicBacker(b) });
});

app.post("/api/backer/logout", (req, res) => {
  res.append("Set-Cookie", clearBackerCookie(isSecure(req)));
  res.json({ ok: true });
});

app.get("/api/backer/me", (req, res) => {
  res.json({ backer: publicBacker(sessionBacker(req)), ready: backersReady() });
});

// Edit profile: change username and/or avatar. Only the provided fields change.
app.post("/api/backer/profile", (req, res) => {
  const b = sessionBacker(req);
  if (!b) return res.status(401).json({ error: "Sign in first." });
  const { username, avatar } = req.body || {};
  const patch = {};
  if (username !== undefined) patch.username = username;
  if (avatar !== undefined) patch.avatar = avatar;
  const r = updateBacker(b.id, patch);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ backer: r.backer });
});

// Set an optional password after signup (so username+password login works alongside the code).
app.post("/api/backer/password", (req, res) => {
  const b = sessionBacker(req);
  if (!b) return res.status(401).json({ error: "Sign in first." });
  const r = setBackerPassword(b.id, req.body && req.body.password);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
});

// --- The Sorting: Rex's 5 questions -> one of the four enclosures ----------------------------
// Questions (display + Rex quips) are served from the server; the answer->enclosure mapping and the
// tally live server-side so the result is authoritative (nobody hand-picks their house).
app.get("/api/backer/sort/questions", (req, res) => {
  if (!sessionBacker(req)) return res.status(401).json({ error: "Sign in first." });
  res.json({ questions: sortQuestions() });
});

// Submit answers -> assign + return the enclosure. Sorting is once: a sorted backer gets their
// existing enclosure back (alreadySorted), never re-rolled.
app.post("/api/backer/sort", (req, res) => {
  const b = sessionBacker(req);
  if (!b) return res.status(401).json({ error: "Sign in first." });
  if (b.enclosure) return res.json({ enclosure: getEnclosure(b.enclosure), alreadySorted: true });
  const encId = sortInto(req.body && req.body.answers);
  if (!encId) return res.status(400).json({ error: "Those answers didn't come through — give it another go." });
  const r = setBackerEnclosure(b.id, encId);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ enclosure: getEnclosure(encId) });
});

app.put("/api/brand/:slug", (req, res) => {
  if (!validSlug(req.params.slug)) return res.status(400).json({ error: "Bad slug." });
  // No `res` here on purpose: not being a superadmin is LEGITIMATE on this route (a signed-in
  // customer owns their own brand), so it must not count as a failed passcode guess.
  const superadmin = isSuperadmin(req);
  const user = sessionUser(req);
  if (!superadmin && !user) return res.status(401).json({ error: "Sign in to save a brand." });
  // "default" is the built-in brand — only the superadmin may shadow it in the store.
  if (req.params.slug === "default" && !superadmin) return res.status(403).json({ error: "That name is reserved." });
  const owner = ownerOf(req.params.slug);
  if (owner && !superadmin && owner !== user.id) return res.status(403).json({ error: "That brand belongs to another account." });
  if (!validBrand(req.body)) return res.status(400).json({ error: "Invalid brand config." });
  if (!upsertBrand(req.params.slug, req.body)) return res.status(503).json({ error: "Store unavailable." });
  if (!owner && user) setOwner(req.params.slug, user.id); // first writer claims ownership
  res.json({ ok: true });
});

app.delete("/api/brand/:slug", (req, res) => {
  if (!validSlug(req.params.slug)) return res.status(400).json({ error: "Bad slug." });
  const superadmin = isSuperadmin(req);
  const user = sessionUser(req);
  if (!superadmin && !user) return res.status(401).json({ error: "Sign in first." });
  const owner = ownerOf(req.params.slug);
  if (owner && !superadmin && owner !== user.id) return res.status(403).json({ error: "That brand belongs to another account." });
  deleteBrand(req.params.slug);
  removeOwner(req.params.slug);
  res.json({ ok: true });
});

// The villager roster (characters + their signature weapons) — the server owns this list.
// (The retired 30-character mode served its roster from GET /murder/characters. The Villagers roster
// travels over the socket in m2:state instead, so no HTTP endpoint is needed.)

// --- Music: serve local mp3s + a dynamic manifest (host searches, display plays) ------------
// Files live in apps/server/music (git-ignored) or wherever MUSIC_DIR points. Kept local on
// purpose — not bundled into the public deploy.
const musicDir = process.env.MUSIC_DIR || join(__dirname, "music");

app.get("/music/songs.json", (_req, res) => {
  let songs = [];
  try {
    songs = readdirSync(musicDir)
      .filter((f) => f.toLowerCase().endsWith(".mp3"))
      .sort((a, b) => a.localeCompare(b))
      .map((file, i) => ({ id: String(i), title: file.replace(/\.mp3$/i, ""), file }));
  } catch {
    /* no music dir → empty list */
  }
  res.json(songs);
});

// dotfiles: "allow" so songs whose titles start with a dot (e.g. "...Baby One More Time")
// are served instead of being treated as hidden files.
if (existsSync(musicDir)) app.use("/music", express.static(musicDir, { dotfiles: "allow" }));

// In production, optionally serve the built web app so the whole thing is one process on the LAN.
const webDist = join(__dirname, "../web/dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  // The Kickstarter campaign is a standalone page (built from kickstarter/), not a SPA route —
  // serve it directly at /kickstarter so it doesn't fall through to the app shell.
  app.get("/kickstarter", (_req, res) => res.sendFile(join(webDist, "kickstarter.html")));
  app.get("*", (_req, res) => res.sendFile(join(webDist, "index.html")));
}

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

/** room code -> { snapshot, peers: Map<socketId, { role, teamId }> } */
const rooms = new Map();

function getRoom(code) {
  let r = rooms.get(code);
  if (!r) {
    r = { snapshot: null, peers: new Map() };
    rooms.set(code, r);
  }
  return r;
}

function presence(room) {
  const peers = [...room.peers.values()];
  const count = (role) => peers.filter((p) => p.role === role).length;
  // Per-team connection counts power the host's join hub ("Team 3 has an answerer linked").
  const teams = {};
  for (const p of peers) {
    if (!p.teamId) continue;
    const t = (teams[p.teamId] ??= { answerers: 0, viewers: 0 });
    if (p.role === "answerer") t.answerers++;
    else if (p.role === "viewer") t.viewers++;
  }
  return {
    total: peers.length,
    host: count("host"),
    display: count("display"),
    spectator: count("spectator"),
    answerer: count("answerer"),
    viewer: count("viewer"),
    teams,
  };
}

// Resolve the signed-in backer from a socket's handshake cookie (backers-only chat auth). Read fresh
// each time so a just-sorted backer's enclosure access is current.
function socketBacker(socket) {
  const tok = parseCookies(socket.handshake.headers.cookie)[BACKER_COOKIE];
  const s = tok && readBackerSession(tok);
  return s ? getBacker(s.uid) : null;
}

// Is this socket allowed to HOST a game?
//
// Entitlements can only ever gate the HOST. Players join a party by scanning a QR code with no
// account at all, and `role` is self-declared on the socket - so gating players would be both
// impossible to enforce and wrong for the product: one person subscribes, their friends play.
//
// OFF BY DEFAULT. ENFORCE_ENTITLEMENTS must be explicitly set to "true". Shipping this switched on
// would lock people out of their own party the moment the games open, before the tiers are even
// settled; this way the code is in place and the decision to use it stays the owner's.
//
// The superadmin passcode always passes - the founder must never be locked out of their own product
// by a billing rule.
function hostEntitled(socket) {
  if (process.env.ENFORCE_ENTITLEMENTS !== "true") return { ok: true, reason: "not enforced" };
  const pc = socket.handshake?.auth?.adminPasscode || socket.handshake?.headers?.["x-admin-passcode"];
  if (ADMIN_PASSCODE && pc === ADMIN_PASSCODE) return { ok: true, reason: "superadmin" };
  // Fail OPEN if the database is down. The games are precisely what is meant to survive a storage
  // problem, and with no database nobody could sign in to be checked in the first place - refusing
  // here would turn a database blip into "nobody can play".
  if (!dbUp()) return { ok: true, reason: "db-unavailable" };
  const b = socketBacker(socket);
  if (!b) return { ok: false, reason: "sign-in", error: "Sign in with your backer account to host a game." };
  const ent = SUBS.entitlementsFor(b.id);
  if (!ent.active) {
    return {
      ok: false,
      reason: ent.expired ? "expired" : "no-plan",
      error: ent.expired
        ? "Your PlayZoo plan has run out — renew to host another night."
        : "Hosting needs an active PlayZoo plan. Back the Kickstarter to get one.",
    };
  }
  return { ok: true, reason: "entitled", plan: ent.plan };
}

// Turn a stored chat message into its client shape, enriching a backer message with the author's
// current username/avatar/enclosure (so avatar/name changes reflect everywhere; history stays lean).
function publicMsg(m) {
  if (m.rex) return { id: m.id, at: m.at, text: m.text, rex: true };
  if (m.john) return { id: m.id, at: m.at, text: m.text, john: true };
  const b = getBacker(m.backerId);
  return {
    id: m.id, at: m.at, text: m.text,
    author: b
      ? { id: b.id, username: b.username, avatar: b.avatar || null, enclosure: b.enclosure || null }
      : { id: null, username: "a former guest", avatar: null, enclosure: null },
  };
}

const REX_MOD_LINES = [
  "Oi. We don't do that here. Cool it. 🦁",
  "Nope. Not in my zoo. Try being a person. 🦁",
  "That one's going in the bin. Watch your mouth. 🦁",
  "Absolutely not. I've thrown animals out for less. 🦁",
];
const rexModLine = () => REX_MOD_LINES[Math.floor(Math.random() * REX_MOD_LINES.length)];

// --- Reactive character replies -------------------------------------------------------------
// When a member addresses Rex/John (by name or @tag) or asks the room something, a character answers
// — but only after a ~3s grace so a real person gets first dibs. If another human posts in that room
// within the grace, the pending reply is cancelled (someone answered). Per-room+character cooldown
// keeps it from chiming in on every line.
const pendingReply = new Map(); // roomId -> token (latest human message wins the grace window)
const charCooldown = new Map(); // `${who}:${roomId}` -> lastReplyTs
function charAllowed(who, roomId) {
  const k = `${who}:${roomId}`, now = Date.now();
  if (now - (charCooldown.get(k) || 0) < 8000) return false;
  charCooldown.set(k, now);
  return true;
}
// Does this message invite a reply even without naming a character? (greetings + questions)
function invitesResponse(text) {
  const s = String(text || "").toLowerCase();
  if (s.includes("?")) return true;
  return /\b(what'?s up|whats up|sup|hello+|hey+|hi+|yo+|anyone|anybody|quiet|how'?s it|how are)\b/.test(s);
}
async function genCharacterReply(who, roomId, username) {
  const roomName = roomMeta(roomId)?.name || roomId;
  const recent = getMessages(roomId, 7).map((msg) => {
    const w = msg.rex ? "Rex" : msg.john ? "John" : (getBacker(msg.backerId)?.username || "someone");
    return `${w}: ${msg.text}`;
  }).join("\n");
  const prompt = `You're hanging out in the "${roomName}" backer group chat. Recent messages:\n${recent}\n\n` +
    `${username} is talking to you. Reply directly and briefly (1-2 short sentences), in character, and address them as @${username}.`;
  const out = who === "john"
    ? await johnChat({ room: `chat:${roomId}`, messages: [{ role: "user", content: prompt }] })
    : await hostChat({ room: `chat:${roomId}`, messages: [{ role: "user", content: prompt }] });
  const reply = out && out.reply ? out.reply : null;
  return reply ? ensureTag(reply, username) : null;
}
function maybeCharacterReply(roomId, backer, text) {
  const addressed = addressedCharacter(text);
  if (!addressed && !invitesResponse(text)) return; // a plain statement: don't have Rex narrate it
  const who = addressed || "rex"; // unaddressed openers default to Rex, the host
  const token = Symbol("reply");
  pendingReply.set(roomId, token); // a newer human message will supersede this one
  setTimeout(async () => {
    if (pendingReply.get(roomId) !== token) return; // someone else posted within the grace — they answered
    pendingReply.delete(roomId);
    if (!charAllowed(who, roomId)) return;
    const reply = await genCharacterReply(who, roomId, backer.username);
    if (!reply) return;
    const m = who === "john" ? addJohnMessage(roomId, reply) : addRexMessage(roomId, reply);
    io.to(`chat:${roomId}`).emit("chat:msg", { roomId, message: publicMsg(m) });
  }, 3000);
}

io.on("connection", (socket) => {
  let code = null;

  // --- Backer chat (works regardless of GAMES_OPEN — the club is open while games are locked) ---
  socket.on("chat:join", ({ roomId } = {}) => {
    const b = socketBacker(socket);
    if (!b) return socket.emit("chat:error", { error: "Sign in to the club to chat." });
    if (!canAccess(b, roomId)) return socket.emit("chat:error", { error: "That room isn't yours." });
    socket.join(`chat:${roomId}`);
    socket.emit("chat:history", { roomId, messages: getMessages(roomId).map(publicMsg) });
  });

  socket.on("chat:send", ({ roomId, text } = {}) => {
    const b = socketBacker(socket);
    if (!b) return socket.emit("chat:error", { error: "Sign in to the club to chat." });
    if (!canAccess(b, roomId)) return socket.emit("chat:error", { error: "That room isn't yours." });
    // Per-socket rate limit: ~12 messages / 10s.
    const now = Date.now();
    const w = socket.data.chatWin || (socket.data.chatWin = { start: now, n: 0 });
    if (now - w.start > 10_000) { w.start = now; w.n = 0; }
    if (++w.n > 12) return socket.emit("chat:error", { error: "Easy — slow down a second." });

    const r = addMessage(roomId, b.id, text);
    if (r.blocked) {
      socket.emit("chat:blocked", { roomId, reason: r.reason });
      const rex = addRexMessage(roomId, ensureTag(rexModLine(), b.username)); // Rex steps in + @tags the offender
      io.to(`chat:${roomId}`).emit("chat:msg", { roomId, message: publicMsg(rex) });
      return;
    }
    if (r.error) return socket.emit("chat:error", { error: r.error });
    io.to(`chat:${roomId}`).emit("chat:msg", { roomId, message: publicMsg(r.message) });
    banterNote(roomId, b.username); // feed the banter engine (who's active + joined an in-progress scene)
    maybeCharacterReply(roomId, b, text); // Rex/John answer when addressed (after a 3s grace)
  });

  // Pre-launch lockdown (see GET /api/status). Until GAMES_OPEN=true, NO game room can be created
  // or joined — not by clicking, not by a typed URL, not by a hand-rolled socket. We simply don't
  // wire up any game handlers and refuse the generic relay "join", so the socket is inert for games
  // while locked. The front-end funnels every entry point to /waitlist; this is the server backstop.
  // The founder pass opens the games for one browser. Read from the HANDSHAKE cookie, because a
  // socket has no Express request -- and gating only the HTTP side would let the owner reach a
  // screen whose socket then silently ignored every game event.
  const founderPass = !!founderFromCookieHeader(socket.handshake.headers.cookie);
  const gamesOpen = process.env.GAMES_OPEN === "true" || founderPass;

  if (gamesOpen) {
    registerMurder2Handlers(io, socket, rooms); // roomKey/now default to uppercase/Date.now here
    registerCodenamesHandlers(io, socket, rooms);
    registerJustOneHandlers(io, socket, rooms);
    registerBallparkHandlers(io, socket, rooms);
    registerTelestrationsHandlers(io, socket, rooms);
    registerAfterDarkHandlers(io, socket, rooms);
  }

  socket.on("join", ({ room, role, teamId, hostToken }) => {
    if (!gamesOpen) { socket.emit("locked", { waitlist: true }); return; }
    if (typeof room !== "string" || !room) return;
    // Only the hosting surfaces are gated: a "player" phone has no account and never will.
    if (role === "host" || role === "display") {
      const gate = hostEntitled(socket);
      if (!gate.ok) {
        console.log(`[ff-server] host refused (${gate.reason})`);
        socket.emit("locked", { entitlement: true, reason: gate.reason, error: gate.error });
        return;
      }
    }
    code = room.toUpperCase();
    // --- Host claim ------------------------------------------------------------------------
    // `role` is declared by the client, so it cannot decide who may WRITE game state. The first
    // socket to claim host for a room is issued a secret token; after that, only a socket holding
    // that token can be the host. Without this, any page that guessed a room code could emit "sync"
    // and overwrite a live game.
    //
    // The token OUTLIVES the socket on purpose: a host whose phone drops needs to reclaim the room
    // on reconnect, and releasing the claim on disconnect would hand it to whoever asked next.
    if (role === "host") {
      const r0 = getRoom(code);
      if (!r0.hostToken) {
        r0.hostToken = randomBytes(16).toString("hex");
        socket.data.isHost = true;
        socket.emit("host:token", { room: code, token: r0.hostToken });
      } else if (typeof hostToken === "string" && hostToken === r0.hostToken) {
        socket.data.isHost = true;                       // the real host, back after a reconnect
      } else {
        // Not the host. Joined as a spectator rather than refused outright: a second screen opening
        // the control page is a normal mistake, and it should show the game, not an error.
        socket.data.isHost = false;
        socket.emit("host:denied", { room: code });
        role = "spectator";
      }
    }
    socket.data.role = role || "display";
    socket.data.teamId = typeof teamId === "string" ? teamId : null;
    socket.data.code = code;
    socket.join(code);
    const r = getRoom(code);
    r.peers.set(socket.id, { role: socket.data.role, teamId: socket.data.teamId });
    console.log(`[ff-server] ${socket.data.role} joined ${code} (peers: ${r.peers.size})`);

    // Catch a late joiner up with the latest snapshot.
    if (r.snapshot) socket.emit("sync", r.snapshot);
    io.to(code).emit("presence", presence(r));
  });

  // Restrict state broadcasts to the peer that joined as "host". NOTE: this is a footgun-guard, NOT
  // a security boundary — `role` is self-declared on join (this is a no-auth LAN party game, matching
  // the rest of the app), so a client could still claim role:"host". What it DOES prevent is a
  // legitimate non-host phone (answerer/viewer/player) accidentally clobbering room state via "sync".
  socket.on("sync", (snapshot) => {
    // socket.data.isHost is set by the server when the host claim was VALIDATED above. The old
    // check read socket.data.role, which the client sets itself - so it stopped honest mistakes
    // but not a page that simply said role:"host".
    if (!code || !socket.data.isHost) return;
    const r = getRoom(code);
    r.snapshot = snapshot;
    socket.to(code).emit("sync", snapshot);
  });

  socket.on("pulse", (pulse) => {
    if (!code || !socket.data.isHost) return;
    socket.to(code).emit("pulse", pulse);
  });

  // Music playback commands from the host → relayed to the display.
  socket.on("music", (cmd) => {
    if (!code || socket.data.role !== "host") return;
    socket.to(code).emit("music", cmd);
  });

  // Upstream cue from a team answer-phone → forwarded to the HOST peer(s) only (not to other teams'
  // viewers). Answerers may emit this and nothing else; the host records/judges it. Two kinds:
  // "guess" (Feud free-text) and "trivia-answer" (a locked A/B/C/D for a question).
  socket.on("intent", (intent) => {
    if (!code || socket.data.role !== "answerer") return;
    if (!intent || (intent.kind !== "guess" && intent.kind !== "trivia-answer")) return;
    const r = rooms.get(code);
    if (!r) return;
    const teamId = (typeof intent.teamId === "string" && intent.teamId) || socket.data.teamId;
    if (!teamId) return;
    let payload = null;
    if (intent.kind === "guess") {
      const text = typeof intent.text === "string" ? intent.text.slice(0, 120) : "";
      if (!text) return;
      payload = { teamId, kind: "guess", text, at: Date.now() };
    } else {
      const letter = ["A", "B", "C", "D"].includes(intent.letter) ? intent.letter : null;
      const questionId = typeof intent.questionId === "string" ? intent.questionId.slice(0, 40) : "";
      if (!letter || !questionId) return;
      payload = { teamId, kind: "trivia-answer", questionId, letter, at: Date.now() };
    }
    for (const [sid, meta] of r.peers) {
      if (meta.role === "host") io.to(sid).emit("intent", payload);
    }
  });

  // Playback progress from the display → relayed back to the host's scrubber.
  socket.on("musicstatus", (status) => {
    if (!code) return;
    socket.to(code).emit("musicstatus", status);
  });

  socket.on("disconnect", () => {
    if (!code) return;
    const r = rooms.get(code);
    if (!r) return;
    r.peers.delete(socket.id);
    if (r.peers.size === 0) {
      // Keep the snapshot a while so a quick refresh still resumes; drop empty rooms lazily.
      setTimeout(() => {
        const cur = rooms.get(code);
        if (cur && cur.peers.size === 0) rooms.delete(code);
      }, 60_000);
    } else {
      io.to(code).emit("presence", presence(r));
    }
  });
});

// Start the John/Rex banter engine — it occasionally runs a scene in a live room (see banter.js).
initBanter({ io, publicMsg, roomIds: ROOM_IDS });

httpServer.listen(PORT, () => {
  console.log(`[ff-server] relay listening on http://localhost:${PORT}`);
});
