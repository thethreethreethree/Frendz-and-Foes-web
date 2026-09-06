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

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
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
import { hostLine, hostReady } from "./host.js";
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
app.use(express.json({ limit: "256kb" }));
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// --- Rex, the AI host --------------------------------------------------------------------------
// The display posts a game "moment"; Rex returns one line of MC banter (Claude, or a canned line
// if no key). Public + best-effort — never blocks a game.
app.post("/api/host", async (req, res) => {
  const { room, game, moment, detail } = req.body || {};
  const out = await hostLine({ room, game, moment, detail });
  res.json({ ...out, ready: hostReady() });
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

app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body || {};
  const r = createUser(email, password);
  if (r.error) return res.status(400).json({ error: r.error });
  res.append("Set-Cookie", sessionCookie(makeSession(r.user.id), isSecure(req)));
  res.json({ user: r.user });
});

app.post("/api/auth/login", (req, res) => {
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

const isSuperadmin = (req) => ADMIN_PASSCODE && req.get("x-admin-passcode") === ADMIN_PASSCODE;

// Superadmin-only: list every brand in the store (founder god-mode).
app.get("/api/brands", (req, res) => {
  if (!isSuperadmin(req)) return res.status(401).json({ error: "Superadmin only." });
  res.json({ ready: dbReady(), brands: listBrandSlugs() });
});

app.put("/api/brand/:slug", (req, res) => {
  if (!validSlug(req.params.slug)) return res.status(400).json({ error: "Bad slug." });
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

io.on("connection", (socket) => {
  let code = null;
  registerMurder2Handlers(io, socket, rooms); // roomKey/now default to uppercase/Date.now here
  registerCodenamesHandlers(io, socket, rooms);
  registerJustOneHandlers(io, socket, rooms);
  registerBallparkHandlers(io, socket, rooms);
  registerTelestrationsHandlers(io, socket, rooms);
  registerAfterDarkHandlers(io, socket, rooms);

  socket.on("join", ({ room, role, teamId }) => {
    if (typeof room !== "string" || !room) return;
    code = room.toUpperCase();
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
    if (!code || socket.data.role !== "host") return;
    const r = getRoom(code);
    r.snapshot = snapshot;
    socket.to(code).emit("sync", snapshot);
  });

  socket.on("pulse", (pulse) => {
    if (!code || socket.data.role !== "host") return;
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

httpServer.listen(PORT, () => {
  console.log(`[ff-server] relay listening on http://localhost:${PORT}`);
});
