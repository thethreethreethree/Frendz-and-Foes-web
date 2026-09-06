// "Ballpark" — our take on Wits & Wagers. Each round a numeric-answer question: everyone secretly
// guesses a number, the guesses are laid out low→high, then everyone bets on the guess they think is
// closest WITHOUT going over (classic Wits & Wagers). You don't need to know the answer — you can
// bet on someone else's guess. Owning the winning guess scores; betting on it scores.
//
// AUTHORITATIVE on the server: the question is public, but the answer stays hidden until the reveal,
// and individual guesses/bets are withheld until they're shown in aggregate. All questions original.

import { randomBytes } from "node:crypto";

const TOTAL_ROUNDS = 7;

// Original estimation questions with a single numeric answer.
export const BALLPARK_QUESTIONS = [
  { q: "How many bones are in the adult human body?", a: 206 },
  { q: "How many keys are on a standard piano?", a: 88 },
  { q: "How many squares are on a chessboard?", a: 64 },
  { q: "How many continents are there?", a: 7 },
  { q: "In what year did the first person walk on the Moon?", a: 1969 },
  { q: "How many minutes are in a full day?", a: 1440 },
  { q: "How many teeth does an adult human have (with wisdom teeth)?", a: 32 },
  { q: "How many sides does a stop sign have?", a: 8 },
  { q: "How tall is Mount Everest, in metres?", a: 8849 },
  { q: "How many players are on the field for ONE soccer team?", a: 11 },
  { q: "What is the boiling point of water, in Celsius?", a: 100 },
  { q: "How many holes are on a standard golf course?", a: 18 },
  { q: "How many letters are in the English alphabet?", a: 26 },
  { q: "How many dominoes are in a standard set?", a: 28 },
  { q: "How many hearts are in a standard deck of cards?", a: 13 },
  { q: "How many degrees are in a right angle?", a: 90 },
  { q: "How many wonders were there in the ancient world?", a: 7 },
  { q: "How many strings does a standard guitar have?", a: 6 },
  { q: "How many zeros are in one million?", a: 6 },
  { q: "How many planets are in our solar system?", a: 8 },
  { q: "What is the freezing point of water, in Fahrenheit?", a: 32 },
  { q: "How many players from one basketball team are on court?", a: 5 },
  { q: "How many days are in February during a leap year?", a: 29 },
  { q: "How many legs does a spider have?", a: 8 },
];

function ensure(rooms, code) {
  let r = rooms.get(code);
  if (!r) { r = { snapshot: null, peers: new Map() }; rooms.set(code, r); }
  if (!r.ballpark) {
    r.ballpark = {
      phase: "lobby", // lobby | guessing | betting | reveal | ended
      players: new Map(), // id -> { id, name, socketId, rejoinToken, score }
      deck: [],
      deckPos: 0,
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      question: null,
      answer: null,
      guesses: new Map(), // playerId -> number
      bets: new Map(), // playerId -> guess value
      sorted: [], // [{ value, by: [names] }]
      winningValue: null,
    };
  }
  return r.ballpark;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const connectedPlayers = (m) => [...m.players.values()].filter((p) => p.socketId);
const bettorsFor = (m, value) => [...m.bets.entries()].filter(([, v]) => v === value).map(([pid]) => m.players.get(pid)?.name || "?");

function buildSorted(m) {
  const byValue = new Map();
  for (const [pid, v] of m.guesses) {
    if (!byValue.has(v)) byValue.set(v, []);
    byValue.get(v).push(m.players.get(pid)?.name || "?");
  }
  m.sorted = [...byValue.entries()].map(([value, by]) => ({ value, by })).sort((a, b) => a.value - b.value);
}

function publicState(m) {
  const showGuesses = m.phase === "betting" || m.phase === "reveal";
  const reveal = m.phase === "reveal" || m.phase === "ended";
  return {
    phase: m.phase,
    round: m.round,
    totalRounds: m.totalRounds,
    question: m.phase === "lobby" ? null : m.question,
    answer: reveal ? m.answer : null,
    winningValue: reveal ? m.winningValue : null,
    players: [...m.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      connected: !!p.socketId,
      score: p.score,
      guessed: m.guesses.has(p.id),
      bet: m.bets.has(p.id),
    })),
    guesses: showGuesses
      ? m.sorted.map((g) => ({ value: g.value, by: g.by, bettors: reveal ? bettorsFor(m, g.value) : [] }))
      : [],
  };
}

export function ballparkPublicState(rooms, code) {
  const m = rooms.get(code)?.ballpark;
  return m ? publicState(m) : null;
}

