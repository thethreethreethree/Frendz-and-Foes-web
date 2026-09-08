// Host claim / room-write authority.  Run:  node apps/server/hostToken.test.mjs
//
// `role` is declared by the CLIENT, so it can never decide who may write game state: any page that
// guessed a room code could emit "sync" and overwrite a live game. The first socket to claim a room
// gets a secret token; only a socket presenting it may sync afterwards.
//
// The cases that matter are the refusals, and one more that is easy to forget: a host whose phone
// drops must be able to RECLAIM the room, or this fix breaks the product it protects.

import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { io as ioClient } from "socket.io-client";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const TMP = join(tmpdir(), "playzoo-hosttoken-test");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, "auth"), { recursive: true });
const PORT = 8871;

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

const server = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [join(HERE, "index.js")], {
    env: { ...process.env, PORT: String(PORT), GAMES_OPEN: "true",
           AUTH_DIR: join(TMP, "auth"), DB_PATH: join(TMP, "db", "playzoo.db") },
    cwd: REPO, stdio: ["ignore", "pipe", "pipe"],
  });
  const on = (d) => { if (String(d).includes("relay listening")) resolve(child); };
  child.stdout.on("data", on); child.stderr.on("data", on);
  setTimeout(() => reject(new Error("server did not start")), 15000);
});

const ROOM = "TOKENTEST";
const sockets = [];
function connect() {
  const s = ioClient(`http://127.0.0.1:${PORT}`, { transports: ["websocket"], forceNew: true });
  sockets.push(s);
  return s;
}
const once = (s, ev, ms = 3000) => new Promise((r) => {
  const t = setTimeout(() => r(null), ms);
  s.once(ev, (d) => { clearTimeout(t); r(d ?? true); });
});

// Join and report what the server granted.
async function joinAs(s, role, hostToken) {
  await new Promise((r) => (s.connected ? r() : s.once("connect", r)));
  const token = once(s, "host:token");
  const denied = once(s, "host:denied");
  const joined = once(s, "presence");
  s.emit("join", { room: ROOM, role, hostToken });
  const [t, d, j] = await Promise.all([token, denied, joined]);
  return { token: t?.token || null, denied: !!d, joined: !!j };
}

console.log("\n--- the first host claims the room ---");
const hostA = connect();
const a = await joinAs(hostA, "host");
check("joined", a.joined, true);
check("was issued a token", typeof a.token === "string" && a.token.length >= 32, true);
check("not denied", a.denied, false);

console.log("\n--- a second page claiming host WITHOUT the token ---");
const attacker = connect();
const b = await joinAs(attacker, "host");
check("still joins (as a spectator, not an error)", b.joined, true);
check("but is DENIED the host claim", b.denied, true);
check("and gets no token", b.token, null);

console.log("\n--- a wrong token is no better than none ---");
const guesser = connect();
const c = await joinAs(guesser, "host", "0".repeat(32));
check("denied", c.denied, true);
check("no token", c.token, null);

console.log("\n--- who can actually WRITE game state ---");
{
  const watcher = connect();
  await joinAs(watcher, "display");

  // The attacker is in the room and called itself a host. Its sync must be ignored.
  const heard = once(watcher, "sync", 1500);
  attacker.emit("sync", { state: { tampered: true } });
  check("the impostor's sync is IGNORED", await heard, null);

  // The real host's sync must still land.
  const heard2 = once(watcher, "sync", 3000);
  hostA.emit("sync", { state: { fromRealHost: true } });
  const got = await heard2;
  check("the real host's sync goes through", got?.state?.fromRealHost, true);

  // pulse shares the same authority check.
  const pulse = once(watcher, "pulse", 1500);
  attacker.emit("pulse", { kind: "draw" });
  check("the impostor's pulse is IGNORED", await pulse, null);
}

console.log("\n--- the host must be able to come BACK (a dropped phone) ---");
{
  hostA.close();
  await new Promise((r) => setTimeout(r, 400));
  const hostAgain = connect();
  const d = await joinAs(hostAgain, "host", a.token);
  check("reconnects with the stored token", d.joined, true);
  check("is not denied", d.denied, false);

  const watcher2 = connect();
  await joinAs(watcher2, "display");
  const heard = once(watcher2, "sync", 3000);
  hostAgain.emit("sync", { state: { afterReconnect: true } });
  check("and can write again", (await heard)?.state?.afterReconnect, true);
}

for (const s of sockets) { try { s.close(); } catch { /* ignore */ } }
server.kill();
console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
