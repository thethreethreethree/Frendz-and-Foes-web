// State-machine tests for Murder v2. Drives registerMurder2Handlers directly with an in-process
// fake io/socket harness + a controllable clock, so cooldown/weapon/vote rules are deterministic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerMurder2Handlers } from "../apps/server/murder2.js";
import { VILLAGERS } from "../apps/server/villagers2.js";

function harness() {
  const rooms = new Map();
  let clock = 1_000_000;
  const now = () => clock;
  const emitted = [];
  const io = { to: (target) => ({ emit: (ev, payload) => emitted.push({ target, ev, payload }) }) };
  const sockets = {};
  const roomKey = (r) => `T:${String(r).toUpperCase()}`;

  function connect(id) {
    const handlers = {};
    const socket = {
      id, data: {},
      join() {},
      on(ev, fn) { handlers[ev] = fn; },
      emit(ev, payload) { emitted.push({ target: id, ev, payload }); },
    };
    registerMurder2Handlers(io, socket, rooms, roomKey, now);
    const w = {
      socket,
      send: (ev, p) => handlers[ev]?.(p),
      pid: () => socket.data.playerId2,
    };
    sockets[id] = w;
    return w;
  }
  const lastState = () => [...emitted].reverse().find((e) => e.ev === "m2:state")?.payload;
  const youFor = (sid) => [...emitted].reverse().find((e) => e.ev === "m2:you" && e.target === sid)?.payload;
  const errorsAfter = (n) => emitted.slice(n).filter((e) => e.ev === "m2:error");
  return { rooms, connect, sockets, emitted, advance: (ms) => { clock += ms; }, lastState, youFor, errorsAfter };
}

// Set up a started game with N players who each picked a distinct character. Returns handles.
function startedGame(n = 5) {
  const h = harness();
  const chars = VILLAGERS.slice(0, n).map((v) => v.id); // real roster → supports up to 100 players
  const players = chars.map((c, i) => {
    const s = h.connect("s" + i);
    s.send("m2:join", { room: "R", name: "P" + i });
    s.send("m2:pick", { characterId: c });
    return s;
  });
  players[0].send("m2:start"); // player 0 acts as host
  // Identify the murderer from the private role message.
  let murdererSock = null;
  for (const p of players) if (h.youFor(p.socket.id)?.role === "murderer") murdererSock = p;
  return { h, players, murdererSock };
}

test("lobby guards: a taken character is rejected; starting with <3 players is rejected", () => {
  const h = harness();
  const a = h.connect("a"); a.send("m2:join", { room: "L", name: "A" }); a.send("m2:pick", { characterId: "sam" });
  const b = h.connect("b"); b.send("m2:join", { room: "L", name: "B" });
  let before = h.emitted.length;
  b.send("m2:pick", { characterId: "sam" }); // already taken → error, no change
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().players.filter((p) => p.characterId === "sam").length, 1);
  b.send("m2:pick", { characterId: "allen" }); // a free one is fine
  before = h.emitted.length;
  a.send("m2:start"); // only 2 players with characters → error, stays in lobby
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().phase, "lobby");
});

test("start assigns exactly one murderer; the rest are villagers", () => {
  const { h, players } = startedGame(5);
  const st = h.lastState();
  assert.equal(st.phase, "playing");
  const roles = players.map((p) => h.youFor(p.socket.id)?.role);
  assert.equal(roles.filter((r) => r === "murderer").length, 1);
  assert.equal(roles.filter((r) => r === "villager").length, 4);
});

test("anti-cheat: a non-murderer cannot kill (server-authority)", () => {
  const { h, players, murdererSock } = startedGame(5);
  const villager = players.find((p) => p !== murdererSock);
  const victim = players.find((p) => p !== villager && p !== murdererSock);
  const before = h.emitted.length;
  villager.send("m2:kill", { victimId: victim.pid(), weaponId: "trowel" });
  assert.equal(h.errorsAfter(before).length, 1, "villager's kill is rejected");
  assert.equal(h.lastState().clues.length, 0, "no clue logged");
  assert.equal(h.lastState().players.find((p) => p.id === victim.pid()).alive, true, "victim still alive");
});

