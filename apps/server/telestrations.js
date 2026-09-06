// "Sketch Relay" — our take on Telestrations: the drawing telephone game. Everyone gets a secret
// word and draws it; books pass around; the next player guesses the drawing (in words); the next
// draws that guess; and so on until each book has gone around. Then the whole chain is revealed for
// laughs. Cooperative / for fun — no scoring.
//
// AUTHORITATIVE on the server. Each turn a player sees ONLY the immediately previous entry of the
// book in front of them (delivered privately via te:you); the full chains stay hidden until reveal.

import { randomBytes } from "node:crypto";
import { CODEWORDS } from "./codewords.js";

const MAX_TURNS = 12; // cap chain length so big groups don't play forever

function ensure(rooms, code) {
  let r = rooms.get(code);
  if (!r) { r = { snapshot: null, peers: new Map() }; rooms.set(code, r); }
  if (!r.telestrations) {
    r.telestrations = {
      phase: "lobby", // lobby | playing | reveal | ended
      players: new Map(), // id -> { id, name, socketId, rejoinToken }
      order: [], // seating order (player ids), fixed at start
      books: [], // [{ ownerId, ownerName, seed, entries: [{type:'draw'|'text', by, byName, value}] }]
      turn: 0,
      totalTurns: 0,
      submitted: new Set(),
      revealBook: 0,
      revealStep: 0, // number of entries revealed for the current book (seed always shown)
    };
  }
  return r.telestrations;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const heldBookIndex = (m, playerId) => {
  const pIdx = m.order.indexOf(playerId);
  if (pIdx < 0) return -1;
  const N = m.order.length;
  return (pIdx - m.turn + N) % N; // book i is held by player (i + turn) % N
};
const turnType = (turn) => (turn % 2 === 0 ? "draw" : "text");

function publicState(m) {
  const base = { phase: m.phase, turn: m.turn, totalTurns: m.totalTurns };
  if (m.phase === "playing") {
    return {
      ...base,
      players: [...m.players.values()].map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, connected: !!p.socketId, submitted: m.submitted.has(p.id) })),
    };
  }
  if (m.phase === "reveal" || m.phase === "ended") {
    const book = m.books[m.revealBook];
    return {
      ...base,
      players: [...m.players.values()].map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, connected: !!p.socketId })),
      totalBooks: m.books.length,
      reveal: book
        ? {
            bookIndex: m.revealBook,
            ownerName: book.ownerName,
            seed: book.seed,
            shown: book.entries.slice(0, m.revealStep).map((e) => ({ type: e.type, byName: e.byName, value: e.value })),
            complete: m.revealStep >= book.entries.length,
          }
        : null,
    };
  }
  return { ...base, players: [...m.players.values()].map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, connected: !!p.socketId })) };
}

export function telestrationsPublicState(rooms, code) {
  const m = rooms.get(code)?.telestrations;
  return m ? publicState(m) : null;
}

