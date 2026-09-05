// State-machine tests for "Solo Clue" (Just One). Drives registerJustOneHandlers with a fake
// io/socket harness. Verifies the word reaches clue-givers but NOT the guesser, and that identical
// clues cancel before the reveal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerJustOneHandlers } from "../apps/server/justone.js";

function harness() {
  const rooms = new Map();
  const emitted = [];
  const io = { to: (target) => ({ emit: (ev, payload) => emitted.push({ target, ev, payload }) }) };
  const roomKey = (r) => `T:${String(r).toUpperCase()}`;
  function connect(id, asHost = false) {
    const handlers = {};
    const socket = {
      id,
      data: asHost ? { role: "host", code: roomKey("R") } : {},
      join() {},
      on(ev, fn) { handlers[ev] = fn; },
      emit(ev, payload) { emitted.push({ target: id, ev, payload }); },
    };
    registerJustOneHandlers(io, socket, rooms, roomKey);
    return { socket, send: (ev, p) => handlers[ev]?.(p), pid: () => socket.data.joPlayerId };
  }
  const lastState = () => [...emitted].reverse().find((e) => e.ev === "jo:state")?.payload;
  const wordFor = (sid) => [...emitted].reverse().find((e) => e.ev === "jo:word" && e.target === sid)?.payload;
  const errorsAfter = (n) => emitted.slice(n).filter((e) => e.ev === "jo:error");
  return { rooms, connect, emitted, lastState, wordFor, errorsAfter };
}

function game() {
  const h = harness();
  const mk = (id, name) => { const s = h.connect(id); s.send("jo:join", { room: "R", name }); return s; };
  const a = mk("a", "A"), b = mk("b", "B"), c = mk("c", "C");
  const host = h.connect("host", true);
  host.send("jo:start");
  const players = { a, b, c };
  const gid = h.lastState().guesserId;
  const guesser = Object.values(players).find((s) => s.pid() === gid);
  const writers = Object.values(players).filter((s) => s.pid() !== gid);
  return { h, host, guesser, writers };
}

test("start needs at least 3 players", () => {
  const h = harness();
  const a = h.connect("a"); a.send("jo:join", { room: "R", name: "A" });
  const b = h.connect("b"); b.send("jo:join", { room: "R", name: "B" });
  const host = h.connect("host", true);
  const before = h.emitted.length;
  host.send("jo:start");
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().phase, "lobby");
});

test("the word reaches clue-givers but never the guesser, and is not in public state", () => {
  const { h, guesser, writers } = game();
  assert.equal(h.lastState().phase, "writing");
  assert.equal(h.lastState().word, null); // secret: never broadcast during writing
  assert.equal(h.wordFor(guesser.socket.id), null); // the guesser's device gets null
  for (const w of writers) assert.ok(typeof h.wordFor(w.socket.id) === "string" && h.wordFor(w.socket.id).length > 0);
});

test("the guesser cannot submit a clue", () => {
  const { h, guesser } = game();
  const before = h.emitted.length;
  guesser.send("jo:clue", { word: "nope" });
  assert.equal(h.errorsAfter(before).length, 1);
});

test("identical clues cancel; unique clues survive (auto-reveal when all have written)", () => {
  const { h, writers } = game();
  writers[0].send("jo:clue", { word: "River" });
  writers[1].send("jo:clue", { word: "river" }); // same (case-insensitive) → both cancel
  const st = h.lastState();
  assert.equal(st.phase, "reveal");
  assert.equal(st.survivors.length, 0);
  assert.equal(st.cancelled.length, 2);
});

test("unique clues both survive and the guesser scores, then the round advances", () => {
  const { h, guesser, writers } = game();
  const firstGuesser = h.lastState().guesserId;
  writers[0].send("jo:clue", { word: "Water" });
  writers[1].send("jo:clue", { word: "Bridge" });
  let st = h.lastState();
  assert.equal(st.phase, "reveal");
  assert.equal(st.survivors.length, 2);
  guesser.send("jo:judge", { got: true });
  st = h.lastState();
  assert.equal(st.phase, "roundover");
  assert.equal(st.score, 1);
  assert.ok(typeof st.word === "string"); // word revealed after scoring
  guesser.send("jo:next");
  st = h.lastState();
  assert.equal(st.phase, "writing");
  assert.equal(st.round, 2);
  assert.notEqual(st.guesserId, firstGuesser); // guesser rotates
});
