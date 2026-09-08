// The backer chats — five rooms: one per enclosure + a General room everyone shares. Backers-only,
// and a backer can reach ONLY their own enclosure room + General (enforced by canAccess, checked on
// the socket). Rex is "present": each room seeds with a Rex welcome, and Rex speaks up when the
// moderation filter trips (handled in the socket layer).
//
// STORAGE: SQLite (`messages` in sqlite.js), migrated from the old chat.json. That JSON store was
// rewritten IN FULL on every single send - O(all messages) per message, and a torn write would have
// taken the whole room's history with it. Now it is one INSERT per message.
//
// The legacy chat.json is auto-imported on first boot if the table is empty, and is NOT deleted -
// it stays as backup. Exports and message shapes are unchanged, so the socket layer needs no edits.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { ENCLOSURES, ENCLOSURE_IDS, GENERAL_ROOM } from "./enclosures.js";
import { screen } from "./moderation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.AUTH_DIR ? join(process.env.AUTH_DIR, "..") : join(__dirname, "data");
const CHAT_FILE = join(DATA_DIR, "chat.json");
const MAX_PER_ROOM = 200; // keep history lean

// Room registry: General + one per enclosure.
const ROOM_META = {
  [GENERAL_ROOM.id]: { id: GENERAL_ROOM.id, name: GENERAL_ROOM.name },
  ...Object.fromEntries(ENCLOSURES.map((e) => [e.id, { id: e.id, name: e.name }])),
};
export const ROOM_IDS = [GENERAL_ROOM.id, ...ENCLOSURE_IDS];
export const roomExists = (id) => Object.prototype.hasOwnProperty.call(ROOM_META, id);
export const roomMeta = (id) => ROOM_META[id] || null;

// Rex's room welcomes (seeded once per room so it never opens empty and reads as "hosted").
const REX_WELCOME = {
  general: "Welcome to The Watering Hole — every enclosure drinks here. Play nice-ish. 🦁",
  rowdies: "The Rowdies' den. Try not to break anything I can't expense. 🦁",
  "cuddle-crew": "The Cuddle Crew corner. Group-hug quota is mandatory. 🦁",
  "know-it-owls": "The Know-It-Owls' perch. Cite your sources. 🦁",
  schemers: "The Schemers' back room. I'm counting the silverware. 🦁",
};

let db = null;
let logEvent = () => {};
let tx = (fn) => fn();
let ready = false;
try {
  const m = await import("./sqlite.js");
  db = m.db; logEvent = m.logEvent; tx = m.tx;
  ready = true;
} catch (err) {
  console.error("[ff-server] chat store DISABLED:", err?.message || err);
}
export const chatReady = () => ready;

function mkId() { return "m" + randomBytes(8).toString("hex"); }

// Row -> the exact message shape the socket layer and the client already expect. Rex and John lines
// carry a boolean flag rather than a speaker string, because that is what the client renders on.
function rowToMsg(r) {
  const msg = { id: r.id, at: r.at, text: r.text };
  if (r.speaker === "rex") msg.rex = true;
  else if (r.speaker === "john") msg.john = true;
  else msg.backerId = r.backer_id;
  return msg;
}

// --- One-time migration of the legacy chat.json --------------------------------------------------
// Only when the table is empty, in a transaction, so it is idempotent and can never half-import.
function importLegacyJson() {
  if (!ready) return;
  try {
    if (db.prepare("SELECT COUNT(*) AS n FROM messages").get().n > 0) return;
    if (!existsSync(CHAT_FILE)) return;
    const legacy = JSON.parse(readFileSync(CHAT_FILE, "utf8")) || {};
    let n = 0;
    tx(() => {
      const ins = db.prepare(
        "INSERT OR IGNORE INTO messages (id, room, at, text, speaker, backer_id) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const [room, arr] of Object.entries(legacy)) {
        for (const m of arr || []) {
          ins.run(
            m.id || mkId(), room, Number(m.at) || Date.now(), String(m.text || ""),
            m.rex ? "rex" : m.john ? "john" : "backer",
            m.rex || m.john ? null : (m.backerId ?? null),
          );
          n += 1;
        }
      }
    });
    if (n) {
      console.log(`[ff-server] migrated ${n} chat message(s) from JSON into SQLite`);
      logEvent("migrate.chat", null, { count: n, from: "chat.json" });
    }
  } catch (err) {
    console.error("[ff-server] chat JSON migration FAILED:", err?.message || err);
  }
}
importLegacyJson();

