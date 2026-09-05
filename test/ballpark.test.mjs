// State-machine tests for "Ballpark" (Wits & Wagers). Drives registerBallparkHandlers with a fake
// io/socket harness. Reads the room's hidden answer directly to make the scoring deterministic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerBallparkHandlers } from "../apps/server/ballpark.js";

function harness() {
  const rooms = new Map();
  const emitted = [];
  const io = { to: (target) => ({ emit: (ev, payload) => emitted.push({ target, ev, payload }) }) };
  const roomKey = (r) => `T:${String(r).toUpperCase()}`;
  function connect(id, asHost = false) {
    const handlers = {};
    const socket = {
      id, data: asHost ? { role: "host", code: roomKey("R") } : {},
      join() {}, on(ev, fn) { handlers[ev] = fn; }, emit(ev, payload) { emitted.push({ target: id, ev, payload }); },
    };
    registerBallparkHandlers(io, socket, rooms, roomKey);
    return { socket, send: (ev, p) => handlers[ev]?.(p), pid: () => socket.data.bpPlayerId };
  }
  const lastState = () => [...emitted].reverse().find((e) => e.ev === "bp:state")?.payload;
  const errorsAfter = (n) => emitted.slice(n).filter((e) => e.ev === "bp:error");
  const gameState = () => rooms.get(roomKey("R")).ballpark;
  const scoreOf = (name) => lastState().players.find((p) => p.name === name)?.score;
  return { rooms, connect, emitted, lastState, errorsAfter, gameState, scoreOf };
}

function game() {
  const h = harness();
  const mk = (id, name) => { const s = h.connect(id); s.send("bp:join", { room: "R", name }); return s; };
  const a = mk("a", "A"), b = mk("b", "B"), c = mk("c", "C");
  const host = h.connect("host", true);
  host.send("bp:start");
  return { h, a, b, c, host };
}

test("start needs at least 2 players", () => {
  const h = harness();
  const a = h.connect("a"); a.send("bp:join", { room: "R", name: "A" });
  const host = h.connect("host", true);
  const before = h.emitted.length;
  host.send("bp:start");
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().phase, "lobby");
});

test("SECRET SAFETY: the answer and individual guesses are hidden during guessing", () => {
  const { h } = game();
  const st = h.lastState();
  assert.equal(st.phase, "guessing");
  assert.equal(st.answer, null);
  assert.equal(st.guesses.length, 0);
  assert.ok(typeof st.question === "string");
});

test("closest-without-going-over wins; owner +3 and each bettor +2", () => {
  const { h, a, b, c } = game();
  const A = h.gameState().answer;
  a.send("bp:guess", { value: A - 5 });
  b.send("bp:guess", { value: A }); // exact → will be the winning guess
  c.send("bp:guess", { value: A + 100 }); // over
  assert.equal(h.lastState().phase, "betting"); // auto-opened once all guessed
  assert.equal(h.lastState().guesses.length, 3);
  a.send("bp:bet", { value: A }); // bet on B's guess
  b.send("bp:bet", { value: A });
  c.send("bp:bet", { value: A - 5 }); // bet on the loser
  const st = h.lastState();
  assert.equal(st.phase, "reveal");
  assert.equal(st.winningValue, A);
  assert.equal(h.scoreOf("A"), 2); // bet on winner
  assert.equal(h.scoreOf("B"), 5); // owned winner (+3) and bet on it (+2)
  assert.equal(h.scoreOf("C"), 0);
});

test("if every guess is over the answer, the lowest guess wins", () => {
  const { h, a, b, c } = game();
  const A = h.gameState().answer;
  a.send("bp:guess", { value: A + 10 });
  b.send("bp:guess", { value: A + 20 });
  c.send("bp:guess", { value: A + 30 });
  a.send("bp:bet", { value: A + 10 });
  b.send("bp:bet", { value: A + 10 });
  c.send("bp:bet", { value: A + 30 });
  const st = h.lastState();
  assert.equal(st.winningValue, A + 10);
  assert.equal(h.scoreOf("A"), 5); // owned + bet
});
