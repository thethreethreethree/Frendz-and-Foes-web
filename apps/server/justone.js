// "Solo Clue" — our take on Just One. Co-operative: each round one player is the guesser; everyone
// else secretly writes ONE word to help. Identical clues cancel out before the guesser sees them —
// so the obvious hint is often wiped, and the team must think sideways. One shared score over a deck
// of rounds.
//
// AUTHORITATIVE on the server. The secret each round is the WORD, and it must reach everyone EXCEPT
// the guesser: it's sent over the private jo:word channel to non-guesser players + the display/host,
// and withheld from the guesser (and from the broadcast jo:state) until the round is scored.

import { randomBytes } from "node:crypto";
import { CODEWORDS } from "./codewords.js";

const TOTAL_ROUNDS = 13;

function ensure(rooms, code) {
  let r = rooms.get(code);
  if (!r) { r = { snapshot: null, peers: new Map() }; rooms.set(code, r); }
  if (!r.justone) {
    r.justone = {
      phase: "lobby", // lobby | writing | reveal | roundover | ended
      players: new Map(), // id -> { id, name, socketId, rejoinToken }
      order: [], // guessing rotation (player ids), fixed at start
      guesserIdx: 0,
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      deck: [],
      deckPos: 0,
      word: null,
      clues: new Map(), // playerId -> word (this round, secret until reveal)
      survivors: [], // [{ by, word }] after cancellation
      cancelled: [], // [{ word }]
      lastGot: null,
      score: 0,
    };
  }
  return r.justone;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const guesserId = (m) => m.order[m.guesserIdx] ?? null;
const nonGuessers = (m) => [...m.players.values()].filter((p) => p.id !== guesserId(m));
const norm = (w) => String(w || "").trim().toLowerCase();

function publicState(m) {
  const showClues = m.phase === "reveal" || m.phase === "roundover";
  const reveal = m.phase === "roundover" || m.phase === "ended";
  return {
    phase: m.phase,
    round: m.round,
    totalRounds: m.totalRounds,
    score: m.score,
    guesserId: guesserId(m),
    players: [...m.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      connected: !!p.socketId,
      submitted: m.clues.has(p.id), // during writing, show WHO has written (not the words)
    })),
    survivors: showClues ? m.survivors : [],
    cancelled: showClues ? m.cancelled : [],
    lastGot: m.phase === "roundover" ? m.lastGot : null,
    word: reveal ? m.word : null, // the word only becomes public once the round is scored
  };
}

export function justonePublicState(rooms, code) {
  const m = rooms.get(code)?.justone;
  return m ? publicState(m) : null;
}

