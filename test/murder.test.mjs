// Integration test for the authoritative Murder server: join, role assignment, private roles,
// validated kills, accusation, win detection. Run: node --test --test-force-exit test/murder.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { io as ioc } from "socket.io-client";

process.env.PORT = "8801";
await import("../apps/server/index.js");
const URL = "http://localhost:8801";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const connected = (s) => new Promise((res) => s.on("connect", res));
const client = () => ioc(URL, { transports: ["websocket"], forceNew: true });

// A player client that tracks its own private role/alive + the public state.
async function player(room, name) {
  const s = client();
  await connected(s);
  const st = { you: null, pub: null };
  s.on("m:you", (y) => (st.you = y));
  s.on("m:state", (p) => (st.pub = p));
  s.emit("m:join", { room, name });
  await delay(30);
  return { s, st, kill: (targetId) => s.emit("m:kill", { targetId }), accuse: (suspectId) => s.emit("m:accuse", { suspectId }) };
}

async function setupGame(room, names) {
  const host = client();
  await connected(host);
  host.emit("join", { room, role: "host" });
  const players = [];
  for (const n of names) players.push(await player(room, n));
  await delay(50);
  return { host, players };
}

test("assigns one murderer + one detective, rest civilians, privately", async () => {
  const { host, players } = await setupGame("MUR1", ["A", "B", "C", "D"]);
  host.emit("m:config", { murderers: 1, detectives: 1 });
  await delay(30);
  host.emit("m:assign");
  await delay(80);

  const roles = players.map((p) => p.st.you.role);
  assert.equal(roles.filter((r) => r === "murderer").length, 1);
  assert.equal(roles.filter((r) => r === "detective").length, 1);
  assert.equal(roles.filter((r) => r === "civilian").length, 2);
  // public state must NOT leak roles while playing
  assert.ok(players[0].st.pub.players.every((pl) => pl.role === undefined));
  host.close();
  players.forEach((p) => p.s.close());
});

test("murderer kills all non-murderers → murderers win", async () => {
  const { host, players } = await setupGame("MUR2", ["A", "B", "C", "D"]);
  host.emit("m:config", { murderers: 1, detectives: 1 });
  await delay(30);
  host.emit("m:assign");
  await delay(80);

  const murderer = players.find((p) => p.st.you.role === "murderer");
  const victims = players.filter((p) => p.st.you.role !== "murderer");
  for (const v of victims) {
    murderer.kill(v.st.you.id);
    await delay(40);
  }
  await delay(50);
  assert.equal(murderer.st.pub.phase, "ended");
  assert.equal(murderer.st.pub.winner, "murderers");
  // reveal exposes roles at the end
  assert.ok(murderer.st.pub.players.some((pl) => pl.role === "murderer"));
  host.close();
  players.forEach((p) => p.s.close());
});

test("detective accuses the murderer → civilians win; wrong guess kills detective", async () => {
  const { host, players } = await setupGame("MUR3", ["A", "B", "C", "D"]);
  host.emit("m:config", { murderers: 1, detectives: 1 });
  await delay(30);
  host.emit("m:assign");
  await delay(80);

  const det = players.find((p) => p.st.you.role === "detective");
  const murderer = players.find((p) => p.st.you.role === "murderer");
  const civilian = players.find((p) => p.st.you.role === "civilian");

  // wrong guess first → detective dies
  det.accuse(civilian.st.you.id);
  await delay(60);
  assert.equal(det.st.you.alive, false);

  host.close();
  players.forEach((p) => p.s.close());
});

test("a correct accusation wins for civilians", async () => {
  const { host, players } = await setupGame("MUR4", ["A", "B", "C", "D"]);
  host.emit("m:config", { murderers: 1, detectives: 1 });
  await delay(30);
  host.emit("m:assign");
  await delay(80);
  const det = players.find((p) => p.st.you.role === "detective");
  const murderer = players.find((p) => p.st.you.role === "murderer");
  det.accuse(murderer.st.you.id);
  await delay(60);
  assert.equal(det.st.pub.phase, "ended");
  assert.equal(det.st.pub.winner, "civilians");
  host.close();
  players.forEach((p) => p.s.close());
});