// Seed each room with Rex's welcome if it has no history yet, so a room never opens empty.
if (ready) {
  try {
    const count = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE room = ?");
    const ins = db.prepare(
      "INSERT INTO messages (id, room, at, text, speaker, backer_id) VALUES (?, ?, ?, ?, 'rex', NULL)",
    );
    for (const id of ROOM_IDS) {
      if (count.get(id).n === 0) ins.run(mkId(), id, Date.now(), REX_WELCOME[id] || "Welcome. 🦁");
    }
  } catch (err) {
    console.error("[ff-server] chat seeding failed:", err?.message || err);
  }
}

// A backer reaches General always, and their OWN enclosure room only.
export function canAccess(backer, roomId) {
  if (!backer || !roomExists(roomId)) return false;
  if (roomId === GENERAL_ROOM.id) return true;
  return backer.enclosure === roomId;
}

// The rooms a backer may see (for the client's tab list).
export function roomsFor(backer) {
  const ids = [GENERAL_ROOM.id, ...(backer && backer.enclosure ? [backer.enclosure] : [])];
  return ids.map((id) => roomMeta(id));
}

export function getMessages(roomId, limit = 60) {
  if (!ready) return [];
  const n = Math.max(1, Math.min(500, Number(limit) || 60));
  // Newest N by index, then flipped back into reading order - the old slice(-limit) semantics.
  return db.prepare("SELECT * FROM messages WHERE room = ? ORDER BY at DESC, rowid DESC LIMIT ?")
    .all(roomId, n).reverse().map(rowToMsg);
}

// Add a backer message. Returns { message } or { blocked, reason } if moderation trips.
export function addMessage(roomId, backerId, text) {
  const body = String(text || "").trim();
  if (!body) return { error: "Say something first." };
  if (body.length > 1000) return { error: "That's a bit long — keep it under 1000 characters." };
  const verdict = screen(body);
  if (!verdict.ok) return { blocked: true, reason: verdict.reason };
  const msg = { id: mkId(), at: Date.now(), text: body, backerId };
  push(roomId, msg);
  return { message: msg };
}

// Add a Rex system line (welcomes, moderation call-outs).
export function addRexMessage(roomId, text) {
  const msg = { id: mkId(), at: Date.now(), text: String(text || ""), rex: true };
  push(roomId, msg);
  return msg;
}

// Add a John (the raccoon) line — used by the banter engine when he crashes a room.
export function addJohnMessage(roomId, text) {
  const msg = { id: mkId(), at: Date.now(), text: String(text || ""), john: true };
  push(roomId, msg);
  return msg;
}

function push(roomId, msg) {
  if (!ready) return;
  try {
    db.prepare("INSERT INTO messages (id, room, at, text, speaker, backer_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(msg.id, roomId, msg.at, msg.text,
           msg.rex ? "rex" : msg.john ? "john" : "backer",
           msg.rex || msg.john ? null : (msg.backerId ?? null));
    // Keep history lean, same cap as before - but trim only the overflow rather than rewriting
    // the room. The subquery picks the ids to keep, so the delete never touches a recent message.
    db.prepare(`DELETE FROM messages WHERE room = ? AND id NOT IN (
                  SELECT id FROM messages WHERE room = ? ORDER BY at DESC, rowid DESC LIMIT ?)`)
      .run(roomId, roomId, MAX_PER_ROOM);
  } catch (err) {
    console.error("[ff-server] chat write failed:", err?.message || err);
  }
}