export function registerJustOneHandlers(io, socket, rooms, roomKey = (r) => String(r).toUpperCase()) {
  const broadcast = (code) => io.to(code).emit("jo:state", publicState(rooms.get(code).justone));
  const err = (msg) => socket.emit("jo:error", msg);

  // Push the secret word to everyone who may see it (non-guesser players + display/host), and null
  // to the guesser, so the guesser's device never receives it. Called on every state change.
  const pushWord = (m, code) => {
    const active = m.phase === "writing" || m.phase === "reveal";
    const gid = guesserId(m);
    for (const p of m.players.values()) {
      if (p.socketId) io.to(p.socketId).emit("jo:word", active && p.id !== gid ? m.word : null);
    }
    const room = rooms.get(code);
    if (room?.peers) for (const sid of room.peers.keys()) io.to(sid).emit("jo:word", active ? m.word : null);
  };
  const push = (code) => { const m = rooms.get(code).justone; broadcast(code); pushWord(m, code); };

  socket.on("jo:sync", ({ room }) => {
    if (!room) return;
    const code = roomKey(room);
    socket.join(code);
    socket.data.joCode = code;
    const m = ensure(rooms, code);
    socket.emit("jo:state", publicState(m));
    pushWord(m, code);
  });

  socket.on("jo:join", ({ room, name, avatar, playerId, rejoinToken }) => {
    if (!room || !name) return;
    const code = roomKey(room);
    socket.join(code);
    socket.data.joCode = code;
    const m = ensure(rooms, code);
    let p = playerId && m.players.get(playerId);
    if (p) {
      if (!p.rejoinToken || rejoinToken !== p.rejoinToken) return err("Could not restore that player.");
      p.socketId = socket.id;
      p.name = name;
      if (avatar) p.avatar = avatar;
    } else {
      const id = "j" + Math.random().toString(36).slice(2, 8);
      p = { id, name, avatar, socketId: socket.id, rejoinToken: randomBytes(24).toString("hex") };
      m.players.set(id, p);
    }
    socket.data.joPlayerId = p.id;
    socket.emit("jo:you", { id: p.id, name: p.name, avatar: p.avatar, rejoinToken: p.rejoinToken });
    push(code);
  });

  const hostCode = () => socket.data.joCode || socket.data.code;
  const isHost = () => socket.data.role === "host";

  function dealWord(m) {
    if (m.deckPos >= m.deck.length) { m.deck = shuffle(m.deck); m.deckPos = 0; }
    m.word = m.deck[m.deckPos++];
    m.clues = new Map();
    m.survivors = [];
    m.cancelled = [];
    m.lastGot = null;
  }

  socket.on("jo:start", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.justone;
    if (!m || m.phase === "writing" || m.phase === "reveal") return;
    if (m.players.size < 3) return err("Need at least 3 players (a guesser + two clue-givers).");
    m.order = shuffle([...m.players.keys()]);
    m.guesserIdx = 0;
    m.round = 1;
    m.score = 0;
    m.deck = shuffle(CODEWORDS);
    m.deckPos = 0;
    m.phase = "writing";
    dealWord(m);
    push(code);
  });

  socket.on("jo:clue", ({ word }) => {
    const code = socket.data.joCode;
    const m = code && rooms.get(code)?.justone;
    if (!m || m.phase !== "writing") return;
    const p = m.players.get(socket.data.joPlayerId);
    if (!p) return;
    if (p.id === guesserId(m)) return err("You're the guesser this round — no clue from you.");
    const w = String(word || "").trim().slice(0, 24);
    if (!w || /\s/.test(w)) return err("One word only.");
    m.clues.set(p.id, w);
    // Auto-advance to reveal once every connected clue-giver has written one.
    const writers = nonGuessers(m).filter((x) => x.socketId);
    if (writers.length > 0 && writers.every((x) => m.clues.has(x.id))) doReveal(m);
    push(code);
  });

  function doReveal(m) {
    const counts = {};
    for (const w of m.clues.values()) counts[norm(w)] = (counts[norm(w)] || 0) + 1;
    m.survivors = [];
    m.cancelled = [];
    for (const [pid, w] of m.clues) {
      if (counts[norm(w)] >= 2) m.cancelled.push({ word: w });
      else m.survivors.push({ by: m.players.get(pid)?.name || "?", word: w });
    }
    m.phase = "reveal";
  }

  // Host may force the reveal before everyone has written (e.g. someone's away).
  socket.on("jo:reveal", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.justone;
    if (!m || m.phase !== "writing" || !isHost()) return;
    doReveal(m);
    push(code);
  });

  // The guesser (or host) judges whether the spoken guess was right.
  socket.on("jo:judge", ({ got }) => {
    const code = socket.data.joCode || (isHost() && hostCode());
    const m = code && rooms.get(code)?.justone;
    if (!m || m.phase !== "reveal") return;
    const isGuesser = socket.data.joPlayerId && socket.data.joPlayerId === guesserId(m);
    if (!isGuesser && !isHost()) return err("Only the guesser can judge.");
    m.lastGot = !!got;
    if (got) m.score += 1;
    m.phase = "roundover";
    push(code);
  });

  socket.on("jo:next", () => {
    const code = socket.data.joCode || (isHost() && hostCode());
    const m = code && rooms.get(code)?.justone;
    if (!m || m.phase !== "roundover") return;
    const isGuesser = socket.data.joPlayerId && socket.data.joPlayerId === guesserId(m);
    if (!isGuesser && !isHost()) return;
    if (m.round >= m.totalRounds) { m.phase = "ended"; m.word = m.word; return push(code); }
    m.round += 1;
    m.guesserIdx = (m.guesserIdx + 1) % m.order.length;
    m.phase = "writing";
    dealWord(m);
    push(code);
  });

  socket.on("jo:reset", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.justone;
    if (!m) return;
    m.phase = "lobby";
    m.round = 0;
    m.score = 0;
    m.word = null;
    m.clues = new Map();
    m.survivors = [];
    m.cancelled = [];
    m.lastGot = null;
    push(code);
  });
}
