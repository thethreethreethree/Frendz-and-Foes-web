// Actually PLAY each server-authoritative game, and check it can still be played when someone
// walks out mid-round.
//
// WHY THIS EXISTS. The stall that ruined a bar night was pure logic: a round advanced only when
// every player WITH a socketId had acted, and nothing cleared socketId when a phone vanished, so
// the round waited forever on someone who had gone home. No test caught it because no test ever
// had a player leave. This does exactly that, to every game that keeps a roster.
//
// Runs against a REAL server process over real sockets -- not the in-process harness -- so the
// wiring in index.js (join gating, handler registration, room lifecycle) is exercised too.
//
// Usage: node tools/smoke/playthrough.mjs
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { io } from "socket.io-client";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => {
  const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); });
});

const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ["apps/server/index.js"], {
  env: { ...process.env, PORT: String(PORT), GAMES_OPEN: "true", DB_PATH: (process.env.TEMP || "/tmp") + "/pzplay.db" },
  stdio: ["ignore", "pipe", "pipe"],
});
let up = false;
srv.stdout.on("data", (d) => { if (/relay listening/.test(String(d))) up = true; });
for (let i = 0; i < 80 && !up; i++) await sleep(250);
if (!up) { console.error("server did not start"); process.exit(2); }

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

async function connect(room, role, game) {
  const s = io(BASE, { transports: ["websocket"] });
  await new Promise((r) => s.on("connect", r));
  s.emit("join", { room, role, game });
  return s;
}

/** Spin up a display + host + N players for one game, tracking the latest public state. */
async function table(game, prefix, n, names) {
  const room = "PT" + Math.floor(10 + Math.random() * 89);
  const state = { last: null };
  const display = await connect(room, "display", game);
  const host = await connect(room, "host", game);
  for (const s of [display, host]) s.on(`${prefix}:state`, (st) => { state.last = st; });
  host.emit(`${prefix}:sync`, { room });
  display.emit(`${prefix}:sync`, { room });
  await sleep(600);
  const players = [];
  for (const name of names.slice(0, n)) {
    const s = await connect(room, "player", game);
    s.on(`${prefix}:you`, (y) => { s.you = y; });
    s.emit(`${prefix}:join`, { room, name, avatar: "🦝" });
    players.push(s);
    await sleep(250);
  }
  await sleep(900);
  return { room, host, display, players, state, close: () => [display, host, ...players].forEach((s) => s.close()) };
}

const NAMES = ["Ana", "Ben", "Cat", "Dan", "Eve", "Fay"];

// ---------------------------------------------------------------- After Dark
{
  console.log("\nAfter Dark");
  const t = await table("afterdark", "ca", 4, NAMES);
  check("the host sees the lobby without anyone acting first", !!t.state.last, "no state arrived");
  check("all four players are in", t.state.last?.players.length === 4, String(t.state.last?.players.length));
  t.host.emit("ca:start");
  await sleep(800);
  check("the game starts", t.state.last?.phase === "submitting", t.state.last?.phase);

  const judge = t.state.last.judgeId;
  const others = t.players.filter((p) => p.you && p.you.id !== judge);
  for (const p of others.slice(0, others.length - 1)) {
    p.emit("ca:submit", { cards: p.you.hand.slice(0, t.state.last.prompt.pick) });
    await sleep(250);
  }
  await sleep(600);
  check("still waiting while one player has not played", t.state.last?.phase === "submitting", t.state.last?.phase);
  others[others.length - 1].close();                      // somebody walks out
  await sleep(1200);
  check("a player leaving does NOT freeze the round", t.state.last?.phase === "judging", t.state.last?.phase);
  t.close();
}

// ---------------------------------------------------------------- Solo Clue
{
  console.log("\nSolo Clue");
  const t = await table("justone", "jo", 4, NAMES);
  check("the host sees the lobby", !!t.state.last);
  check("all four players are in", t.state.last?.players.length === 4, String(t.state.last?.players.length));
  t.host.emit("jo:start");
  await sleep(800);
  check("the game starts", t.state.last?.phase === "writing", t.state.last?.phase);
  const guesser = t.state.last.guesserId;
  const writers = t.players.filter((p) => p.you && p.you.id !== guesser);
  for (const p of writers.slice(0, writers.length - 1)) { p.emit("jo:clue", { word: "thing" }); await sleep(250); }
  await sleep(500);
  check("still waiting on the last clue", t.state.last?.phase === "writing", t.state.last?.phase);
  writers[writers.length - 1].close();
  await sleep(1200);
  check("a player leaving does NOT freeze the round", t.state.last?.phase === "reveal", t.state.last?.phase);
  t.close();
}