test("scale: a realistically-large 15-player game works (one murderer, 15 framing options, a kill lands)", () => {
  const { h, players, murdererSock } = startedGame(15);
  const st = h.lastState();
  assert.equal(st.players.filter((p) => p.characterId).length, 15);
  assert.equal(players.map((p) => h.youFor(p.socket.id)?.role).filter((r) => r === "murderer").length, 1);
  const you = h.youFor(murdererSock.socket.id);
  assert.equal(you.weapons.length, 15, "framing pool covers all 15 present characters");
  const victim = players.find((p) => p !== murdererSock);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  murdererSock.send("m2:kill", { victimId: victim.pid(), weaponId: w.id });
  assert.equal(h.lastState().clues.length, 1, "a kill lands at scale");
});

test("a kill logs a framing clue (weapon → the framed player) and downs the victim", () => {
  const { h, players, murdererSock } = startedGame(5);
  const you = h.youFor(murdererSock.socket.id);
  const weapon = you.weapons.find((w) => w.id !== you.ownWeaponId); // frame someone else
  const victim = players.find((p) => p !== murdererSock);
  murdererSock.send("m2:kill", { victimId: victim.pid(), weaponId: weapon.id });
  const st = h.lastState();
  assert.equal(st.clues.length, 1);
  assert.equal(st.clues[0].weaponId, weapon.id);
  assert.equal(st.clues[0].framedPlayerId, weapon.framesPlayerId); // frames the weapon's owner
  assert.equal(st.players.find((p) => p.id === victim.pid()).alive, false);
});

// --- Item-set model (founder's manifest): the set frames the suspect, the method is the story ----

test("the murderer's chosen method is recorded on the clue, and the set still frames its owner", () => {
  const { h, players, murdererSock } = startedGame(5);
  const victim = players.find((p) => p !== murdererSock);
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  assert.equal(w.methods.length, 3, "the murderer's set list should expose all 3 methods");

  murdererSock.send("m2:kill", { victimId: victim.pid(), weaponId: w.id, methodIndex: 2 });
  const clue = h.lastState().clues[0];
  assert.equal(clue.weaponId, w.id, "the set is the deduction key");
  assert.equal(clue.methodIndex, 2);
  assert.equal(clue.method, w.methods[2], "the clue names the exact method the murderer picked");
  assert.equal(clue.weapon.setNumber, w.setNumber);
  assert.ok(clue.weapon.location, "the clue carries the set's location label");
});

// Absent means absent: `methodIndex ?? 0` treats undefined and null identically, so an older client
// that never sends the field still lands a valid kill on the set's first method.
test("methodIndex defaults to the first method when the client omits it or sends null", () => {
  for (const omitted of [undefined, null]) {
    const { h, players, murdererSock } = startedGame(5);
    const victim = players.find((p) => p !== murdererSock);
    const you = h.youFor(murdererSock.socket.id);
    const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
    murdererSock.send("m2:kill", { victimId: victim.pid(), weaponId: w.id, methodIndex: omitted });
    const clue = h.lastState().clues[0];
    assert.equal(clue.methodIndex, 0, `methodIndex: ${omitted}`);
    assert.equal(clue.method, w.methods[0]);
  }
});

// The display's dramatic banner renders this payload. Gated because the whole announce pipeline sat
// unconsumed once already (audit F-2) — if a field the banner reads goes missing, this fails rather
// than the banner silently rendering "undefined" to a room full of players.
test("the 'killed' announce carries everything the display banner renders", () => {
  const { h, players, murdererSock } = startedGame(5);
  const victim = players.find((p) => p !== murdererSock);
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  const before = h.emitted.length;
  murdererSock.send("m2:kill", { victimId: victim.pid(), weaponId: w.id, methodIndex: 1 });

  const ann = h.emitted.slice(before).find((e) => e.ev === "m2:announce" && e.payload?.type === "killed");
  assert.ok(ann, "a killed announce is emitted");
  assert.equal(ann.payload.victim, h.lastState().players.find((p) => p.id === victim.pid()).name);
  assert.equal(ann.payload.weapon, w.label, "announce carries the set's location label");
  assert.equal(ann.payload.method, w.methods[1], "announce carries the chosen method");
  assert.ok(ann.payload.framesName, "announce names who the set frames");
});

