// Murder Mystery v2 — "The Villagers". AUTHORITATIVE on the server (clients can't cheat).
// See docs/MURDER-v2-spec.md. Core twist: each kill's weapon is a clue that frames the player whose
// character owns that weapon. The murderer may reuse a weapon ≤2 times and MUST use their own
// signature weapon by the final kill.
//
// Per-room state lives at rooms.get(code).murder2:
//   { phase, players:Map, murdererId, killTarget, cooldownSec, cooldownUntil, kills[], weaponUses{},
//     vote, winner, cleared:Set }

import { randomBytes } from "node:crypto";
import { WEAPONS, VILLAGERS, getVillager, villagerForWeapon, methodAt } from "./villagers2.js";

const DEFAULTS = { killTarget: 4, cooldownSec: 75, rewardCooldownSec: 30, maxPerWeapon: 2, investigateCooldownSec: 45 };

function ensure(rooms, code) {
  let r = rooms.get(code);
  if (!r) {
    r = { snapshot: null, peers: new Map() };
    rooms.set(code, r);
  }
  if (!r.murder2) {
    r.murder2 = {
      phase: "lobby",
      players: new Map(),
      murdererId: null,
      detectiveId: null,        // one player (games of 4+) can privately investigate suspects
      killTarget: DEFAULTS.killTarget,
      cooldownSec: DEFAULTS.cooldownSec,
      cooldownUntil: 0,
      investigateUntil: 0,      // the detective's next-allowed investigation time
      findings: [],             // [{ suspectId, isMurderer, at }] — PRIVATE to the detective
      kills: [],
      weaponUses: {},
      vote: null,
      cleared: new Set(),
      winner: null,
    };
  }
  return r.murder2;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const alivePlayers = (m) => [...m.players.values()].filter((p) => p.alive);
const takenCharacterIds = (m) => new Set([...m.players.values()].map((p) => p.characterId).filter(Boolean));
const playerByCharacter = (m, characterId) => [...m.players.values()].find((p) => p.characterId === characterId) || null;
const murderer = (m) => (m.murdererId ? m.players.get(m.murdererId) : null);
const ownWeaponId = (m) => {
  const mu = murderer(m);
  const v = mu?.characterId ? getVillager(mu.characterId) : null;
  return v ? v.weaponId : null;
};

// The weapons the murderer may choose from = signature weapons of characters players actually picked.
function availableWeapons(m) {
  const ids = new Set([...m.players.values()].map((p) => (p.characterId ? getVillager(p.characterId)?.weaponId : null)).filter(Boolean));
  return [...ids].map((id) => {
    const owner = playerByCharacter(m, villagerForWeapon(id)?.id);
    return {
      ...WEAPONS[id],
      uses: m.weaponUses[id] || 0,
      remaining: DEFAULTS.maxPerWeapon - (m.weaponUses[id] || 0),
      framesPlayerId: owner?.id || null,
      framesName: owner ? `${owner.name} (${getVillager(owner.characterId)?.profession})` : null,
    };
  });
}

// Public, cheat-safe state for everyone. Roles are hidden until the game ends.
function publicState(m) {
  const reveal = m.phase === "ended";
  return {
    phase: m.phase,
    killTarget: m.killTarget,
    cooldownSec: m.cooldownSec,
    cooldownUntil: m.cooldownUntil,
    killCount: m.kills.length,
    winner: m.winner,
    murdererId: reveal ? m.murdererId : undefined,
    detectiveId: reveal ? m.detectiveId : undefined,
    hasDetective: !!m.detectiveId, // public: the town knows a detective walks among them, not who
    characters: VILLAGERS.map((v) => ({ ...v, weapon: WEAPONS[v.weaponId] })),
    weapons: WEAPONS,
    players: [...m.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      characterId: p.characterId,
      alive: p.alive,
      connected: !!p.socketId,
      cleared: m.cleared.has(p.id),
      role: reveal ? p.role : undefined,
    })),
    // The clue feed: the item set used (location + card) and which of its three methods staged the
    // kill, plus who the set frames. The SET is the deduction key; the method is narrative colour and
    // deliberately non-identifying (methods are shared across sets — see villagers.js header).
    clues: m.kills.map((k) => ({
      weaponId: k.weaponId,
      weapon: WEAPONS[k.weaponId],
      methodIndex: k.methodIndex ?? 0,
      method: methodAt(k.weaponId, k.methodIndex),
      framedPlayerId: k.framedPlayerId,
      framedCharacterId: k.framedCharacterId,
      victimId: k.victimId,
      at: k.at,
    })),
    vote: m.vote
      ? { active: true, tally: m.vote.tally, votedBy: [...m.vote.votedBy] }
      : null,
  };
}

