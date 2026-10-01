// Rooms the owner has nominated, in the repo, playable on the LIVE domain while the public gate
// stays shut.
//
// WHY THIS EXISTS. Before the Kickstarter, GAMES_OPEN is false on the public box and the only key
// is ADMIN_PASSCODE, which lives in that machine's systemd environment. That is correct for the
// public and wrong for the owner, who needs to SHOW the real site — to a backer, a venue, a camera
// — from a device that has no cookie and cannot be handed a passcode. The founder pass cannot help:
// it is per-browser, and it has to be bootstrapped with the very passcode that is out of reach.
//
// Git push is the owner's control channel to that box (frendz-autodeploy.timer pulls, builds and
// restarts, ~60s). So the nomination lives in the repo: name a room here, push, and sixty seconds
// later that ONE room plays on the real domain. Everything else stays shut and GAMES_OPEN never
// moves.
//
// WHAT THIS IS NOT: it is not a way in. A room code here opens exactly that room. It grants no
// admin capability, no founder pass, no staff session, and no access to any other room. Removing
// the code (or letting it expire) closes it again on the next deploy.
//
// FAIL CLOSED, and on a deadline. A missing file, unreadable JSON, a missing `until`, or a date
// that has passed all mean NO rooms are open. A demo room with no expiry is a permanent public
// door with a four-character key that everyone forgets about — which is exactly the failure the
// twelve-hour founder pass was designed to avoid.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "demo-rooms.json");

// Re-read on a short cache rather than once at boot: a deploy restarts the service anyway, but this
// way editing the file on the box also takes effect, and a bad edit cannot wedge the process.
const CACHE_MS = 10_000;
let cache = { at: 0, rooms: new Set(), until: null, reason: "not read yet" };

function load() {
  const now = Date.now();
  if (now - cache.at < CACHE_MS) return cache;

  let parsed = null;
  try {
    parsed = JSON.parse(readFileSync(FILE, "utf8"));
  } catch (err) {
    cache = { at: now, rooms: new Set(), until: null, reason: `unreadable: ${err.code || err.message}` };
    return cache;
  }

  const until = parsed && typeof parsed.until === "string" ? Date.parse(parsed.until) : NaN;
  if (!Number.isFinite(until)) {
    cache = { at: now, rooms: new Set(), until: null, reason: "no valid `until` date — refusing to open anything" };
    return cache;
  }
  if (until < now) {
    cache = { at: now, rooms: new Set(), until, reason: `expired on ${parsed.until}` };
    return cache;
  }

  const list = Array.isArray(parsed.rooms) ? parsed.rooms : [];
  const rooms = new Set(
    list.filter((r) => typeof r === "string" && r.trim()).map((r) => r.trim().toUpperCase()),
  );
  cache = { at: now, rooms, until, reason: rooms.size ? `${rooms.size} room(s) until ${parsed.until}` : "no rooms listed" };
  return cache;
}

/** Is this room nominated, and is the nomination still in date? */
export function isDemoRoom(code) {
  if (typeof code !== "string" || !code) return false;
  return load().rooms.has(code.trim().toUpperCase());
}

/** For the boot log and the founder page: what is open, and why. Never throws. */
export function demoRoomStatus() {
  const c = load();
  return { rooms: [...c.rooms], until: c.until, reason: c.reason };
}