// Rejected, not clamped: a silently-clamped index would print a plausible but wrong story into the
// permanent clue record, which is the failure mode the engine exists to prevent.
test("anti-cheat: an out-of-range methodIndex is rejected and logs no clue", () => {
  const { h, players, murdererSock } = startedGame(5);
  const victim = players.find((p) => p !== murdererSock);
  const w = h.youFor(murdererSock.socket.id).weapons.find((x) => x.id !== h.youFor(murdererSock.socket.id).ownWeaponId);
  for (const methodIndex of [3, -1, 99, "1", 1.5, NaN, {}]) {
    const before = h.emitted.length;
    murdererSock.send("m2:kill", { victimId: victim.pid(), weaponId: w.id, methodIndex });
    assert.equal(h.errorsAfter(before).length, 1, `rejected methodIndex: ${JSON.stringify(methodIndex)}`);
  }
  assert.equal(h.lastState().clues.length, 0, "no clue logged from any invalid method");
});

test("anti-cheat: malformed kill commands are rejected (bad victim / unknown weapon / self / absent-char weapon)", () => {
  const { h, players, murdererSock } = startedGame(5);
  const other = players.find((p) => p !== murdererSock);
  const bad = [
    { victimId: "nope", weaponId: "trowel" }, // victim doesn't exist
    { victimId: other.pid(), weaponId: "not_a_weapon" }, // weapon doesn't exist
    { victimId: murdererSock.pid(), weaponId: "trowel" }, // can't kill self
    { victimId: other.pid(), weaponId: "cleaver" }, // cleaver's character (Butch) isn't in this game
  ];
  for (const cmd of bad) {
    const before = h.emitted.length;
    murdererSock.send("m2:kill", cmd);
    assert.equal(h.errorsAfter(before).length, 1, `rejected: ${JSON.stringify(cmd)}`);
  }
  assert.equal(h.lastState().clues.length, 0, "no clue logged from any invalid kill");
});

test("cooldown blocks a second kill until it elapses", () => {
  const { h, players, murdererSock } = startedGame(5);
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  const victims = players.filter((p) => p !== murdererSock);
  murdererSock.send("m2:kill", { victimId: victims[0].pid(), weaponId: w.id });
  const before = h.emitted.length;
  murdererSock.send("m2:kill", { victimId: victims[1].pid(), weaponId: w.id }); // immediate → blocked
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().clues.length, 1);
  h.advance(80_000); // past 75s cooldown
  murdererSock.send("m2:kill", { victimId: victims[1].pid(), weaponId: w.id });
  assert.equal(h.lastState().clues.length, 2);
});

test("a weapon cannot be used more than twice", () => {
  const { h, players, murdererSock } = startedGame(5);
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  const victims = players.filter((p) => p !== murdererSock);
  murdererSock.send("m2:kill", { victimId: victims[0].pid(), weaponId: w.id });
  h.advance(80_000);
  murdererSock.send("m2:kill", { victimId: victims[1].pid(), weaponId: w.id }); // 2nd use ok
  h.advance(80_000);
  const before = h.emitted.length;
  murdererSock.send("m2:kill", { victimId: victims[2].pid(), weaponId: w.id }); // 3rd → blocked
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().clues.length, 2);
});