export function registerBallparkHandlers(io, socket, rooms, roomKey = (r) => String(r).toUpperCase()) {
  const broadcast = (code) => io.to(code).emit("bp:state", publicState(rooms.get(code).ballpark));
  const err = (msg) => socket.emit("bp:error", msg);

  socket.on("bp:sync", ({ room }) => {
    if (!room) return;
    const code = roomKey(room);
    socket.join(code);
    socket.data.bpCode = code;
    socket.emit("bp:state", publicState(ensure(rooms, code)));
  });

  socket.on("bp:join", ({ room, name, avatar, playerId, rejoinToken }) => {
    if (!room || !name) return;
    const code = roomKey(room);
    socket.join(code);
    socket.data.bpCode = code;
    const m = ensure(rooms, code);
    let p = playerId && m.players.get(playerId);
    if (p) {
      if (!p.rejoinToken || rejoinToken !== p.rejoinToken) return err("Could not restore that player.");
      p.socketId = socket.id;
      p.name = name;
      if (avatar) p.avatar = avatar;
    } else {
      const id = "w" + Math.random().toString(36).slice(2, 8);
      p = { id, name, avatar, socketId: socket.id, rejoinToken: randomBytes(24).toString("hex"), score: 0 };
      m.players.set(id, p);
    }
    socket.data.bpPlayerId = p.id;
    socket.emit("bp:you", { id: p.id, name: p.name, avatar: p.avatar, rejoinToken: p.rejoinToken });
    broadcast(code);
  });

  const hostCode = () => socket.data.bpCode || socket.data.code;
  const isHost = () => socket.data.role === "host";

  function dealQuestion(m) {
    if (m.deckPos >= m.deck.length) { m.deck = shuffle(m.deck); m.deckPos = 0; }
    const item = BALLPARK_QUESTIONS[m.deck[m.deckPos++]];
    m.question = item.q;
    m.answer = item.a;
    m.guesses = new Map();
    m.bets = new Map();
    m.sorted = [];
    m.winningValue = null;
  }

  socket.on("bp:start", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.ballpark;
    if (!m || m.phase === "guessing" || m.phase === "betting") return;
    if (m.players.size < 2) return err("Need at least 2 players.");
    m.deck = shuffle(BALLPARK_QUESTIONS.map((_, i) => i));
    m.deckPos = 0;
    m.round = 1;
    for (const p of m.players.values()) p.score = 0;
    m.phase = "guessing";
    dealQuestion(m);
    broadcast(code);
  });

  socket.on("bp:guess", ({ value }) => {
    const code = socket.data.bpCode;
    const m = code && rooms.get(code)?.ballpark;
    if (!m || m.phase !== "guessing") return;
    const p = m.players.get(socket.data.bpPlayerId);
    if (!p) return;
    const n = Number(value);
    if (!Number.isFinite(n)) return err("Enter a number.");
    m.guesses.set(p.id, Math.round(n));
    // Everyone in → open betting.
    const active = connectedPlayers(m);
    if (active.length > 0 && active.every((x) => m.guesses.has(x.id))) { buildSorted(m); m.phase = "betting"; }
    broadcast(code);
  });

  socket.on("bp:bet", ({ value }) => {
    const code = socket.data.bpCode;
    const m = code && rooms.get(code)?.ballpark;
    if (!m || m.phase !== "betting") return;
    const p = m.players.get(socket.data.bpPlayerId);
    if (!p) return;
    const v = Math.round(Number(value));
    if (!m.sorted.some((g) => g.value === v)) return err("Bet on one of the guesses.");
    m.bets.set(p.id, v);
    const active = connectedPlayers(m);
    if (active.length > 0 && active.every((x) => m.bets.has(x.id))) score(m);
    broadcast(code);
  });

  // Host may force past a stuck guessing/betting phase.
  socket.on("bp:advance", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.ballpark;
    if (!m || !isHost()) return;
    if (m.phase === "guessing") { buildSorted(m); m.phase = "betting"; }
    else if (m.phase === "betting") score(m);
    broadcast(code);
  });

  function score(m) {
    const values = m.sorted.map((g) => g.value);
    const notOver = values.filter((v) => v <= m.answer);
    m.winningValue = notOver.length ? Math.max(...notOver) : Math.min(...values);
    for (const p of m.players.values()) {
      if (m.guesses.get(p.id) === m.winningValue) p.score += 3; // owned the best guess
      if (m.bets.get(p.id) === m.winningValue) p.score += 2; // bet on the best guess
    }
    m.phase = "reveal";
  }

  socket.on("bp:next", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.ballpark;
    if (!m || m.phase !== "reveal" || !isHost()) return;
    if (m.round >= m.totalRounds) { m.phase = "ended"; return broadcast(code); }
    m.round += 1;
    m.phase = "guessing";
    dealQuestion(m);
    broadcast(code);
  });

  socket.on("bp:reset", () => {
    const code = hostCode();
    const m = code && rooms.get(code)?.ballpark;
    if (!m) return;
    m.phase = "lobby";
    m.round = 0;
    m.question = null;
    m.answer = null;
    m.guesses = new Map();
    m.bets = new Map();
    m.sorted = [];
    m.winningValue = null;
    broadcast(code);
  });
}
