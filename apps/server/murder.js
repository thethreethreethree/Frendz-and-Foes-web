// Murder (Wink Murder) — an AUTHORITATIVE game on the server (unlike Feud/Bingo, which are
// host-authoritative with a dumb relay). The server assigns secret roles, sends each player ONLY
// their own role, validates kills/accusations (so players can't cheat from the client), and
// detects wins. Players join from their phones (/play) by scanning a QR.
//
// Per-room state lives at rooms.get(code).murder:
//   { phase, config:{murderers,detectives}, players: Map<id,{id,name,socketId,role,alive}>, winner }

function ensureMurder(rooms, code) {
  let r = rooms.get(code);
  if (!r) {
    r = { snapshot: null, peers: new Map() };
    rooms.set(code, r);
  }
  if (!r.murder) {
    r.murder = { phase: "lobby", config: { murderers: 1, detectives: 1 }, players: new Map(), winner: null };
  }
  return r.murder;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Public state — safe for everyone (the display, all players). Roles are hidden until the game
// ends, then revealed.
function publicState(m) {
  const reveal = m.phase === "ended";
  return {
    phase: m.phase,
    config: m.config,
    winner: m.winner,
    players: [...m.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
      connected: !!p.socketId,
      role: reveal ? p.role : undefined,
    })),
  };
}

function countAlive(m) {
  let murderers = 0;
  let others = 0;
  for (const p of m.players.values()) {
    if (!p.alive) continue;
    if (p.role === "murderer") murderers++;
    else others++;
  }
  return { murderers, others };
}

function checkWin(m) {
  if (m.phase !== "playing") return;
  const { murderers, others } = countAlive(m);
  if (murderers === 0) {
    m.winner = "civilians";
    m.phase = "ended";
  } else if (others === 0) {
    m.winner = "murderers";
    m.phase = "ended";
  }
}

export function registerMurderHandlers(io, socket, rooms) {
  const broadcast = (code) => io.to(code).emit("m:state", publicState(rooms.get(code).murder));
  const sendYou = (m, p) => {
    if (p.socketId) io.to(p.socketId).emit("m:you", { id: p.id, role: p.role, alive: p.alive });
  };
  const announce = (code, payload) => io.to(code).emit("m:announce", payload);

  // A player (or the host's player) joins the lobby from their phone.
  socket.on("m:join", ({ room, name, playerId }) => {
    if (!room || !name) return;
    const code = room.toUpperCase();
    socket.join(code);
    socket.data.code = code;
    socket.data.role = "player";
    const m = ensureMurder(rooms, code);

    let p = playerId && m.players.get(playerId);
    if (p) {
      p.socketId = socket.id; // reconnect
      p.name = name;
    } else {
      const id = "p" + Math.random().toString(36).slice(2, 8);
      p = { id, name, socketId: socket.id, role: null, alive: true };
      m.players.set(id, p);
    }
    socket.data.playerId = p.id;
    socket.emit("m:you", { id: p.id, role: p.role, alive: p.alive });
    broadcast(code);
  });

  const hostCode = () => socket.data.code;

  socket.on("m:config", ({ murderers, detectives }) => {
    const m = rooms.get(hostCode())?.murder;
    if (!m || m.phase !== "lobby") return;
    m.config = {
      murderers: Math.max(1, Math.min(4, murderers | 0 || 1)),
      detectives: Math.max(0, Math.min(4, detectives | 0)),
    };
    broadcast(hostCode());
  });

  // Host assigns roles + starts the game.
  socket.on("m:assign", () => {
    const code = hostCode();
    const m = rooms.get(code)?.murder;
    if (!m) return;
    const ids = shuffle([...m.players.keys()]);
    const need = m.config.murderers + m.config.detectives;
    if (ids.length < need + 1) {
      socket.emit("m:error", "Not enough players for that role setup.");
      return;
    }
    let i = 0;
    for (const id of ids) {
      const p = m.players.get(id);
      p.alive = true;
      if (i < m.config.murderers) p.role = "murderer";
      else if (i < m.config.murderers + m.config.detectives) p.role = "detective";
      else p.role = "civilian";
      i++;
    }
    m.phase = "playing";
    m.winner = null;
    for (const p of m.players.values()) sendYou(m, p);
    broadcast(code);
    announce(code, { type: "start" });
  });

  // The murderer secretly eliminates a victim (validated server-side).
  socket.on("m:kill", ({ targetId }) => {
    const code = socket.data.code;
    const m = rooms.get(code)?.murder;
    if (!m || m.phase !== "playing") return;
    const killer = m.players.get(socket.data.playerId);
    const target = m.players.get(targetId);
    if (!killer || killer.role !== "murderer" || !killer.alive) return;
    if (!target || !target.alive || target.role === "murderer") return;
    target.alive = false;
    sendYou(m, target);
    announce(code, { type: "killed", name: target.name });
    checkWin(m);
    broadcast(code);
    if (m.phase === "ended") announce(code, { type: "end", winner: m.winner });
  });

  // The detective accuses a suspect.
  socket.on("m:accuse", ({ suspectId }) => {
    const code = socket.data.code;
    const m = rooms.get(code)?.murder;
    if (!m || m.phase !== "playing") return;
    const det = m.players.get(socket.data.playerId);
    const suspect = m.players.get(suspectId);
    if (!det || det.role !== "detective" || !det.alive) return;
    if (!suspect || !suspect.alive) return;
    if (suspect.role === "murderer") {
      suspect.alive = false;
      sendYou(m, suspect);
      announce(code, { type: "caught", suspect: suspect.name, detective: det.name });
    } else {
      det.alive = false;
      sendYou(m, det);
      announce(code, { type: "wrong", suspect: suspect.name, detective: det.name });
    }
    checkWin(m);
    broadcast(code);
    if (m.phase === "ended") announce(code, { type: "end", winner: m.winner });
  });

  // Host: back to lobby (keep players), or full reset (drop players).
  socket.on("m:reset", ({ full } = {}) => {
    const code = hostCode();
    const m = rooms.get(code)?.murder;
    if (!m) return;
    if (full) m.players.clear();
    m.phase = "lobby";
    m.winner = null;
    for (const p of m.players.values()) {
      p.role = null;
      p.alive = true;
      sendYou(m, p);
    }
    broadcast(code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.code;
    const m = rooms.get(code)?.murder;
    if (!m || !socket.data.playerId) return;
    const p = m.players.get(socket.data.playerId);
    if (p) p.socketId = null; // keep them in the game; allow reconnect by playerId
    broadcast(code);
  });
}
