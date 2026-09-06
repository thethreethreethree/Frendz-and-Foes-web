// "Cover Ops" — our Codenames. AUTHORITATIVE on the server: the 25-word board is public, but the
// secret colour KEY is sent only to the two spymasters (over their private cn:you channel), never
// in the broadcast cn:state. A 5x5 grid of words is split red / blue / neutral / one assassin; each
// team's spymaster gives a one-word clue + a number, their operatives tap words to contact agents.
// First team to reveal all its agents wins; touching the assassin loses instantly.
//
// Per-room state lives at rooms.get(code).codenames.

import { randomBytes } from "node:crypto";
import { CODEWORDS } from "./codewords.js";

const BOARD_SIZE = 25;

function ensure(rooms, code) {
  let r = rooms.get(code);
  if (!r) {
    r = { snapshot: null, peers: new Map() };
    rooms.set(code, r);
  }
  if (!r.codenames) {
    r.codenames = {
      phase: "lobby", // lobby | playing | ended
      players: new Map(), // id -> { id, name, socketId, team, role, rejoinToken }
      board: [], // [{ word, color: 'red'|'blue'|'neutral'|'assassin', revealed }]
      turn: null, // 'red' | 'blue'
      startingTeam: null,
      clue: null, // { word, count, remaining, team }
      winner: null, // 'red' | 'blue'
      log: [], // short strings for the display feed
    };
  }
  return r.codenames;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const other = (t) => (t === "red" ? "blue" : "red");
const remainingOf = (m, color) => m.board.filter((c) => c.color === color && !c.revealed).length;
const spymasterOf = (m, team) => [...m.players.values()].find((p) => p.team === team && p.role === "spymaster") || null;
const teamCount = (m, team, role) => [...m.players.values()].filter((p) => p.team === team && (!role || p.role === role)).length;

function buildBoard() {
  const words = shuffle(CODEWORDS).slice(0, BOARD_SIZE);
  const startingTeam = Math.random() < 0.5 ? "red" : "blue";
  const colors = [
    ...Array(startingTeam === "red" ? 9 : 8).fill("red"),
    ...Array(startingTeam === "blue" ? 9 : 8).fill("blue"),
    ...Array(7).fill("neutral"),
    "assassin",
  ];
  const shuffledColors = shuffle(colors);
  const board = words.map((word, i) => ({ word, color: shuffledColors[i], revealed: false }));
  return { board, startingTeam };
}

function publicState(m) {
  const reveal = m.phase === "ended";
  return {
    phase: m.phase,
    turn: m.turn,
    startingTeam: m.startingTeam,
    winner: m.winner,
    clue: m.clue ? { word: m.clue.word, count: m.clue.count, remaining: m.clue.remaining, team: m.clue.team } : null,
    board: m.board.map((c, i) => ({
      i,
      word: c.word,
      revealed: c.revealed,
      // Colour is public only for revealed cards (and everything once the game ends). The full key
      // for unrevealed cards is SECRET — delivered to spymasters via cn:you, never here.
      color: c.revealed || reveal ? c.color : null,
    })),
    counts: { red: remainingOf(m, "red"), blue: remainingOf(m, "blue") },
    players: [...m.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      team: p.team,
      role: p.role,
      connected: !!p.socketId,
    })),
    log: m.log.slice(-6),
  };
}

export function codenamesPublicState(rooms, code) {
  const m = rooms.get(code)?.codenames;
  return m ? publicState(m) : null;
}