export function registerTelestrationsHandlers(io, socket, rooms, roomKey = (r) => String(r).toUpperCase()) {
  const broadcast = (code) => io.to(code).emit("te:state", publicState(rooms.get(code).telestrations));
  const err = (msg) => socket.emit("te:error", msg);

  // Private per-player prompt for the CURRENT turn: what to draw, or which drawing to guess.
  const sendYou = (m, p) => {
    if (!p.socketId) return;
    if (m.phase !== "playing") { io.to(p.socketId).emit("te:you", { id: p.id, name: p.name, avatar: p.avatar, rejoinToken: p.rejoinToken, phase: m.phase }); return; }
    const b = heldBookIndex(m, p.id);
    const book = m.books[b];
    const type = turnType(m.turn);
    const submitted = m.submitted.has(p.id);
    let prompt = null; // for text turns: the drawing to guess; for draw turns: the word/phrase to draw
    if (m.turn === 0) prompt = { word: book.seed };
    else if (type === "draw") prompt = { word: book.entries[m.turn - 1]?.value ?? "(?)" };
    else prompt = { drawing: book.entries[m.turn - 1]?.value ?? [] };
    io.to(p.socketId).emit("te:you", { id: p.id, name: p.name, avatar: p.avatar, rejoinToken: p.rejoinToken, phase: m.phase, turn: m.turn, type, prompt, submitted });
  };
  const sendYouAll = (m) => { for (const p of m.players.values()) sendYou(m, p); };
  const push = (code) => { const m = rooms.get(code).telestrations; broadcast(code); sendYouAll(m); };

  socket.on("te:sync", ({ room }) => {
    if (!room) return;
    const code = roomKey(room);
    socket.join(code);
    socket.data.teCode = code;
    socket.emit("te:state", publicState(ensure(rooms, code)));
  });

  socket.on("te:join", ({ room, name, avatar, playerId, rejoinToken }) => {
    if (!room || !name) return;
    const code = roomKey(room);
    socket.join(code);
    socket.data.teCode = code;
    const m = ensure(rooms, code);
    let p = playerId && m.players.get(playerId);
    if (p) {
      if (!p.rejoinToken || rejoinToken !== p.rejoinToken) return err("Could not restore that player.");
      p.socketId = socket.id;
      p.name = name;
      if (avatar) p.avatar = avatar;
    } else {
      if (m.phase !== "lobby") return err("Game already started.");
      const id = "t" + Math.random().toString(36).slice(2, 8);
      p = { id, name, avatar, socketId: socket.id, rejoinToken: randomBytes(24).toString("hex") };
      m.players.set(id, p);
    }
    socket.data.tePlayerId = p.id;
    sendYou(m, p);
    broadcast(code);
  });

  const hostCode = () => socket.data.teCode || socket.data.code;
  const isHost = () => socket.data.role === "host";

  socket.on("te:start", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.telestrations;
    if (!m || m.phase !== "lobby") return;
    if (m.players.size < 3) return err("Need at least 3 players.");
    m.order = shuffle([...m.players.keys()]);
    const seeds = shuffle(CODEWORDS);
    m.books = m.order.map((ownerId, i) => ({
      ownerId,
      ownerName: m.players.get(ownerId)?.name || "?",
      seed: seeds[i % seeds.length],
      entries: [],
    }));
    m.turn = 0;
    m.totalTurns = Math.min(m.order.length, MAX_TURNS);
    m.submitted = new Set();
    m.phase = "playing";
    push(code);
  });

  function advanceIfDone(m, code) {
    const active = [...m.players.values()].filter((p) => p.socketId);
    if (active.length === 0 || !active.every((p) => m.submitted.has(p.id))) return;
    m.turn += 1;
    m.submitted = new Set();
    if (m.turn >= m.totalTurns) { m.phase = "reveal"; m.revealBook = 0; m.revealStep = 0; }
    push(code);
  }

  socket.on("te:submit", ({ strokes, text }) => {
    const code = socket.data.teCode;
    const m = code && rooms.get(code)?.telestrations;
    if (!m || m.phase !== "playing") return;
    const p = m.players.get(socket.data.tePlayerId);
    if (!p || m.submitted.has(p.id)) return;
    const b = heldBookIndex(m, p.id);
    const book = m.books[b];
    if (!book) return;
    const type = turnType(m.turn);
    if (type === "draw") {
      if (!Array.isArray(strokes)) return err("Draw something first.");
      book.entries[m.turn] = { type: "draw", by: p.id, byName: p.name, value: strokes };
    } else {
      const t = String(text || "").trim().slice(0, 40);
      if (!t) return err("Type your guess.");
      book.entries[m.turn] = { type: "text", by: p.id, byName: p.name, value: t };
    }
    m.submitted.add(p.id);
    broadcast(code);
    advanceIfDone(m, code);
  });

  // Host can force past a stuck turn (fills blanks for anyone who hasn't submitted).
  socket.on("te:force", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.telestrations;
    if (!m || m.phase !== "playing" || !isHost()) return;
    const type = turnType(m.turn);
    for (const p of m.players.values()) {
      if (m.submitted.has(p.id)) continue;
      const book = m.books[heldBookIndex(m, p.id)];
      if (book) book.entries[m.turn] = type === "draw" ? { type: "draw", by: p.id, byName: p.name, value: [] } : { type: "text", by: p.id, byName: p.name, value: "(skipped)" };
      m.submitted.add(p.id);
    }
    m.turn += 1;
    m.submitted = new Set();
    if (m.turn >= m.totalTurns) { m.phase = "reveal"; m.revealBook = 0; m.revealStep = 0; }
    push(code);
  });

  socket.on("te:revealNext", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.telestrations;
    if (!m || m.phase !== "reveal" || !isHost()) return;
    const book = m.books[m.revealBook];
    if (m.revealStep < book.entries.length) m.revealStep += 1;
    else { m.revealBook += 1; m.revealStep = 0; if (m.revealBook >= m.books.length) m.phase = "ended"; }
    broadcast(code);
  });

  socket.on("te:reset", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.telestrations;
    if (!m) return;
    m.phase = "lobby";
    m.books = [];
    m.turn = 0;
    m.totalTurns = 0;
    m.submitted = new Set();
    m.revealBook = 0;
    m.revealStep = 0;
    push(code);
  });
}
