// Murder Mystery, played out over real sockets.  Run:  node apps/server/murderGame.test.mjs
//
// Two things asserted by actually PLAYING rather than by reading the code:
//
// 1. WHAT A VOTE ACTUALLY DOES. This harness was written to confirm a reported "vote deadlock" and
//    instead DISPROVED it: a wrong majority CLEARS a suspect (immunises them) and kills nobody, so
//    a vote can never wipe out the villagers. The bug report came from re-reading the code; the
//    game itself settled it in one run. That is the whole argument for this file existing.
//
// 2. HOST AUTHORITY REACHES THE ENGINES. Every engine decides host with
//    `socket.data.role === "host"` - the value the CLIENT sent. The host-claim fix downgrades a
//    denied claimer to "spectator", which should mean their game commands are refused too. That is
//    a chain of two mechanisms in different files, so it is proven here rather than assumed.

import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { io as ioClient } from "socket.io-client";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const TMP = join(tmpdir(), "playzoo-murder-test");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, "auth"), { recursive: true });
const PORT = 8881;
const ROOM = "MURDERTEST";

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

const all = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function connect() {
  const s = ioClient(`http://127.0.0.1:${PORT}`, { transports: ["websocket"], forceNew: true });
  all.push(s);
  s.state = null; s.you = null; s.errors = [];
  s.on("m2:state", (st) => { s.state = st; });
  s.on("m2:you", (y) => { s.you = y; });
  s.on("m2:error", (e) => s.errors.push(e?.error || e));
  return s;
}
const connected = (s) => new Promise((r) => (s.connected ? r() : s.once("connect", r)));

// --- set up a 3-player game: 1 murderer, 2 villagers (a detective only joins at 4+) --------------
const host = connect();
await connected(host);
host.emit("join", { room: ROOM, role: "host" });
await wait(300);

const players = [];
for (const name of ["Ann", "Ben", "Cat"]) {
  const p = connect();
  await connected(p);
  p.emit("join", { room: ROOM, role: "player" });
  p.emit("m2:join", { room: ROOM, name });
  await wait(200);
  p.name = name;
  players.push(p);
}
await wait(300);
// Every player needs a character before the game can start.
// Real ids from the 100-strong villagers roster; invented ones are refused.
const CHARS = ["sam", "allen", "eugene"];
players.forEach((p, i) => p.emit("m2:pick", { characterId: CHARS[i] }));
await wait(400);

console.log("\n--- the game starts ---");
host.emit("m2:start");
await wait(500);
check("phase is playing", host.state?.phase, "playing");
check("three players are in", host.state?.players?.length, 3);

const murderer = players.find((p) => p.you?.role === "murderer");
const villagers = players.filter((p) => p.you?.role !== "murderer");
check("exactly one murderer was assigned", players.filter((p) => p.you?.role === "murderer").length, 1);
check("the other two are not murderers", villagers.length, 2);

// --- an impostor must not be able to drive the game ---------------------------------------------
console.log("\n--- an impostor claiming host cannot run the game ---");
{
  const impostor = connect();
  await connected(impostor);
  impostor.emit("join", { room: ROOM, role: "host" });   // no token: denied, downgraded to spectator
  await wait(300);
  const before = host.state?.phase;
  impostor.emit("m2:reset", { full: true });             // the most destructive command there is
  await wait(400);
  check("the impostor's reset is refused", host.state?.phase, before);
  check("and the players are still in the game", host.state?.players?.length, 3);
}

// --- what a majority vote REALLY does ------------------------------------------------------------
async function voteFor(targetId) {
  host.emit("m2:openVote");
  await wait(300);
  for (const p of players) p.emit("m2:vote", { suspectId: targetId });   // unanimous: always a majority
  await wait(600);
  host.emit("m2:closeVote");
  await wait(500);
}
const idOf = (p) => p.you?.id;
const alive = (id) => host.state?.players?.find((p) => p.id === id)?.alive;

console.log("");
console.log("--- voting out a VILLAGER ---");
await voteFor(idOf(villagers[0]));
// The correction: the villager is CLEARED, not killed. Nobody dies on a wrong majority.
check("the villager is still alive", alive(idOf(villagers[0])), true);
check("the game continues", host.state?.phase, "playing");
check("everyone is still in", host.state?.players?.filter((p) => p.alive).length, 3);

console.log("");
console.log("--- voting out the MURDERER ---");
await voteFor(idOf(murderer));
check("the murderer is eliminated", alive(idOf(murderer)), false);
check("the game ends", host.state?.phase, "ended");
check("and the town wins", host.state?.winner, "town");

for (const s of all) { try { s.close(); } catch { /* ignore */ } }
server.kill();
console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
