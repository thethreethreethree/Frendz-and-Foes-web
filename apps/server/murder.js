// Murder Mystery: The Villagers — AUTHORITATIVE server game.
//
// Rules:
//  - Players scan a QR, pick a unique villager character. Each character has a SIGNATURE WEAPON.
//    The roster is public: that's what makes deduction possible (scissors => the Barber).
//  - The server secretly picks ONE murderer. Kills happen in person (a wink), then the murderer
//    logs the victim AND CHOOSES A WEAPON on their phone. The weapon is revealed as a CLUE,
//    framing whoever owns that weapon (usually NOT the victim).
//  - WEAPON ECONOMY (both limits): any weapon may be used at most 2x, AND at most 2 kills may use
//    a "framing" weapon (not your own). After the framing budget is spent, only your OWN weapon
//    is allowed (also capped at 2). That math means exactly 4 kills are possible => 4 kills wins.
//    The strategy is the ORDER: bluff with your own weapon early, or frame first and get exposed
//    late.
//  - COOLDOWN between kills gives the village time to think.
//  - TRIALS: any living player nominates a suspect; living players vote. Correct => VILLAGE WINS.
//    Wrong => the suspect is CLEARED (immune), a trial is burned, and the murderer's cooldown is
//    reset (a free kill window). Trials are limited.

import { VILLAGERS, byId, weaponOf } from "./villagers.js";

const DEFAULTS = { killsToWin: 4, cooldownSec: 90, trials: 3, minPlayers: 6, voteSec: 45 };

function ensureMurder(rooms, code) {
  let r = rooms.get(code);
  if (!r) {
    r = { snapshot: null, peers: new Map() };
    rooms.set(code, r);
  }
  if (!r.murder) r.murder = freshGame();
  return r.murder;
}

function freshGame(prev) {
  return {
    phase: "lobby",
    config: { ...DEFAULTS, ...(prev?.config ?? {}) },
    players: prev?.players ?? new Map(),
    killer: null,
    trialsLeft: 0,
    vote: null,
    feed: [],
    winner: null,
  };
}

/** Weapons available in this game = signature weapons of the characters actually in play. */
function weaponPool(m) {
  const out = [];
  for (const p of m.players.values()) {
    const v = byId(p.characterId);
    if (v) out.push(v.weaponId);
  }
  return [...new Set(out)];
}

function ownWeapon(m) {
  const killer = [...m.players.values()].find((p) => p.role === "murderer");
  return killer ? weaponOf(killer.characterId) : null;
}

/** Weapons the murderer may still choose, given both limits. */
function allowedWeapons(m) {
  if (!m.killer) return [];
  const own = ownWeapon(m);
  return weaponPool(m).filter((w) => {
    if ((m.killer.weaponUses[w] || 0) >= 2) return false; // weapon exhausted (max 2 uses)
    if (w !== own && m.killer.framesUsed >= 2) return false; // framing budget spent
    return true;
  });
}

function publicState(m) {
  const reveal = m.phase === "ended";
  return {
    phase: m.phase,
    config: { killsToWin: m.config.killsToWin, cooldownSec: m.config.cooldownSec },
    trialsLeft: m.trialsLeft,
    winner: m.winner,
    kills: m.feed.length,
    players: [...m.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      characterId: p.characterId,
      alive: p.alive,
      cleared: p.cleared,
      connected: !!p.socketId,
      role: reveal ? p.role : undefined,
    })),
    feed: m.feed,
    vote: m.vote
      ? {
          suspectId: m.vote.suspectId,
          suspectName: m.players.get(m.vote.suspectId)?.name ?? "?",
          byName: m.players.get(m.vote.by)?.name ?? "?",
          endsAt: m.vote.endsAt,
          yes: [...m.vote.votes.values()].filter(Boolean).length,
          no: [...m.vote.votes.values()].filter((v) => v === false).length,
          voted: [...m.vote.votes.keys()],
        }
      : null,
  };
}

function youPayload(m, p) {
  const base = { id: p.id, role: p.role, alive: p.alive, characterId: p.characterId };
  if (p.role !== "murderer" || !m.killer) return base;
  return {
    ...base,
    ownWeaponId: ownWeapon(m),
    kills: m.killer.kills,
    killsToWin: m.config.killsToWin,
    framesLeft: Math.max(0, 2 - m.killer.framesUsed),
    weaponUses: m.killer.weaponUses,
    cooldownUntil: m.killer.cooldownUntil,
    allowedWeapons: allowedWeapons(m),
  };
}

