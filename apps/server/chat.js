// The backer chats — five rooms: one per enclosure + a General room everyone shares. Backers-only,
// and a backer can reach ONLY their own enclosure room + General (enforced by canAccess, checked on
// the socket). Messages persist (so a room isn't empty on return) in a small JSON store, capped per
// room. Rex is "present": each room seeds with a Rex welcome, and Rex speaks up when the moderation
// filter trips (handled in the socket layer). Storage mirrors the other stores (tiny JSON + atomic
// rename); fail-safe to in-memory if the disk write can't happen.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
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

let ready = false;
try { mkdirSync(DATA_DIR, { recursive: true }); ready = true; }
catch (err) { console.error("[ff-server] chat store DISABLED:", err?.message || err); }
export const chatReady = () => ready;

function load() {
  try { return existsSync(CHAT_FILE) ? JSON.parse(readFileSync(CHAT_FILE, "utf8")) : {}; } catch { return {}; }
}
function save() {
  if (!ready) return;
  try {
    const tmp = CHAT_FILE + ".tmp";
    writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
    renameSync(tmp, CHAT_FILE);
  } catch (err) { console.error("[ff-server] chat save failed:", err?.message || err); }
}

// store: roomId -> [ msg ]. msg = { id, at, text, backerId } OR a Rex line { id, at, text, rex:true }.
const store = load();

// Seed each room with Rex's welcome if it has no history yet.
let seeded = false;
for (const id of ROOM_IDS) {
  if (!store[id] || store[id].length === 0) {
    store[id] = [{ id: mkId(), at: Date.now(), text: REX_WELCOME[id] || "Welcome. 🦁", rex: true }];
    seeded = true;
  }
}
if (seeded) save();

function mkId() { return "m" + randomBytes(8).toString("hex"); }

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
  const arr = store[roomId] || [];
  return arr.slice(-limit);
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

function push(roomId, msg) {
  const arr = store[roomId] || (store[roomId] = []);
  arr.push(msg);
  if (arr.length > MAX_PER_ROOM) arr.splice(0, arr.length - MAX_PER_ROOM);
  save();
}
