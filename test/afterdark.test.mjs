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

// --- removing players -----------------------------------------------------------------------------
// The owner runs these at bars: people wander off mid-round. Two separate problems live here.
//
// 1. THE STALL. A round advances when every non-judge WITH A socketId has submitted, and nothing
//    cleared socketId when a phone vanished. Someone who went home counted as active forever, so
//    the round waited on a card that was never coming -- and ca:next only works in "reveal", so the
//    host could not skip past it either. The game was simply stuck.
// 2. No way for the host to remove anyone at all.
function bigGame(n = 4) {
  const h = harness();
  const players = [];
  for (let i = 0; i < n; i++) {
    const s = h.connect(String.fromCharCode(97 + i));
    s.send("ca:join", { room: "R", name: "P" + i });
    players.push(s);
  }
  const host = h.connect("host", true);
  host.send("ca:start");
  return { h, players, host };
}

const submitFor = (h, s) => {
  const st = h.lastState();
  const hand = h.youFor(s.socket.id).hand;
  s.send("ca:submit", { cards: hand.slice(0, st.prompt.pick) });
};

test("a player who disconnects stops blocking the round", () => {
  const { h, players } = bigGame(4);
  const judge = h.lastState().judgeId;
  const others = players.filter((p) => p.pid() !== judge);

  submitFor(h, others[0]);
  submitFor(h, others[1]);
  assert.equal(h.lastState().phase, "submitting", "still waiting on the third player");

  // The third player's phone goes dark. Before the fix this hung here forever.
  others[2].send("disconnect");
  assert.equal(h.lastState().phase, "judging", "the round moves on without the player who left");
});

test("the host can remove a player, and that unblocks the round too", () => {
  const { h, players, host } = bigGame(4);
  const judge = h.lastState().judgeId;
  const others = players.filter((p) => p.pid() !== judge);

  submitFor(h, others[0]);
  submitFor(h, others[1]);
  assert.equal(h.lastState().phase, "submitting");

  host.send("ca:kick", { id: others[2].pid() });
  const st = h.lastState();
  assert.equal(st.phase, "judging");
  assert.equal(st.players.length, 3, "the removed player is gone from the roster");
  assert.ok(!st.players.some((p) => p.id === others[2].pid()));
});

test("removing the judge hands the role on instead of stranding the round", () => {
  const { h, players, host } = bigGame(4);
  const judgeBefore = h.lastState().judgeId;
  host.send("ca:kick", { id: judgeBefore });
  const st = h.lastState();
  assert.equal(st.players.length, 3);
  assert.notEqual(st.judgeId, judgeBefore, "somebody else is judge now");
  assert.ok(st.players.some((p) => p.id === st.judgeId), "and they are a player who is still here");
  assert.ok(st.judgeId, "the judge seat is never left empty");
});

test("a removed player's card comes off the table", () => {
  const { h, players, host } = bigGame(4);
  const judge = h.lastState().judgeId;
  const others = players.filter((p) => p.pid() !== judge);
  for (const o of others) submitFor(h, o);
  assert.equal(h.lastState().phase, "judging");
  assert.equal(h.lastState().revealed.length, 3);

  host.send("ca:kick", { id: others[0].pid() });
  const rev = h.lastState().revealed;
  assert.equal(rev.length, 2, "their submission goes with them");
  // `i` is what the judge taps, so it must stay a clean 0..n-1 after the removal.
  assert.deepEqual(rev.map((r) => r.i), [0, 1], "the remaining cards are re-indexed");
});

test("dropping below the minimum returns the room to the lobby", () => {
  const { h, players, host } = bigGame(4);
  host.send("ca:kick", { id: players[0].pid() });
  assert.notEqual(h.lastState().phase, "lobby", "three players can still play");
  host.send("ca:kick", { id: players[1].pid() });
  const st = h.lastState();
  assert.equal(st.phase, "lobby", "two cannot, so the room waits rather than pretending to play");
  assert.equal(st.players.length, 2);
});

test("only the host can remove a player", () => {
  const { h, players } = bigGame(4);
  const before = h.emitted.length;
  players[0].send("ca:kick", { id: players[1].pid() });
  assert.equal(h.lastState().players.length, 4, "nobody was removed");
  assert.ok(h.errorsAfter(before).length > 0, "and the player is told why");
});

test("removing someone already gone is refused, not crashed", () => {
  const { h, players, host } = bigGame(4);
  host.send("ca:kick", { id: players[0].pid() });
  const before = h.emitted.length;
  host.send("ca:kick", { id: players[0].pid() });
  assert.equal(h.lastState().players.length, 3);
  assert.ok(h.errorsAfter(before).length > 0);
});

// --- the deck itself ------------------------------------------------------------------------------
// Card text is DATA, pasted in from a supplied JSON file, so it never goes through a type checker
// and no game test would notice it being malformed. The two things that actually break play are a
// blank the client cannot fill, and a `pick` that disagrees with the number of blanks -- either one
// puts a broken prompt on a television in front of a room of people.
import { AD_PROMPTS, AD_RESPONSES } from "../apps/server/afterdark.js";

test("the deck is big enough not to repeat itself in one night", () => {
  assert.ok(AD_PROMPTS.length >= 100, `prompts: ${AD_PROMPTS.length}`);
  assert.ok(AD_RESPONSES.length >= 400, `responses: ${AD_RESPONSES.length}`);
});

test("every prompt's blank is one the client can actually fill", () => {
  // fillPrompt matches /_{3,}/. A blank of one or two underscores would render as itself.
  const bad = AD_PROMPTS.filter((p) => /(?<!_)_{1,2}(?!_)/.test(p.text));
  assert.deepEqual(bad.map((p) => p.text), [], "these have an underscore run too short to be a blank");
});

test("pick matches the number of blanks, or the prompt is a question", () => {
  for (const p of AD_PROMPTS) {
    const blanks = (p.text.match(/_{3,}/g) || []).length;
    assert.ok(Number.isInteger(p.pick) && p.pick >= 1, `bad pick on: ${p.text}`);
    // Question-style prompts carry no blank; the answer is appended instead.
    if (blanks > 0) assert.equal(blanks, p.pick, `pick=${p.pick} but ${blanks} blank(s): ${p.text}`);
  }
});

test("a hand can always satisfy the biggest prompt", () => {
  const most = Math.max(...AD_PROMPTS.map((p) => p.pick));
  assert.ok(most <= 7, `a prompt wants ${most} cards but a hand holds 7`);
});

test("no duplicate or empty cards", () => {
  assert.equal(new Set(AD_PROMPTS.map((p) => p.text)).size, AD_PROMPTS.length, "duplicate prompt");
  assert.equal(new Set(AD_RESPONSES).size, AD_RESPONSES.length, "duplicate response");
  assert.ok(AD_PROMPTS.every((p) => p.text.trim()), "empty prompt");
  assert.ok(AD_RESPONSES.every((r) => typeof r === "string" && r.trim()), "empty response");
});

test("no response is itself a blank, which would render as a hole in the sentence", () => {
  assert.deepEqual(AD_RESPONSES.filter((r) => /_{3,}/.test(r)), []);
});