// Public state for a room (or null). Used to catch up a late joiner (display refresh, spectator)
// on the generic "join", the same way the Feud path replays its stored snapshot.
export function murder2PublicState(rooms, code) {
  const m = rooms.get(code)?.murder2;
  return m ? publicState(m) : null;
}

export function registerMurder2Handlers(io, socket, rooms, roomKey = (r) => String(r).toUpperCase(), now = () => Date.now()) {
  const broadcast = (code) => io.to(code).emit("m2:state", publicState(rooms.get(code).murder2));
  const announce = (code, payload) => io.to(code).emit("m2:announce", payload);
  const err = (msg) => socket.emit("m2:error", msg);

  // Private per-player view: role + (for the murderer) weapon intel. `rejoinToken` rides along here
  // and ONLY here — m2:you goes to that player's own socket, whereas m2:state is broadcast to the
  // room. It must never be added to publicState().
  const sendYou = (m, p) => {
    if (!p.socketId) return;
    const base = { id: p.id, role: p.role, alive: p.alive, characterId: p.characterId, rejoinToken: p.rejoinToken };
    if (p.role === "murderer") {
      const own = ownWeaponId(m);
      io.to(p.socketId).emit("m2:you", {
        ...base,
        ownWeaponId: own,
        ownWeapon: own ? WEAPONS[own] : null,
        killsRemaining: m.killTarget - m.kills.length,
        weapons: availableWeapons(m),
        cooldownUntil: m.cooldownUntil,
        mustUseOwnNow: m.killTarget - m.kills.length <= 1 && !(m.weaponUses[own] > 0),
      });
    } else if (p.role === "detective") {
      // Findings are delivered ONLY here, on the detective's own private channel — never in the
      // broadcast state — so investigating a suspect can't be read by anyone else.
      io.to(p.socketId).emit("m2:you", {
        ...base,
        investigateUntil: m.investigateUntil,
        investigateCooldownSec: DEFAULTS.investigateCooldownSec,
        findings: m.findings.map((f) => ({
          suspectId: f.suspectId,
          name: m.players.get(f.suspectId)?.name || "?",
          profession: getVillager(m.players.get(f.suspectId)?.characterId)?.profession || "?",
          isMurderer: f.isMurderer,
        })),
      });
    } else {
      io.to(p.socketId).emit("m2:you", base);
    }
  };
  const sendYouAll = (m) => { for (const p of m.players.values()) sendYou(m, p); };

  // --- Lobby: join + pick a character ---------------------------------------------------------
  socket.on("m2:join", ({ room, name, playerId, rejoinToken }) => {
    if (!room || !name) return;
    const code = roomKey(room);
    socket.join(code);
    socket.data.code2 = code;
    const m = ensure(rooms, code);
    let p = playerId && m.players.get(playerId);
    if (p) {
      // Reclaiming an existing player must be PROVEN, not asserted. Player ids are published to
      // every client in m2:state, so accepting a bare id let any player adopt any other player —
      // including the murderer — and receive their private role and kill intel over m2:you. The
      // token is issued once, sent only over m2:you, and never appears in the broadcast state.
      if (!p.rejoinToken || rejoinToken !== p.rejoinToken) return err("Could not restore that player.");
      p.socketId = socket.id;
      p.name = name;
    } else {
      const id = "p" + Math.random().toString(36).slice(2, 8);
      p = { id, name, socketId: socket.id, characterId: null, role: null, alive: true, rejoinToken: randomBytes(24).toString("hex") };
      m.players.set(id, p);
    }
    socket.data.playerId2 = p.id;
    sendYou(m, p);
    broadcast(code);
  });

  socket.on("m2:pick", ({ characterId }) => {
    const code = socket.data.code2;
    const m = code && rooms.get(code)?.murder2;
    if (!m || m.phase !== "lobby") return;
    const p = m.players.get(socket.data.playerId2);
    if (!p) return;
    if (!getVillager(characterId)) return err("Unknown character.");
    if (takenCharacterIds(m).has(characterId) && p.characterId !== characterId) return err("That character is taken.");
    p.characterId = characterId;
    sendYou(m, p);
    broadcast(code);
  });

  // The host controller connects via the generic "join" (index.js sets socket.data.code and
  // socket.data.role) rather than m2:join, so fall back to it — otherwise host actions would no-op.
  // Both paths produce the same tenant-namespaced room key.
  const hostCode = () => socket.data.code2 || socket.data.code;

  // Host actions are the controller's alone. Players reach the room via m2:join, which never sets
  // socket.data.role, so this stops any player — using the app or a script driving their own player
  // socket — from starting, resetting, or running votes. It is HARDENING, not authentication: a
  // hand-crafted socket can still emit join{role:"host"} and claim the controller. Closing that
  // needs a real host token minted with the room and carried in the host QR, which remains open
  // (recorded [KNOWN · LOW] in docs/AUDIT-2026-07-11-multitenant-foundation.md).
  const isHost = () => socket.data.role === "host";

  socket.on("m2:config", ({ killTarget, cooldownSec }) => {
    if (!isHost()) return err("Only the host can configure the game.");
    const m = rooms.get(hostCode())?.murder2;
    if (!m || m.phase !== "lobby") return;
    if (Number.isFinite(killTarget)) m.killTarget = Math.max(2, Math.min(10, killTarget | 0));
    if (Number.isFinite(cooldownSec)) m.cooldownSec = Math.max(10, Math.min(300, cooldownSec | 0));
    broadcast(hostCode());
  });

  // --- Start: assign the murderer -------------------------------------------------------------
  socket.on("m2:start", () => {
    if (!isHost()) return err("Only the host can start the game.");
    const code = hostCode();
    const m = rooms.get(code)?.murder2;
    if (!m || m.phase !== "lobby") return;
    const withChar = [...m.players.values()].filter((p) => p.characterId);
    if (withChar.length < 3) return err("Need at least 3 players who picked a character.");
    for (const p of m.players.values()) { p.alive = true; p.role = "villager"; }
    const order = shuffle(withChar);
    order[0].role = "murderer";
    m.murdererId = order[0].id;
    // A detective joins the town once there are enough players that one hidden investigator still
    // leaves ≥2 plain villagers (murderer + detective + 2). Below that, no detective.
    m.detectiveId = null;
    if (withChar.length >= 4) { order[1].role = "detective"; m.detectiveId = order[1].id; }
    m.phase = "playing";
    m.kills = [];
    m.weaponUses = {};
    m.cleared = new Set();
    m.cooldownUntil = 0;
    m.investigateUntil = 0;
    m.findings = [];
    m.winner = null;
    sendYouAll(m);
    broadcast(code);
    announce(code, { type: "start" });
  });

  // --- Detective: privately investigate a suspect → learn whether they are the murderer ----------
  socket.on("m2:investigate", ({ suspectId }) => {
    const code = socket.data.code2;
    const m = code && rooms.get(code)?.murder2;
    if (!m || m.phase !== "playing") return;
    const p = m.players.get(socket.data.playerId2);
    if (!p || p.role !== "detective" || !p.alive) return err("Only the detective can investigate.");
    if (now() < m.investigateUntil) return err("Still gathering evidence — wait before investigating again.");
    const suspect = m.players.get(suspectId);
    if (!suspect || suspect.id === p.id) return err("Invalid suspect.");
    if (m.findings.some((f) => f.suspectId === suspectId)) return err("You already investigated them.");
    m.findings.push({ suspectId, isMurderer: suspect.id === m.murdererId, at: now() });
    m.investigateUntil = now() + DEFAULTS.investigateCooldownSec * 1000;
    sendYou(m, p); // the result goes ONLY to the detective; no broadcast, no announce
  });

  // --- Kill: the murderer logs a victim, a framing item set, and how it was staged --------------
  socket.on("m2:kill", ({ victimId, weaponId, methodIndex }) => {
    const code = socket.data.code2;
    const m = code && rooms.get(code)?.murder2;
    if (!m || m.phase !== "playing") return;
    const killer = m.players.get(socket.data.playerId2);
    if (!killer || killer.role !== "murderer" || !killer.alive) return err("Only the murderer can act.");
    if (now() < m.cooldownUntil) return err("Cooling down — wait before the next kill.");

    const victim = m.players.get(victimId);
    if (!victim || !victim.alive || victim.id === killer.id) return err("Invalid victim.");
    const set = WEAPONS[weaponId];
    if (!set) return err("Unknown item set.");
    // The set must belong to a character present (frames a real player).
    const framed = playerByCharacter(m, villagerForWeapon(weaponId)?.id);
    if (!framed) return err("That item set doesn't match anyone in the room.");
    if ((m.weaponUses[weaponId] || 0) >= DEFAULTS.maxPerWeapon) return err("That item set is used up (max 2).");
    // Which of the set's three methods staged it. Rejected rather than clamped: a client sending an
    // out-of-range index is confused about the set it is holding, and silently picking method 0 would
    // print a plausible wrong story into the permanent clue record.
    const mi = methodIndex ?? 0;
    if (!Number.isInteger(mi) || mi < 0 || mi >= set.methods.length) return err("Unknown method for that item set.");

    // Must-use-own enforcement: on the final kill, if the own weapon was never used, force it.
    const own = ownWeaponId(m);
    const killsRemaining = m.killTarget - m.kills.length;
    if (killsRemaining <= 1 && !(m.weaponUses[own] > 0) && weaponId !== own) {
      return err("Final kill: you must use your own item set.");
    }

    victim.alive = false;
    m.weaponUses[weaponId] = (m.weaponUses[weaponId] || 0) + 1;
    m.kills.push({ victimId: victim.id, weaponId, methodIndex: mi, framedPlayerId: framed.id, framedCharacterId: framed.characterId, at: now() });
    m.cooldownUntil = now() + m.cooldownSec * 1000;

    sendYou(m, victim);
    sendYou(m, killer); // refresh weapon intel
    announce(code, { type: "killed", victim: victim.name, weapon: set.label, method: methodAt(weaponId, mi), framesName: `${framed.name} (${getVillager(framed.characterId)?.profession})` });

    // Murderers win at the kill target OR when no villagers remain alive (prevents a deadlock when
    // killTarget exceeds the number of villagers — e.g. 4 target with only 2 villagers).
    const villagersAlive = alivePlayers(m).filter((p) => p.id !== m.murdererId).length;
    if (m.kills.length >= m.killTarget || villagersAlive === 0) {
      m.phase = "ended";
      m.winner = "murderers";
      announce(code, { type: "end", winner: "murderers" });
    }
    broadcast(code);
  });

  // --- Voting: host opens a town meeting; alive players vote a suspect -------------------------
  socket.on("m2:openVote", () => {
    if (!isHost()) return err("Only the host can call a town meeting.");
    const code = hostCode();
    const m = rooms.get(code)?.murder2;
    if (!m || m.phase !== "playing") return;
    m.phase = "voting";
    m.vote = { tally: {}, votedBy: new Set() };
    broadcast(code);
    announce(code, { type: "vote-open" });
  });

  socket.on("m2:vote", ({ suspectId }) => {
    const code = socket.data.code2;
    const m = code && rooms.get(code)?.murder2;
    if (!m || m.phase !== "voting" || !m.vote) return;
    const voter = m.players.get(socket.data.playerId2);
    if (!voter || !voter.alive) return err("Only the living may vote.");
    const suspect = m.players.get(suspectId);
    if (!suspect || !suspect.alive || m.cleared.has(suspect.id)) return err("Invalid suspect.");
    if (m.vote.votedBy.has(voter.id)) return err("You already voted.");
    m.vote.tally[suspectId] = (m.vote.tally[suspectId] || 0) + 1;
    m.vote.votedBy.add(voter.id);
    broadcast(code);
    // Auto-resolve once every living player has voted.
    if (m.vote.votedBy.size >= alivePlayers(m).length) resolveVote(code, m);
  });

  socket.on("m2:closeVote", () => {
    if (!isHost()) return err("Only the host can close the vote.");
    const code = hostCode();
    const m = rooms.get(code)?.murder2;
    if (m && m.phase === "voting") resolveVote(code, m);
  });

  function resolveVote(code, m) {
    const votes = m.vote?.tally || {};
    const livingCount = alivePlayers(m).length;
    let topId = null;
    let topN = 0;
    for (const [id, n] of Object.entries(votes)) if (n > topN) { topN = n; topId = id; }
    const majority = topId && topN > livingCount / 2;
    m.vote = null;

    if (majority && topId === m.murdererId) {
      m.phase = "ended";
      m.winner = "town";
      announce(code, { type: "end", winner: "town", caught: m.players.get(topId)?.name });
    } else if (majority && topId) {
      // Wrong majority: clear the suspect (immune) + reward the murderer by shortening the CURRENT
      // cooldown so the next kill can come sooner.
      m.cleared.add(topId);
      m.cooldownUntil = Math.min(m.cooldownUntil, now() + DEFAULTS.rewardCooldownSec * 1000);
      m.phase = "playing";
      announce(code, { type: "vote-wrong", cleared: m.players.get(topId)?.name });
    } else {
      m.phase = "playing"; // no majority → nothing happens
      announce(code, { type: "vote-none" });
    }
    if (m.phase === "playing") { const mu = murderer(m); if (mu) sendYou(m, mu); }
    broadcast(code);
  }

  socket.on("m2:reset", ({ full } = {}) => {
    if (!isHost()) return err("Only the host can reset the game.");
    const code = hostCode();
    const m = rooms.get(code)?.murder2;
    if (!m) return;
    if (full) m.players.clear();
    m.phase = "lobby";
    m.murdererId = null;
    m.detectiveId = null;
    m.kills = [];
    m.weaponUses = {};
    m.cleared = new Set();
    m.vote = null;
    m.winner = null;
    m.cooldownUntil = 0;
    m.investigateUntil = 0;
    m.findings = [];
    for (const p of m.players.values()) { p.role = null; p.alive = true; sendYou(m, p); }
    broadcast(code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.code2;
    const m = code && rooms.get(code)?.murder2;
    if (!m || !socket.data.playerId2) return;
    const p = m.players.get(socket.data.playerId2);
    if (p) p.socketId = null;
    broadcast(code);
  });
}