test("final kill must use the murderer's own weapon; reaching the target wins for murderers", () => {
  const { h, players, murdererSock } = startedGame(5);
  const you = h.youFor(murdererSock.socket.id);
  const own = you.ownWeaponId;
  const others = you.weapons.filter((w) => w.id !== own).map((w) => w.id);
  const victims = players.filter((p) => p !== murdererSock);
  const kill = (v, wid) => { murdererSock.send("m2:kill", { victimId: v.pid(), weaponId: wid }); h.advance(80_000); };
  kill(victims[0], others[0]);
  kill(victims[1], others[0]); // others[0] now used twice
  kill(victims[2], others[1]);
  // 3 kills done; final kill must be own weapon.
  const before = h.emitted.length;
  murdererSock.send("m2:kill", { victimId: victims[3].pid(), weaponId: others[1] }); // not own → blocked
  assert.equal(h.errorsAfter(before).length, 1, "final non-own kill should be rejected");
  murdererSock.send("m2:kill", { victimId: victims[3].pid(), weaponId: own }); // own → allowed
  const st = h.lastState();
  assert.equal(st.phase, "ended");
  assert.equal(st.winner, "murderers");
  assert.equal(st.killCount, 4);
});

test("murderers win when all villagers are dead even if the kill target isn't reached (no deadlock)", () => {
  const { h, players, murdererSock } = startedGame(3); // 1 murderer + 2 villagers, target defaults to 4
  const villagers = players.filter((p) => p !== murdererSock);
  const w1 = h.youFor(murdererSock.socket.id).weapons.find((x) => x.remaining > 0);
  murdererSock.send("m2:kill", { victimId: villagers[0].pid(), weaponId: w1.id });
  h.advance(80_000);
  const w2 = h.youFor(murdererSock.socket.id).weapons.find((x) => x.remaining > 0);
  murdererSock.send("m2:kill", { victimId: villagers[1].pid(), weaponId: w2.id });
  const st = h.lastState();
  assert.equal(st.phase, "ended");
  assert.equal(st.winner, "murderers");
  assert.ok(st.killCount < st.killTarget, "won by eliminating the town, before the target");
});