// ---------------------------------------------------------------- Ballpark
{
  console.log("\nBallpark");
  const t = await table("ballpark", "bp", 4, NAMES);
  check("the host sees the lobby", !!t.state.last);
  t.host.emit("bp:start");
  await sleep(800);
  check("the game starts", t.state.last?.phase === "guessing", t.state.last?.phase);
  for (const p of t.players.slice(0, 3)) { p.emit("bp:guess", { value: 40 + Math.random() * 20 }); await sleep(250); }
  await sleep(500);
  check("still waiting on the fourth guess", t.state.last?.phase === "guessing", t.state.last?.phase);
  t.players[3].close();
  await sleep(1200);
  check("a player leaving does NOT freeze the round", t.state.last?.phase === "betting", t.state.last?.phase);
  t.close();
}

// ---------------------------------------------------------------- Sketch Relay
{
  console.log("\nSketch Relay");
  const t = await table("telestrations", "te", 4, NAMES);
  check("the host sees the lobby", !!t.state.last);
  t.host.emit("te:start");
  await sleep(800);
  check("the game starts", t.state.last?.phase === "playing", t.state.last?.phase);
  const turn0 = t.state.last.turn;
  // Turn 0 is a DRAW turn, and the server rightly rejects empty strokes. My first version sent
  // `{ strokes: [] }`, every submission was refused, and the "still on the same turn" check passed
  // anyway -- a check that cannot fail. So send a real stroke, and ASSERT the submissions landed.
  // points is a FLAT list of numbers -- sanitizeStrokes does points.filter(Number.isFinite), so
  // nested [x, y] pairs are stripped and the stroke is discarded as empty.
  const stroke = [{ points: [10, 10, 40, 40, 70, 20], color: "#fff", width: 4 }];
  for (const p of t.players.slice(0, 3)) { p.emit("te:submit", { strokes: stroke, text: "a duck" }); await sleep(250); }
  await sleep(600);
  const done = t.state.last?.players.filter((p) => p.submitted).length ?? 0;
  check("three submissions actually registered", done === 3, `${done} registered -- the rest of this test is meaningless otherwise`);
  check("still on the same turn while one has not drawn", t.state.last?.turn === turn0, String(t.state.last?.turn));
  t.players[3].close();
  await sleep(1200);
  check("a player leaving does NOT freeze the turn", t.state.last?.turn > turn0, String(t.state.last?.turn));
  t.close();
}

// ---------------------------------------------------------------- Cover Ops
{
  console.log("\nCover Ops");
  const t = await table("codenames", "cn", 4, NAMES);
  check("the host sees the lobby", !!t.state.last);
  check("all four players are in", t.state.last?.players.length === 4, String(t.state.last?.players.length));
  // No all-must-act gate here, so there is no stall to test -- what matters is that a dropped
  // player is VISIBLE as dropped, so the host knows who is gone.
  t.players[3].close();
  await sleep(1200);
  const off = t.state.last?.players.filter((p) => !p.connected).length;
  check("a dropped player shows as disconnected", off === 1, `${off} shown offline`);
  t.close();
}

// ---------------------------------------------------------------- Murder Mystery
{
  console.log("\nMurder Mystery");
  const room = "PT" + Math.floor(10 + Math.random() * 89);
  const state = { last: null };
  const host = await connect(room, "host", "murder");
  host.on("m2:state", (st) => { state.last = st; });
  host.emit("m2:sync", { room });
  await sleep(1000);
  // This is the bug the browser pass found: before m2:sync existed, the host sat on "Connecting…"
  // forever because state only arrived once a PLAYER acted.
  check("the host gets state before any player joins", !!state.last, "no m2:state -- the host would sit on Connecting…");
  host.close();
}

console.log(failures ? `\n${failures} FAILED` : "\nevery game played through cleanly");
srv.kill();
process.exit(failures ? 1 : 0);
