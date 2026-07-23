// Solo-play bot runner for Murder Mystery: The Villagers.
// Fills a room with a host + N artificial players, waits for ONE human to pick a character, then
// auto-starts and plays the bot side (murderer kills on cooldown; host runs town meetings; bots
// vote) until the game ends. The human plays from their phone in the same room.
//
//   node bot-solo.mjs <URL> <ROOM> [numBots]
import { io } from "socket.io-client";

const URL = process.argv[2] || "http://178.104.130.122:3002";
const ROOM = (process.argv[3] || "SOLO1").toUpperCase();
const NBOTS = Number(process.argv[4] || 4);
const BOT_NAMES = ["Mabel", "Cyrus", "Opal", "Roscoe", "Winifred", "Dexter"];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

function mk(name, role) {
  const s = io(URL, { transports: ["websocket"], forceNew: true });
  const b = { s, name, role, you: null, state: null };
  s.on("m2:you", (y) => (b.you = y));
  s.on("m2:state", (st) => (b.state = st));
  s.on("m2:error", (e) => log(`[${name}] err: ${e}`));
  return b;
}

const host = mk("HOST", "host");
host.s.on("connect", () => host.s.emit("join", { room: ROOM, role: "host" }));
const bots = [];
for (let i = 0; i < NBOTS; i++) {
  const b = mk(BOT_NAMES[i] || "Bot" + i);
  b.s.on("connect", () => b.s.emit("m2:join", { room: ROOM, name: b.name }));
  bots.push(b);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const st = () => host.state || bots.find((b) => b.state)?.state;
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Wait until state has arrived AND every bot has a playerId (join round-trip done over the internet).
for (let i = 0; i < 40 && (!(st()?.characters?.length) || bots.some((b) => !b.you?.id)); i++) await sleep(500);

// Bots pick distinct characters, offset so the human still has variety near the top. Retry each until
// it registers (a pick can be dropped if it races the join over a slow link).
{
  const chars = st()?.characters || [];
  let idx = 20;
  for (const b of bots) {
    const taken = new Set((st()?.players || []).map((p) => p.characterId).filter(Boolean));
    while (chars[idx] && taken.has(chars[idx].id)) idx++;
    const target = chars[idx]; idx++;
    if (!target) continue;
    for (let tries = 0; tries < 5; tries++) {
      b.s.emit("m2:pick", { characterId: target.id });
      await sleep(700);
      if (st()?.players.find((p) => p.id === b.you?.id)?.characterId === target.id) break;
    }
  }
  const picked = (st()?.players || []).filter((p) => p.characterId).length;
  log(`${picked} bots have picked characters in room ${ROOM}. Waiting for a human to pick…`);
}

// Wait for the human (a picked player beyond our bots), then start. Fall back after 3 min.
{
  const deadline = Date.now() + 180000;
  const humanReady = () => (st()?.players || []).filter((p) => p.characterId).length >= NBOTS + 1;
  while (!humanReady() && Date.now() < deadline) await sleep(1500);
  if (humanReady()) { log("Human picked a character — starting in 4s…"); await sleep(4000); }
  else log("No human after 3 min — starting with bots only so you can still watch.");
  host.s.emit("m2:config", { killTarget: 3, cooldownSec: 15 });
  await sleep(400);
  host.s.emit("m2:start");
}

await sleep(1500);
const murdererBot = bots.find((b) => b.you?.role === "murderer");
log(murdererBot ? `The murderer is a BOT (${murdererBot.name}) — you're a villager, catch them.`
                : `A human or nobody-bot is the murderer — bots will hunt via town meetings.`);

// ---- main loop: drive the bot side until the game ends -------------------------------------------
let lastVoteAt = 0, lastKills = -1, votedThisRound = new Set();
while (true) {
  await sleep(2500);
  const s = st();
  if (!s) continue;
  if (s.phase === "ended") {
    log(`GAME OVER — ${s.winner === "town" ? "TOWN WINS" : "MURDERER WINS"}.`);
    break;
  }

  if (s.phase === "playing") {
    votedThisRound = new Set();
    // Bot murderer kills on cooldown.
    if (murdererBot && Date.now() >= (murdererBot.you?.cooldownUntil || 0)) {
      const alive = s.players.filter((p) => p.alive && p.id !== murdererBot.you.id);
      const victim = rand(alive);
      const ws = murdererBot.you.weapons || [];
      const own = murdererBot.you.ownWeaponId;
      const pool = murdererBot.you.mustUseOwnNow ? ws.filter((w) => w.id === own) : ws.filter((w) => w.remaining > 0);
      const set = rand(pool.length ? pool : ws);
      if (victim && set) {
        murdererBot.s.emit("m2:kill", { victimId: victim.id, weaponId: set.id, methodIndex: Math.floor(Math.random() * 3) });
        log(`${murdererBot.name} (murderer) struck ${victim.name} with Item Set ${set.setNumber} · ${set.label}.`);
      }
    }
    // Host calls a town meeting after each new kill (and at least 18s apart).
    if (s.killCount !== lastKills && s.killCount > 0 && Date.now() - lastVoteAt > 18000) {
      lastKills = s.killCount;
      lastVoteAt = Date.now();
      host.s.emit("m2:openVote");
      log(`Host called a TOWN MEETING (${s.killCount} killed so far). Vote on your phone!`);
    }
  }

  if (s.phase === "voting") {
    // Bots vote once each for a random living, uncleared suspect (never themselves).
    const suspects = s.players.filter((p) => p.alive && !p.cleared);
    for (const b of bots) {
      if (!b.you?.alive || votedThisRound.has(b.you.id)) continue;
      const pick = rand(suspects.filter((p) => p.id !== b.you.id));
      if (pick) { b.s.emit("m2:vote", { suspectId: pick.id }); votedThisRound.add(b.you.id); }
      await sleep(200);
    }
    // Give the human ~18s to vote, then the host closes the meeting.
    if (Date.now() - lastVoteAt > 18000) { host.s.emit("m2:closeVote"); log("Host closed the vote."); lastVoteAt = Date.now() + 999999; }
  }
}

[host, ...bots].forEach((b) => b.s.close());
process.exit(0);
