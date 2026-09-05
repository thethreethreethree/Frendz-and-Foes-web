// State-machine tests for "After Dark" (fill-in-the-blank). Verifies hands stay private, the judge
// doesn't play, submissions are anonymous until the pick, and scoring/rotation work.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerAfterDarkHandlers } from "../apps/server/afterdark.js";

function harness() {
  const rooms = new Map();
  const emitted = [];
  const io = { to: (target) => ({ emit: (ev, payload) => emitted.push({ target, ev, payload }) }) };
  const roomKey = (r) => `T:${String(r).toUpperCase()}`;
  function connect(id, asHost = false) {
    const handlers = {};
    const socket = { id, data: asHost ? { role: "host", code: roomKey("R") } : {}, join() {}, on(ev, fn) { handlers[ev] = fn; }, emit(ev, payload) { emitted.push({ target: id, ev, payload }); } };
    registerAfterDarkHandlers(io, socket, rooms, roomKey);
    return { socket, send: (ev, p) => handlers[ev]?.(p), pid: () => socket.data.caPlayerId };
  }
  const lastState = () => [...emitted].reverse().find((e) => e.ev === "ca:state")?.payload;
  const youFor = (sid) => [...emitted].reverse().find((e) => e.ev === "ca:you" && e.target === sid)?.payload;
  const errorsAfter = (n) => emitted.slice(n).filter((e) => e.ev === "ca:error");
  return { rooms, connect, emitted, lastState, youFor, errorsAfter };
}

function game() {
  const h = harness();
  const mk = (id, name) => { const s = h.connect(id); s.send("ca:join", { room: "R", name }); return s; };
  const players = [mk("a", "A"), mk("b", "B"), mk("c", "C")];
  const host = h.connect("host", true);
  host.send("ca:start");
  return { h, players, host };
}

const judgeSock = (h, players) => players.find((p) => p.socket.id && h.lastState().judgeId === p.pid());

test("start needs at least 3 players", () => {
  const h = harness();
  h.connect("a").send("ca:join", { room: "R", name: "A" });
  h.connect("b").send("ca:join", { room: "R", name: "B" });
  const host = h.connect("host", true);
  const before = h.emitted.length;
  host.send("ca:start");
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().phase, "lobby");
});

test("start deals private hands; the broadcast state has counts, not card text", () => {
  const { h, players } = game();
  const st = h.lastState();
  assert.equal(st.phase, "submitting");
  assert.ok(st.players.every((p) => p.handCount === st.config.handSize));
  assert.equal(st.players[0].hand, undefined); // hands are NOT in the broadcast
  for (const p of players) assert.equal(h.youFor(p.socket.id).hand.length, st.config.handSize);
});

test("the judge cannot play a card", () => {
  const { h, players } = game();
  const judge = judgeSock(h, players);
  const before = h.emitted.length;
  judge.send("ca:submit", { cards: [h.youFor(judge.socket.id).hand[0]] });
  assert.equal(h.errorsAfter(before).length, 1);
});

test("once everyone plays, submissions are revealed anonymously; the judge picks a winner", () => {
  const { h, players } = game();
  const judge = judgeSock(h, players);
  const pick = h.lastState().prompt.pick;
  for (const p of players) {
    if (p === judge) continue;
    p.send("ca:submit", { cards: h.youFor(p.socket.id).hand.slice(0, pick) });
  }
  let st = h.lastState();
  assert.equal(st.phase, "judging");
  assert.equal(st.revealed.length, players.length - 1);
  assert.ok(st.revealed.every((r) => r.by === null)); // anonymous during judging
  judge.send("ca:pick", { i: st.revealed[0].i });
  st = h.lastState();
  assert.equal(st.phase, "reveal");
  assert.ok(st.winner && st.winner.name);
  assert.equal(st.players.reduce((n, p) => n + p.score, 0), 1); // exactly one point awarded
});

test("next round rotates the judge and refills hands", () => {
  const { h, players } = game();
  const firstJudge = h.lastState().judgeId;
  const judge = judgeSock(h, players);
  const pick = h.lastState().prompt.pick;
  for (const p of players) { if (p !== judge) p.send("ca:submit", { cards: h.youFor(p.socket.id).hand.slice(0, pick) }); }
  judge.send("ca:pick", { i: h.lastState().revealed[0].i });
  judge.send("ca:next");
  const st = h.lastState();
  assert.equal(st.phase, "submitting");
  assert.equal(st.round, 2);
  assert.notEqual(st.judgeId, firstJudge);
  assert.ok(st.players.every((p) => p.handCount === st.config.handSize)); // refilled
});