export function registerMurderHandlers(io, socket, rooms) {
  const roomOf = () => socket.data.code;
  const game = () => rooms.get(roomOf())?.murder;
  const broadcast = (code) => io.to(code).emit("m:state", publicState(rooms.get(code).murder));
  const announce = (code, payload) => io.to(code).emit("m:announce", payload);
  const sendYou = (m, p) => p.socketId && io.to(p.socketId).emit("m:you", youPayload(m, p));
  const sendAllYou = (m) => {
    for (const p of m.players.values()) sendYou(m, p);
  };

  socket.on("m:join", ({ room, name, playerId }) => {
    if (!room || !name) return;
    const code = room.toUpperCase();
    socket.join(code);
    socket.data.code = code;
    socket.data.role = "player";
    const m = ensureMurder(rooms, code);

    let p = playerId && m.players.get(playerId);
    if (p) {
      p.socketId = socket.id;
      p.name = name;
    } else {
      const id = "p" + Math.random().toString(36).slice(2, 8);
      p = { id, name, socketId: socket.id, characterId: null, role: null, alive: true, cleared: false };
      m.players.set(id, p);
    }
    socket.data.playerId = p.id;
    sendYou(m, p);
    broadcast(code);
  });

  // Claim a villager character (unique, lobby only).
  socket.on("m:pick", ({ characterId }) => {
    const m = game();
    if (!m || m.phase !== "lobby") return;
    const p = m.players.get(socket.data.playerId);
    if (!p || !byId(characterId)) return;
    const taken = [...m.players.values()].some((o) => o.id !== p.id && o.characterId === characterId);
    if (taken) return socket.emit("m:error", "That villager is already taken.");
    p.characterId = characterId;
    sendYou(m, p);
    broadcast(roomOf());
  });

  socket.on("m:config", ({ cooldownSec, trials }) => {
    const m = game();
    if (!m || m.phase !== "lobby") return;
    // NOTE: check for undefined, not truthiness — 0 (no cooldown) is a valid choice.
    if (cooldownSec !== undefined)
      m.config.cooldownSec = Math.max(0, Math.min(180, cooldownSec | 0));
    if (trials !== undefined) m.config.trials = Math.max(1, Math.min(6, trials | 0));
    broadcast(roomOf());
  });

  socket.on("m:assign", () => {
    const code = roomOf();
    const m = game();
    if (!m) return;
    const players = [...m.players.values()];
    if (players.length < m.config.minPlayers)
      return socket.emit("m:error", `Need at least ${m.config.minPlayers} players.`);
    if (players.some((p) => !p.characterId))
      return socket.emit("m:error", "Every player must pick a villager first.");

    const killerIdx = Math.floor(Math.random() * players.length);
    players.forEach((p, i) => {
      p.role = i === killerIdx ? "murderer" : "villager";
      p.alive = true;
      p.cleared = false;
    });
    m.killer = { kills: 0, framesUsed: 0, weaponUses: {}, cooldownUntil: 0 };
    m.trialsLeft = m.config.trials;
    m.feed = [];
    m.vote = null;
    m.winner = null;
    m.phase = "playing";

    sendAllYou(m);
    broadcast(code);
    announce(code, { type: "start" });
  });

  socket.on("m:kill", ({ targetId, weaponId }) => {
    const code = roomOf();
    const m = game();
    if (!m || m.phase !== "playing" || !m.killer) return;
    const killer = m.players.get(socket.data.playerId);
    const target = m.players.get(targetId);
    if (!killer || killer.role !== "murderer" || !killer.alive) return;
    if (!target || !target.alive || target.id === killer.id) return;
    if (Date.now() < m.killer.cooldownUntil) return socket.emit("m:error", "Still cooling down.");
    if (!allowedWeapons(m).includes(weaponId)) return socket.emit("m:error", "That weapon isn't available.");

    const own = ownWeapon(m);
    target.alive = false;
    m.killer.weaponUses[weaponId] = (m.killer.weaponUses[weaponId] || 0) + 1;
    if (weaponId !== own) m.killer.framesUsed += 1;
    m.killer.kills += 1;
    m.killer.cooldownUntil = Date.now() + m.config.cooldownSec * 1000;

    const framed = VILLAGERS.find((v) => v.weaponId === weaponId);
    m.feed.push({
      victimName: target.name,
      victimCharacterId: target.characterId,
      weaponId,
      weaponName: framed?.weapon ?? weaponId,
      framedCharacterId: framed?.id ?? null,
      framedJob: framed?.job ?? null,
    });

    announce(code, { type: "killed", victim: target.name, weapon: framed?.weapon ?? weaponId, job: framed?.job });
    if (m.killer.kills >= m.config.killsToWin) {
      m.winner = "murderer";
      m.phase = "ended";
      if (m.vote?.timer) clearTimeout(m.vote.timer);
      m.vote = null;
    }
    sendYou(m, target);
    sendYou(m, killer);
    broadcast(code);
    if (m.phase === "ended") announce(code, { type: "end", winner: m.winner });
  });

  // --- Trials: nominate a suspect, everyone alive votes ---------------------------------------
  const resolveVote = (code) => {
    const m = rooms.get(code)?.murder;
    if (!m || !m.vote) return;
    const v = m.vote;
    if (v.timer) clearTimeout(v.timer);
    const eligible = [...m.players.values()].filter((p) => p.alive).length;
    const yes = [...v.votes.values()].filter(Boolean).length;
    const suspect = m.players.get(v.suspectId);
    m.vote = null;

    if (suspect && yes > eligible / 2) {
      if (suspect.role === "murderer") {
        m.winner = "village";
        m.phase = "ended";
        announce(code, { type: "caught", suspect: suspect.name });
        broadcast(code);
        announce(code, { type: "end", winner: m.winner });
        return;
      }
      suspect.cleared = true;
      if (m.killer) m.killer.cooldownUntil = 0; // wrong verdict → murderer gets a free window
      const killer = [...m.players.values()].find((p) => p.role === "murderer");
      if (killer) sendYou(m, killer);
      announce(code, { type: "wrong", suspect: suspect.name });
    } else {
      announce(code, { type: "acquitted", suspect: suspect?.name ?? "?" });
    }
    broadcast(code);
  };

  socket.on("m:nominate", ({ suspectId }) => {
    const code = roomOf();
    const m = game();
    if (!m || m.phase !== "playing" || m.vote) return;
    const by = m.players.get(socket.data.playerId);
    const suspect = m.players.get(suspectId);
    if (!by || !by.alive) return;
    if (!suspect || !suspect.alive || suspect.cleared || suspect.id === by.id) return;
    if (m.trialsLeft <= 0) return socket.emit("m:error", "No trials left.");

    m.trialsLeft -= 1; // a trial is spent the moment an accusation goes to vote
    m.vote = {
      suspectId,
      by: by.id,
      votes: new Map(),
      endsAt: Date.now() + m.config.voteSec * 1000,
      timer: setTimeout(() => resolveVote(code), m.config.voteSec * 1000),
    };
    announce(code, { type: "vote", suspect: suspect.name, by: by.name });
    broadcast(code);
  });

  socket.on("m:vote", ({ yes }) => {
    const code = roomOf();
    const m = game();
    if (!m || !m.vote) return;
    const p = m.players.get(socket.data.playerId);
    if (!p || !p.alive || m.vote.votes.has(p.id)) return;
    m.vote.votes.set(p.id, !!yes);
    const eligible = [...m.players.values()].filter((x) => x.alive).length;
    broadcast(code);
    if (m.vote.votes.size >= eligible) resolveVote(code);
  });

  socket.on("m:reset", ({ full } = {}) => {
    const code = roomOf();
    const r = rooms.get(code);
    if (!r?.murder) return;
    const prev = r.murder;
    if (prev.vote?.timer) clearTimeout(prev.vote.timer);
    if (full) prev.players.clear();
    for (const p of prev.players.values()) {
      p.role = null;
      p.alive = true;
      p.cleared = false;
      if (full) p.characterId = null;
    }
    r.murder = freshGame(prev);
    sendAllYou(r.murder);
    broadcast(code);
  });

  socket.on("disconnect", () => {
    const m = game();
    if (!m || !socket.data.playerId) return;
    const p = m.players.get(socket.data.playerId);
    if (p) p.socketId = null; // keep them in the game; reconnect restores their role
    if (roomOf() && rooms.get(roomOf())) broadcast(roomOf());
  });
}