test("voting: a wrong majority clears the suspect + shortens the current cooldown so the next kill comes sooner", () => {
  const g = startedGame(5);
  const you = g.h.youFor(g.murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  const vills = g.players.filter((p) => p !== g.murdererSock);
  // Kill 1 → sets a full 75s cooldown.
  g.murdererSock.send("m2:kill", { victimId: vills[0].pid(), weaponId: w.id });
  // Host opens a town meeting; three living players wrongly vote an innocent villager.
  g.players[0].send("m2:openVote");
  const innocent = vills[1];
  [g.murdererSock, vills[2], vills[3]].forEach((p) => p.send("m2:vote", { suspectId: innocent.pid() }));
  g.players[0].send("m2:closeVote"); // host closes → resolve
  const st = g.h.lastState();
  assert.equal(st.phase, "playing"); // wrong guess → back to playing
  assert.equal(st.players.find((p) => p.id === innocent.pid()).cleared, true);
  // Reward: cooldown was shortened to ~30s. At +31s the next kill is allowed (would be blocked at 75s).
  g.h.advance(31_000);
  g.murdererSock.send("m2:kill", { victimId: vills[2].pid(), weaponId: w.id }); // w's 2nd use
  assert.equal(g.h.lastState().clues.length, 2, "shortened cooldown let the next kill through at +31s");
});

test("voting: a split with no majority resolves with no effect (back to playing)", () => {
  const { h, players, murdererSock } = startedGame(5);
  void murdererSock;
  players[0].send("m2:openVote"); // player 0 acts as host
  const A = players[2].pid(), B = players[3].pid();
  players[0].send("m2:vote", { suspectId: A });
  players[1].send("m2:vote", { suspectId: A }); // 2 for A
  players[2].send("m2:vote", { suspectId: B });
  players[4].send("m2:vote", { suspectId: B }); // 2 for B; player 3 abstains → not all voted
  players[0].send("m2:closeVote");
  const st = h.lastState();
  assert.equal(st.phase, "playing"); // 2 vs 2 of 5 → no majority
  assert.equal(st.winner, null);
  assert.ok(st.players.every((p) => !p.cleared), "no one is cleared on a no-majority vote");
});

test("anti-cheat: the dead cannot vote and no one votes twice", () => {
  const { h, players, murdererSock } = startedGame(5);
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  const dead = players.find((p) => p !== murdererSock);
  murdererSock.send("m2:kill", { victimId: dead.pid(), weaponId: w.id });
  const alive1 = players.find((p) => p !== murdererSock && p !== dead);
  murdererSock.send("m2:openVote"); // any joined socket can open (host); murderer is alive

  let before = h.emitted.length;
  dead.send("m2:vote", { suspectId: murdererSock.pid() }); // dead → rejected
  assert.equal(h.errorsAfter(before).length, 1, "the dead cannot vote");

  alive1.send("m2:vote", { suspectId: murdererSock.pid() }); // living vote accepted
  before = h.emitted.length;
  alive1.send("m2:vote", { suspectId: murdererSock.pid() }); // second time → rejected
  assert.equal(h.errorsAfter(before).length, 1, "no double voting");
});

test("rule interaction: a cleared suspect is immune from RE-voting but the murderer can still kill them", () => {
  const { h, players, murdererSock } = startedGame(5);
  const innocent = players.find((p) => p !== murdererSock);
  // Wrong majority clears the innocent.
  players[0].send("m2:openVote");
  players.slice(0, 3).forEach((p) => p.send("m2:vote", { suspectId: innocent.pid() }));
  players[0].send("m2:closeVote");
  assert.equal(h.lastState().players.find((p) => p.id === innocent.pid()).cleared, true);
  // Re-open: the cleared player cannot be voted again.
  players[0].send("m2:openVote");
  const before = h.emitted.length;
  players[1].send("m2:vote", { suspectId: innocent.pid() });
  assert.equal(h.errorsAfter(before).length, 1, "cleared suspect is rejected from voting");
  players[0].send("m2:closeVote");
  // But clearing is vote-immunity only — the murderer can still kill them.
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  murdererSock.send("m2:kill", { victimId: innocent.pid(), weaponId: w.id });
  assert.equal(h.lastState().players.find((p) => p.id === innocent.pid()).alive, false, "a cleared player can still be murdered");
});

test("full game arc: kill → clue → wrong vote (clear+reward) → reward-cooldown kill → correct vote → town wins", () => {
  const { h, players, murdererSock } = startedGame(5);
  const own = h.youFor(murdererSock.socket.id).ownWeaponId;
  const vills = players.filter((p) => p !== murdererSock);
  const otherWeapon = () => h.youFor(murdererSock.socket.id).weapons.find((x) => x.id !== own && x.remaining > 0);

  murdererSock.send("m2:kill", { victimId: vills[0].pid(), weaponId: otherWeapon().id }); // kill 1
  assert.equal(h.lastState().clues.length, 1);

  players[0].send("m2:openVote"); // town meeting → wrongly clears vills[1]
  [murdererSock, vills[2], vills[3]].forEach((p) => p.send("m2:vote", { suspectId: vills[1].pid() }));
  players[0].send("m2:closeVote");
  assert.equal(h.lastState().players.find((p) => p.id === vills[1].pid()).cleared, true);

  h.advance(31_000); // reward shortened the cooldown → next kill lands before the full 75s
  murdererSock.send("m2:kill", { victimId: vills[2].pid(), weaponId: otherWeapon().id }); // kill 2
  assert.equal(h.lastState().clues.length, 2);

  players[0].send("m2:openVote"); // alive: murderer + cleared-but-alive vills[1] + vills[3]
  [vills[1], vills[3]].forEach((p) => p.send("m2:vote", { suspectId: murdererSock.pid() })); // 2 of 3 → majority
  players[0].send("m2:closeVote");
  const st = h.lastState();
  assert.equal(st.phase, "ended");
  assert.equal(st.winner, "town");
});

test("voting: a correct majority on the murderer wins for the town", () => {
  const g = startedGame(5);
  const vills = g.players.filter((p) => p !== g.murdererSock);
  g.players[0].send("m2:openVote");
  vills.slice(0, 3).forEach((p) => p.send("m2:vote", { suspectId: g.murdererSock.pid() }));
  g.players[0].send("m2:closeVote");
  const st = g.h.lastState();
  assert.equal(st.phase, "ended");
  assert.equal(st.winner, "town");
});
