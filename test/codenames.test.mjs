// State-machine tests for "Cover Ops" (Codenames). Drives registerCodenamesHandlers with an
// in-process fake io/socket harness, so board/clue/guess/turn/assassin/win rules are deterministic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerCodenamesHandlers } from "../apps/server/codenames.js";

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
    registerCodenamesHandlers(io, socket, rooms, roomKey);
    return { socket, send: (ev, p) => handlers[ev]?.(p), pid: () => socket.data.cnPlayerId };
  }
  const lastState = () => [...emitted].reverse().find((e) => e.ev === "cn:state")?.payload;
  const youFor = (sid) => [...emitted].reverse().find((e) => e.ev === "cn:you" && e.target === sid)?.payload;
  const errorsAfter = (n) => emitted.slice(n).filter((e) => e.ev === "cn:error");
  return { rooms, connect, emitted, lastState, youFor, errorsAfter };
}

function game() {
  const h = harness();
  const mk = (id, name, team, role) => {
    const s = h.connect(id);
    s.send("cn:join", { room: "R", name });
    s.send("cn:setTeam", { team, role });
    return s;
  };
  const rs = mk("rs", "RS", "red", "spymaster");
  const ro = mk("ro", "RO", "red", "operative");
  const bs = mk("bs", "BS", "blue", "spymaster");
  const bo = mk("bo", "BO", "blue", "operative");
  const host = h.connect("host", true);
  host.send("cn:start");
  return { h, rs, ro, bs, bo, host };
}

const active = (h, { rs, ro, bs, bo }) => {
  const turn = h.lastState().turn;
  return turn === "red" ? { turn, spy: rs, op: ro } : { turn, spy: bs, op: bo };
};

test("setTeam: a team can only have one spymaster", () => {
  const h = harness();
  const a = h.connect("a"); a.send("cn:join", { room: "R", name: "A" }); a.send("cn:setTeam", { team: "red", role: "spymaster" });
  const b = h.connect("b"); b.send("cn:join", { room: "R", name: "B" });
  const before = h.emitted.length;
  b.send("cn:setTeam", { team: "red", role: "spymaster" }); // taken → error
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().players.filter((p) => p.team === "red" && p.role === "spymaster").length, 1);
});

test("start needs a spymaster AND an operative on each team", () => {
  const h = harness();
  const rs = h.connect("rs"); rs.send("cn:join", { room: "R", name: "RS" }); rs.send("cn:setTeam", { team: "red", role: "spymaster" });
  const bs = h.connect("bs"); bs.send("cn:join", { room: "R", name: "BS" }); bs.send("cn:setTeam", { team: "blue", role: "spymaster" });
  const host = h.connect("host", true);
  const before = h.emitted.length;
  host.send("cn:start"); // no operatives → error, stays in lobby
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().phase, "lobby");
});

test("start deals a 25-card board; spymasters get the key, operatives do not", () => {
  const { h, rs, ro } = game();
  const st = h.lastState();
  assert.equal(st.phase, "playing");
  assert.equal(st.board.length, 25);
  assert.equal(st.counts.red + st.counts.blue, 17); // 9 + 8
  const spyKey = h.youFor(rs.socket.id).key;
  assert.equal(spyKey.length, 25);
  assert.equal(spyKey.filter((c) => c === "assassin").length, 1);
  assert.equal(h.youFor(ro.socket.id).key, undefined); // operatives never receive the key
});

test("SECRET SAFETY: unrevealed tile colours are null in the broadcast state", () => {
  const { h } = game();
  const st = h.lastState();
  assert.ok(st.board.every((c) => !c.revealed && c.color === null));
  assert.ok(!JSON.stringify(st).includes("assassin")); // the key word never appears in public state
});

test("only the active team's spymaster may give a clue", () => {
  const g = game();
  const { h } = g;
  const { turn, spy } = active(h, g);
  const idle = turn === "red" ? g.bs : g.rs;
  let before = h.emitted.length;
  idle.send("cn:clue", { word: "TREE", count: 2 }); // wrong team → error
  assert.equal(h.errorsAfter(before).length, 1);
  spy.send("cn:clue", { word: "TREE", count: 2 });
  assert.equal(h.lastState().clue.word, "TREE");
  assert.equal(h.lastState().clue.remaining, 3); // count + 1
});

test("contacting your own agent reveals it and keeps the turn going", () => {
  const g = game();
  const { h } = g;
  const { turn, spy, op } = active(h, g);
  spy.send("cn:clue", { word: "X", count: 3 });
  const key = h.youFor(spy.socket.id).key;
  const own = key.findIndex((c) => c === turn);
  op.send("cn:guess", { index: own });
  const st = h.lastState();
  assert.equal(st.board[own].revealed, true);
  assert.equal(st.board[own].color, turn);
  assert.equal(st.turn, turn); // still your turn
});

test("hitting the assassin loses instantly", () => {
  const g = game();
  const { h } = g;
  const { turn, spy, op } = active(h, g);
  spy.send("cn:clue", { word: "X", count: 1 });
  const key = h.youFor(spy.socket.id).key;
  op.send("cn:guess", { index: key.indexOf("assassin") });
  const st = h.lastState();
  assert.equal(st.phase, "ended");
  assert.equal(st.winner, turn === "red" ? "blue" : "red");
});

test("revealing all your agents wins the game", () => {
  const g = game();
  const { h } = g;
  const { turn, spy, op } = active(h, g);
  spy.send("cn:clue", { word: "X", count: 9 });
  const key = h.youFor(spy.socket.id).key;
  const own = key.map((c, i) => (c === turn ? i : -1)).filter((i) => i >= 0);
  for (const i of own) op.send("cn:guess", { index: i });
  const st = h.lastState();
  assert.equal(st.phase, "ended");
  assert.equal(st.winner, turn);
});

test("a neutral guess ends the turn", () => {
  const g = game();
  const { h } = g;
  const { turn, spy, op } = active(h, g);
  spy.send("cn:clue", { word: "X", count: 2 });
  const key = h.youFor(spy.socket.id).key;
  op.send("cn:guess", { index: key.indexOf("neutral") });
  assert.equal(h.lastState().turn, turn === "red" ? "blue" : "red");
  assert.equal(h.lastState().clue, null);
});