export function registerCodenamesHandlers(io, socket, rooms, roomKey = (r) => String(r).toUpperCase(), now = () => Date.now()) {
  void now;
  const broadcast = (code) => io.to(code).emit("cn:state", publicState(rooms.get(code).codenames));
  const err = (msg) => socket.emit("cn:error", msg);

  // Private per-player view. The colour key rides ONLY here, and only to spymasters.
  const sendYou = (m, p) => {
    if (!p.socketId) return;
    const base = { id: p.id, name: p.name, avatar: p.avatar, team: p.team, role: p.role, rejoinToken: p.rejoinToken };
    if (p.role === "spymaster" && m.board.length) {
      io.to(p.socketId).emit("cn:you", { ...base, key: m.board.map((c) => c.color) });
    } else {
      io.to(p.socketId).emit("cn:you", base);
    }
  };
  const sendYouAll = (m) => { for (const p of m.players.values()) sendYou(m, p); };

  // Display / host watch the room without being players.
  socket.on("cn:sync", ({ room }) => {
    if (!room) return;
    const code = roomKey(room);
    socket.join(code);
    socket.data.cnCode = code;
    const m = ensure(rooms, code);
    socket.emit("cn:state", publicState(m));
  });

  socket.on("cn:join", ({ room, name, avatar, playerId, rejoinToken }) => {
    if (!room || !name) return;
    const code = roomKey(room);
    socket.join(code);
    socket.data.cnCode = code;
    const m = ensure(rooms, code);
    let p = playerId && m.players.get(playerId);
    if (p) {
      // Reclaiming a player must be proven with the token issued over cn:you — ids are public in
      // cn:state, so a bare id must never be enough to adopt another player (and steal a spymaster's key).
      if (!p.rejoinToken || rejoinToken !== p.rejoinToken) return err("Could not restore that player.");
      p.socketId = socket.id;
      p.name = name;
      if (avatar) p.avatar = avatar;
    } else {
      const id = "c" + Math.random().toString(36).slice(2, 8);
      p = { id, name, avatar, socketId: socket.id, team: null, role: "operative", rejoinToken: randomBytes(24).toString("hex") };
      m.players.set(id, p);
    }
    socket.data.cnPlayerId = p.id;
    sendYou(m, p);
    broadcast(code);
  });

  socket.on("cn:setTeam", ({ team, role }) => {
    const code = socket.data.cnCode;
    const m = code && rooms.get(code)?.codenames;
    if (!m || m.phase !== "lobby") return;
    const p = m.players.get(socket.data.cnPlayerId);
    if (!p) return;
    if (team !== "red" && team !== "blue") return err("Pick a team.");
    if (role !== "spymaster" && role !== "operative") return err("Pick a role.");
    if (role === "spymaster") {
      const existing = spymasterOf(m, team);
      if (existing && existing.id !== p.id) return err(`${team === "red" ? "Red" : "Blue"} already has a spymaster.`);
    }
    p.team = team;
    p.role = role;
    sendYou(m, p);
    broadcast(code);
  });

  const hostCode = () => socket.data.cnCode || socket.data.code;
  const isHost = () => socket.data.role === "host";

  socket.on("cn:start", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.codenames;
    if (!m || m.phase === "playing") return;
    // Need a spymaster and at least one operative on each team.
    for (const team of ["red", "blue"]) {
      if (!spymasterOf(m, team)) return err(`${team === "red" ? "Red" : "Blue"} needs a spymaster.`);
      if (teamCount(m, team, "operative") < 1) return err(`${team === "red" ? "Red" : "Blue"} needs an operative.`);
    }
    const { board, startingTeam } = buildBoard();
    m.board = board;
    m.startingTeam = startingTeam;
    m.turn = startingTeam;
    m.clue = null;
    m.winner = null;
    m.phase = "playing";
    m.log = [`${startingTeam === "red" ? "Red" : "Blue"} goes first.`];
    sendYouAll(m);
    broadcast(code);
  });

  socket.on("cn:clue", ({ word, count }) => {
    const code = socket.data.cnCode;
    const m = code && rooms.get(code)?.codenames;
    if (!m || m.phase !== "playing" || m.clue) return;
    const p = m.players.get(socket.data.cnPlayerId);
    if (!p || p.role !== "spymaster" || p.team !== m.turn) return err("Only the active spymaster can give a clue.");
    const w = String(word || "").trim().slice(0, 24);
    const n = Math.max(1, Math.min(9, count | 0));
    if (!w) return err("Enter a one-word clue.");
    // number + 1 extra guess is the standard Codenames allowance
    m.clue = { word: w, count: n, remaining: n + 1, team: m.turn };
    m.log.push(`${m.turn === "red" ? "Red" : "Blue"} spymaster: "${w}" ${n}`);
    broadcast(code);
  });

  function endTurn(m) {
    m.clue = null;
    m.turn = other(m.turn);
  }

  socket.on("cn:guess", ({ index }) => {
    const code = socket.data.cnCode;
    const m = code && rooms.get(code)?.codenames;
    if (!m || m.phase !== "playing" || !m.clue) return;
    const p = m.players.get(socket.data.cnPlayerId);
    if (!p || p.role !== "operative" || p.team !== m.turn) return err("Only the active team's operatives can guess.");
    const card = m.board[index | 0];
    if (!card || card.revealed) return;
    card.revealed = true;
    const guesser = m.turn;

    if (card.color === "assassin") {
      m.winner = other(guesser);
      m.phase = "ended";
      m.log.push(`${guesser === "red" ? "Red" : "Blue"} hit the assassin!`);
      sendYouAll(m);
      return broadcast(code);
    }

    if (card.color === guesser) {
      m.log.push(`${card.word} — a ${guesser} agent ✓`);
      if (remainingOf(m, guesser) === 0) {
        m.winner = guesser;
        m.phase = "ended";
        sendYouAll(m);
        return broadcast(code);
      }
      m.clue.remaining -= 1;
      if (m.clue.remaining <= 0) { m.log.push(`${guesser === "red" ? "Red" : "Blue"} is out of guesses.`); endTurn(m); }
    } else if (card.color === "neutral") {
      m.log.push(`${card.word} — a bystander. Turn over.`);
      endTurn(m);
    } else {
      // the other team's agent — helps them, ends the turn
      m.log.push(`${card.word} — an enemy agent! Turn over.`);
      if (remainingOf(m, other(guesser)) === 0) {
        m.winner = other(guesser);
        m.phase = "ended";
        sendYouAll(m);
        return broadcast(code);
      }
      endTurn(m);
    }
    broadcast(code);
  });

  socket.on("cn:endTurn", () => {
    const code = socket.data.cnCode;
    const m = code && rooms.get(code)?.codenames;
    if (!m || m.phase !== "playing" || !m.clue) return;
    const p = m.players.get(socket.data.cnPlayerId);
    if (!p || p.team !== m.turn) return;
    m.log.push(`${m.turn === "red" ? "Red" : "Blue"} ends the turn.`);
    endTurn(m);
    broadcast(code);
  });

  socket.on("cn:reset", ({ full } = {}) => {
    const code = hostCode();
    const m = code && rooms.get(code)?.codenames;
    if (!m) return;
    m.phase = "lobby";
    m.board = [];
    m.turn = null;
    m.startingTeam = null;
    m.clue = null;
    m.winner = null;
    m.log = [];
    if (full) for (const p of m.players.values()) { p.team = null; p.role = "operative"; }
    sendYouAll(m);
    broadcast(code);
  });
}
