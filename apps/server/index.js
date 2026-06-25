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
import { registerMurderHandlers } from "./murder.js";

const PORT = process.env.PORT || 8787;
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.get("/healthz", (_req, res) => res.json({ ok: true }));

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

/** room code -> { snapshot, peers: Map<socketId, role> } */
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
  const roles = [...room.peers.values()];
  return {
    total: roles.length,
    host: roles.filter((r) => r === "host").length,
    display: roles.filter((r) => r === "display").length,
    spectator: roles.filter((r) => r === "spectator").length,
  };
}

io.on("connection", (socket) => {
  let code = null;
  registerMurderHandlers(io, socket, rooms);

  socket.on("join", ({ room, role }) => {
    if (typeof room !== "string" || !room) return;
    code = room.toUpperCase();
    socket.data.role = role || "display";
    socket.data.code = code;
    socket.join(code);
    const r = getRoom(code);
    r.peers.set(socket.id, socket.data.role);
    console.log(`[ff-server] ${socket.data.role} joined ${code} (peers: ${r.peers.size})`);

    // Catch a late joiner up with the latest snapshot.
    if (r.snapshot) socket.emit("sync", r.snapshot);
    io.to(code).emit("presence", presence(r));
  });

  socket.on("sync", (snapshot) => {
    if (!code) return;
    const r = getRoom(code);
    r.snapshot = snapshot;
    socket.to(code).emit("sync", snapshot);
  });

  socket.on("pulse", (pulse) => {
    if (!code) return;
    socket.to(code).emit("pulse", pulse);
  });

  // Music playback commands from the host → relayed to the display.
  socket.on("music", (cmd) => {
    if (!code) return;
    socket.to(code).emit("music", cmd);
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
