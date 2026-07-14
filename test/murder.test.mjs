// Integration tests for Murder Mystery: The Villagers (authoritative server).
// Covers: character picking, role assignment, the weapon economy (2 uses/weapon + 2 frames then
// own weapon), cooldown, trials/voting, and both win conditions.
// Run: node --test --test-force-exit test/murder.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { io as ioc } from "socket.io-client";
import { VILLAGERS, weaponOf } from "../apps/server/villagers.js";

process.env.PORT = "8802";
await import("../apps/server/index.js");
const URL = "http://localhost:8802";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const connected = (s) => new Promise((res) => s.on("connect", res));
const client = () => ioc(URL, { transports: ["websocket"], forceNew: true });

async function player(room, name, characterId) {
  const s = client();
  await connected(s);
  const st = { you: null, pub: null, err: null };
  s.on("m:you", (y) => (st.you = y));
  s.on("m:state", (p) => (st.pub = p));
  s.on("m:error", (e) => (st.err = e));
  s.emit("m:join", { room, name });
  await delay(25);
  s.emit("m:pick", { characterId });
  await delay(25);
  return {
    s,
    st,
    kill: (targetId, weaponId) => s.emit("m:kill", { targetId, weaponId }),
    nominate: (suspectId) => s.emit("m:nominate", { suspectId }),
    vote: (yes) => s.emit("m:vote", { yes }),
  };
}

// 6 players (the minimum), each with a distinct villager.
async function setup(room, opts = {}) {
  const host = client();
  await connected(host);
  host.emit("join", { room, role: "host" });
  const chars = VILLAGERS.slice(0, 6).map((v) => v.id);
  const players = [];
  for (let i = 0; i < 6; i++) players.push(await player(room, `P${i + 1}`, chars[i]));
  await delay(40);
  host.emit("m:config", { cooldownSec: opts.cooldownSec ?? 0, trials: opts.trials ?? 3 });
  await delay(25);
  host.emit("m:assign");
  await delay(90);
  const murderer = players.find((p) => p.st.you.role === "murderer");
  const villagers = players.filter((p) => p.st.you.role !== "murderer");
  return { host, players, murderer, villagers };
}

test("assigns exactly one murderer; roles stay hidden in public state", async () => {
  const { host, players, murderer } = await setup("VIL1");
  assert.equal(players.filter((p) => p.st.you.role === "murderer").length, 1);
  assert.ok(murderer.st.you.ownWeaponId);
  assert.ok(players[0].st.pub.players.every((p) => p.role === undefined));
  host.close();
  players.forEach((p) => p.s.close());
});

test("weapon economy: max 2 frames, then only the murderer's own weapon", async () => {
  const { host, players, murderer, villagers } = await setup("VIL2", { cooldownSec: 0 });
  const own = murderer.st.you.ownWeaponId;
  const frames = murderer.st.you.allowedWeapons.filter((w) => w !== own);
  assert.equal(murderer.st.you.framesLeft, 2);

  // Two framing kills
  murderer.kill(villagers[0].st.you.id, frames[0]);
  await delay(60);
  murderer.kill(villagers[1].st.you.id, frames[1]);
  await delay(60);
  assert.equal(murderer.st.you.framesLeft, 0);
  // Framing budget spent → only own weapon remains allowed
  assert.deepEqual(murderer.st.you.allowedWeapons, [own]);

  // A further framing attempt is rejected by the server
  murderer.kill(villagers[2].st.you.id, frames[2] ?? frames[0]);
  await delay(60);
  assert.equal(murderer.st.pub.kills, 2); // no third kill registered

  host.close();
  players.forEach((p) => p.s.close());
});

test("4 kills (2 frames + 2 own) → MURDERER wins; clues name the framed weapon", async () => {
  const { host, players, murderer, villagers } = await setup("VIL3", { cooldownSec: 0 });
  const own = murderer.st.you.ownWeaponId;
  const frames = murderer.st.you.allowedWeapons.filter((w) => w !== own);

  murderer.kill(villagers[0].st.you.id, frames[0]);
  await delay(50);
  murderer.kill(villagers[1].st.you.id, frames[1]);
  await delay(50);
  murderer.kill(villagers[2].st.you.id, own);
  await delay(50);
  murderer.kill(villagers[3].st.you.id, own); // own weapon now used 2x (its cap)
  await delay(80);

  assert.equal(murderer.st.pub.phase, "ended");
  assert.equal(murderer.st.pub.winner, "murderer");
  assert.equal(murderer.st.pub.feed.length, 4);
  assert.ok(murderer.st.pub.feed[0].weaponName); // clue carries the weapon
  assert.ok(murderer.st.pub.feed[0].framedCharacterId); // ...and who it frames
  host.close();
  players.forEach((p) => p.s.close());
});

test("cooldown blocks back-to-back kills", async () => {
  const { host, players, murderer, villagers } = await setup("VIL4", { cooldownSec: 60 });
  const own = murderer.st.you.ownWeaponId;
  const frame = murderer.st.you.allowedWeapons.find((w) => w !== own);
  murderer.kill(villagers[0].st.you.id, frame);
  await delay(60);
  assert.equal(murderer.st.pub.kills, 1);
  murderer.kill(villagers[1].st.you.id, own); // still cooling down
  await delay(60);
  assert.equal(murderer.st.pub.kills, 1); // blocked
  assert.match(murderer.st.err ?? "", /cooling/i);
  host.close();
  players.forEach((p) => p.s.close());
});

test("correct trial verdict → VILLAGE wins", async () => {
  const { host, players, murderer, villagers } = await setup("VIL5", { cooldownSec: 0 });
  villagers[0].nominate(murderer.st.you.id);
  await delay(50);
  assert.ok(villagers[0].st.pub.vote); // a vote is open
  assert.equal(villagers[0].st.pub.trialsLeft, 2); // a trial was spent

  // everyone alive votes guilty
  [...villagers, murderer].forEach((p) => p.vote(true));
  await delay(90);
  assert.equal(villagers[0].st.pub.phase, "ended");
  assert.equal(villagers[0].st.pub.winner, "village");
  host.close();
  players.forEach((p) => p.s.close());
});

test("wrong verdict → suspect cleared, trial burned, murderer cooldown reset", async () => {
  const { host, players, murderer, villagers } = await setup("VIL6", { cooldownSec: 90 });
  const own = murderer.st.you.ownWeaponId;
  const frame = murderer.st.you.allowedWeapons.find((w) => w !== own);
  murderer.kill(villagers[0].st.you.id, frame); // sets a 90s cooldown
  await delay(60);

  const innocent = villagers[1];
  villagers[2].nominate(innocent.st.you.id);
  await delay(40);
  [...villagers.filter((v) => v.st.you.alive !== false), murderer].forEach((p) => p.vote(true));
  await delay(90);

  const pub = villagers[2].st.pub;
  assert.equal(pub.phase, "playing"); // wrong guess: game continues
  assert.equal(pub.players.find((p) => p.id === innocent.st.you.id).cleared, true);
  assert.equal(pub.trialsLeft, 2);
  assert.ok(murderer.st.you.cooldownUntil <= Date.now()); // free kill window granted
  host.close();
  players.forEach((p) => p.s.close());
});
