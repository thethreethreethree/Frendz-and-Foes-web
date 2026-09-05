// State-machine tests for "Sketch Relay" (Telestrations). Verifies the book rotation, per-turn
// private prompts, and that book contents never leak into the broadcast state during play.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerTelestrationsHandlers } from "../apps/server/telestrations.js";

function harness() {
  const rooms = new Map();
  const emitted = [];
  const io = { to: (target) => ({ emit: (ev, payload) => emitted.push({ target, ev, payload }) }) };
  const roomKey = (r) => `T:${String(r).toUpperCase()}`;
  function connect(id, asHost = false) {
    const handlers = {};
    const socket = { id, data: asHost ? { role: "host", code: roomKey("R") } : {}, join() {}, on(ev, fn) { handlers[ev] = fn; }, emit(ev, payload) { emitted.push({ target: id, ev, payload }); } };
    registerTelestrationsHandlers(io, socket, rooms, roomKey);
    return { socket, send: (ev, p) => handlers[ev]?.(p), pid: () => socket.data.tePlayerId };
  }
  const lastState = () => [...emitted].reverse().find((e) => e.ev === "te:state")?.payload;
  const youFor = (sid) => [...emitted].reverse().find((e) => e.ev === "te:you" && e.target === sid)?.payload;
  const errorsAfter = (n) => emitted.slice(n).filter((e) => e.ev === "te:error");
  const gameState = () => rooms.get(roomKey("R")).telestrations;
  return { rooms, connect, emitted, lastState, youFor, errorsAfter, gameState };
}

function game() {
  const h = harness();
  const mk = (id, name) => { const s = h.connect(id); s.send("te:join", { room: "R", name }); return s; };
  const a = mk("a", "A"), b = mk("b", "B"), c = mk("c", "C");
  const host = h.connect("host", true);
  host.send("te:start");
  return { h, players: [a, b, c], host };
}

function submitAll(h, players) {
  for (const p of players) {
    const you = h.youFor(p.socket.id);
    if (you?.submitted) continue;
    if (you?.type === "draw") p.send("te:submit", { strokes: [{ points: [0, 0, 1, 1], color: "#000", width: 4 }] });
    else p.send("te:submit", { text: "guess-" + p.socket.id });
  }
}

test("start needs at least 3 players", () => {
  const h = harness();
  const a = h.connect("a"); a.send("te:join", { room: "R", name: "A" });
  const b = h.connect("b"); b.send("te:join", { room: "R", name: "B" });
  const host = h.connect("host", true);
  const before = h.emitted.length;
  host.send("te:start");
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().phase, "lobby");
});

test("turn 0: everyone draws their own seed word", () => {
  const { h, players } = game();
  assert.equal(h.lastState().phase, "playing");
  assert.equal(h.lastState().turn, 0);
  for (const p of players) {
    const you = h.youFor(p.socket.id);
    assert.equal(you.type, "draw");
    assert.equal(typeof you.prompt.word, "string");
  }
  // seeds are distinct per book
  const seeds = h.gameState().books.map((bk) => bk.seed);
  assert.equal(new Set(seeds).size, seeds.length);
});

test("SECRET SAFETY: book seeds/entries never appear in the broadcast state during play", () => {
  const { h } = game();
  const json = JSON.stringify(h.lastState());
  assert.ok(!json.includes("seed"));
  assert.ok(!json.includes("entries"));
});

test("after everyone draws, the next turn asks each player to GUESS the drawing they received", () => {
  const { h, players } = game();
  submitAll(h, players); // turn 0 draws
  assert.equal(h.lastState().turn, 1);
  for (const p of players) {
    const you = h.youFor(p.socket.id);
    assert.equal(you.type, "text");
    assert.ok(Array.isArray(you.prompt.drawing)); // they see a drawing to guess
  }
});

test("playing through all turns reaches the reveal, which walks book by book", () => {
  const { h, players, host } = game();
  const N = players.length;
  for (let t = 0; t < N; t++) submitAll(h, players);
  assert.equal(h.lastState().phase, "reveal");
  assert.equal(h.lastState().reveal.bookIndex, 0);
  // reveal each entry of book 0, then it should advance to book 1
  for (let i = 0; i < N + 1; i++) host.send("te:revealNext");
  assert.ok(h.lastState().reveal === null || h.lastState().reveal.bookIndex >= 1 || h.lastState().phase === "ended");
});
