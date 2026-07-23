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

  // `asHost` mirrors the real controller, which reaches the room through index.js's generic
  // join (setting socket.data.role) rather than m2:join. Host actions now require it.
  function connect(id, asHost = false) {
    const handlers = {};
    const socket = {
      id, data: asHost ? { role: "host", code: roomKey("R") } : {},
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
  const host = h.connect("host", true);
  host.send("m2:start");
  // Identify the murderer from the private role message.
  let murdererSock = null;
  for (const p of players) if (h.youFor(p.socket.id)?.role === "murderer") murdererSock = p;
  return { h, players, murdererSock, host };
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

test("start (5 players) assigns one murderer, one detective, the rest villagers", () => {
  const { h, players } = startedGame(5);
  const st = h.lastState();
  assert.equal(st.phase, "playing");
  const roles = players.map((p) => h.youFor(p.socket.id)?.role);
  assert.equal(roles.filter((r) => r === "murderer").length, 1);
  assert.equal(roles.filter((r) => r === "detective").length, 1, "a 4+ player game gets one detective");
  assert.equal(roles.filter((r) => r === "villager").length, 3);
  assert.equal(st.hasDetective, true, "the town publicly knows a detective exists (not who)");
});

test("a 3-player game has NO detective (too small)", () => {
  const { h, players } = startedGame(3);
  const roles = players.map((p) => h.youFor(p.socket.id)?.role);
  assert.equal(roles.filter((r) => r === "murderer").length, 1);
  assert.equal(roles.filter((r) => r === "detective").length, 0);
  assert.equal(roles.filter((r) => r === "villager").length, 2);
  assert.equal(h.lastState().hasDetective, false);
});

const detOf = (h, players) => players.find((p) => h.youFor(p.socket.id)?.role === "detective");

test("detective learns the TRUTH privately: murderer → guilty, villager → innocent", () => {
  const { h, players, murdererSock } = startedGame(5);
  const det = detOf(h, players);
  assert.ok(det, "a 5-player game has a detective");
  det.send("m2:investigate", { suspectId: murdererSock.pid() });
  let f = h.youFor(det.socket.id).findings;
  assert.equal(f.length, 1);
  assert.equal(f[0].isMurderer, true, "the detective correctly fingers the murderer");
  h.advance(46000);
  const vil = players.find((p) => h.youFor(p.socket.id)?.role === "villager");
  det.send("m2:investigate", { suspectId: vil.pid() });
  f = h.youFor(det.socket.id).findings;
  assert.equal(f.length, 2);
  assert.equal(f.find((x) => x.suspectId === vil.pid()).isMurderer, false, "a villager reads innocent");
});

test("findings are PRIVATE — never in the broadcast state, never in another player's view", () => {
  const { h, players, murdererSock } = startedGame(5);
  const det = detOf(h, players);
  det.send("m2:investigate", { suspectId: murdererSock.pid() });
  const st = h.lastState();
  assert.ok(!JSON.stringify(st).includes("isMurderer"), "public state must not leak findings");
  assert.equal(st.detectiveId, undefined, "the detective's identity is hidden during play");
  const vil = players.find((p) => h.youFor(p.socket.id)?.role === "villager");
  assert.equal(h.youFor(vil.socket.id).findings, undefined, "a villager's private view has no findings");
});

test("anti-cheat: only the detective can investigate", () => {
  const { h, players, murdererSock } = startedGame(5);
  const vil = players.find((p) => h.youFor(p.socket.id)?.role === "villager");
  let before = h.emitted.length;
  vil.send("m2:investigate", { suspectId: murdererSock.pid() });
  assert.equal(h.errorsAfter(before).length, 1, "a villager cannot investigate");
  before = h.emitted.length;
  murdererSock.send("m2:investigate", { suspectId: vil.pid() });
  assert.equal(h.errorsAfter(before).length, 1, "the murderer cannot investigate");
});

test("investigate respects cooldown, rejects duplicates and self", () => {
  const { h, players } = startedGame(5);
  const det = detOf(h, players);
  const others = players.filter((p) => p !== det);
  det.send("m2:investigate", { suspectId: others[0].pid() });
  let before = h.emitted.length;
  det.send("m2:investigate", { suspectId: others[1].pid() });
  assert.equal(h.errorsAfter(before).length, 1, "cooldown blocks back-to-back investigations");
  h.advance(46000);
  before = h.emitted.length;
  det.send("m2:investigate", { suspectId: others[0].pid() });
  assert.equal(h.errorsAfter(before).length, 1, "cannot re-investigate the same person");
  h.advance(46000);
  before = h.emitted.length;
  det.send("m2:investigate", { suspectId: det.pid() });
  assert.equal(h.errorsAfter(before).length, 1, "cannot investigate yourself");
});

test("a dead detective cannot investigate; the detective counts as a victim the murderer must clear", () => {
  const { h, players, murdererSock } = startedGame(4); // murderer + detective + 2 villagers
  const det = detOf(h, players);
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId) || you.weapons[0];
  murdererSock.send("m2:kill", { victimId: det.pid(), weaponId: w.id, methodIndex: 0 });
  assert.equal(h.lastState().players.find((p) => p.id === det.pid()).alive, false, "the detective is killable");
  const before = h.emitted.length;
  det.send("m2:investigate", { suspectId: murdererSock.pid() });
  assert.equal(h.errorsAfter(before).length, 1, "a dead detective cannot investigate");
});

test("anti-cheat: a non-murderer cannot kill (server-authority)", () => {
  const { h, players, murdererSock, host } = startedGame(5);
  const villager = players.find((p) => p !== murdererSock);
  const victim = players.find((p) => p !== villager && p !== murdererSock);
  const before = h.emitted.length;
  villager.send("m2:kill", { victimId: victim.pid(), weaponId: "trowel" });
  assert.equal(h.errorsAfter(before).length, 1, "villager's kill is rejected");
  assert.equal(h.lastState().clues.length, 0, "no clue logged");
  assert.equal(h.lastState().players.find((p) => p.id === victim.pid()).alive, true, "victim still alive");
});

test("scale: a 15-player game fields a 3-murderer TEAM, and a kill lands", () => {
  const { h, players, murdererSock } = startedGame(15);
  const st = h.lastState();
  assert.equal(st.players.filter((p) => p.characterId).length, 15);
  assert.equal(players.map((p) => h.youFor(p.socket.id)?.role).filter((r) => r === "murderer").length, 3, "15 players → 3 murderers");
  const you = h.youFor(murdererSock.socket.id);
  assert.equal(you.weapons.length, 15, "framing pool covers all 15 present characters");
  assert.equal((you.allies || []).length, 2, "each murderer sees their 2 accomplices");
  const victim = players.find((p) => h.youFor(p.socket.id)?.role !== "murderer");
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  murdererSock.send("m2:kill", { victimId: victim.pid(), weaponId: w.id });
  assert.equal(h.lastState().clues.length, 1, "a kill lands at scale");
});

// --- Multiple murderers (team) ------------------------------------------------------------------
test("murderer counts scale: 1 (<8), 2 (8-13), 3 (14+); each sees their allies, villagers don't", () => {
  for (const [n, expected] of [[7, 1], [8, 2], [14, 3]]) {
    const { h, players } = startedGame(n);
    const murderers = players.filter((p) => h.youFor(p.socket.id)?.role === "murderer");
    assert.equal(murderers.length, expected, `${n} players → ${expected} murderers`);
    if (expected > 1) {
      const you = h.youFor(murderers[0].socket.id);
      assert.equal((you.allies || []).length, expected - 1, "a murderer sees the rest of the team");
    }
    const vil = players.find((p) => h.youFor(p.socket.id)?.role === "villager");
    assert.equal(h.youFor(vil.socket.id).allies, undefined, "villagers never see the murderer team");
  }
});

test("team: any murderer can kill, they share the kill count, and all count as non-villagers for the win", () => {
  const { h, players } = startedGame(8); // 2 murderers + detective + doctor + 4 villagers
  const murderers = players.filter((p) => h.youFor(p.socket.id)?.role === "murderer");
  assert.equal(murderers.length, 2);
  const victims = players.filter((p) => h.youFor(p.socket.id)?.role === "villager");
  const you0 = h.youFor(murderers[0].socket.id);
  const w0 = you0.weapons.find((x) => x.id !== you0.ownWeaponId);
  murderers[0].send("m2:kill", { victimId: victims[0].pid(), weaponId: w0.id, methodIndex: 0 });
  assert.equal(h.lastState().killCount, 1, "murderer A's kill counts");
  h.advance(76000);
  const you1 = h.youFor(murderers[1].socket.id);
  const w1 = you1.weapons.find((x) => x.id !== you1.ownWeaponId);
  murderers[1].send("m2:kill", { victimId: victims[1].pid(), weaponId: w1.id, methodIndex: 0 });
  assert.equal(h.lastState().killCount, 2, "murderer B shares the same kill count (team, not per-player)");
});

test("vote: catching ONE of two murderers does NOT end the game; catching the last does", () => {
  const { h, players, host } = startedGame(8);
  const murderers = players.filter((p) => h.youFor(p.socket.id)?.role === "murderer");
  const townVote = (suspectPid) => {
    host.send("m2:openVote");
    players.filter((p) => h.lastState().players.find((q) => q.id === p.pid())?.alive).forEach((p) => p.send("m2:vote", { suspectId: suspectPid }));
  };
  townVote(murderers[0].pid());
  assert.equal(h.lastState().phase, "playing", "one murderer caught — game continues");
  assert.equal(h.lastState().players.find((p) => p.id === murderers[0].pid()).alive, false, "the caught murderer is executed");
  townVote(murderers[1].pid());
  assert.equal(h.lastState().phase, "ended", "the last murderer caught — game over");
  assert.equal(h.lastState().winner, "town", "town wins only when ALL murderers are caught");
  assert.deepEqual((h.lastState().murdererIds || []).sort(), murderers.map((m) => m.pid()).sort(), "reveal lists the whole team");
});

test("team: must-use-own is relaxed (a murderer may frame with any set on the final kill)", () => {
  const { h, players } = startedGame(8);
  const murderers = players.filter((p) => h.youFor(p.socket.id)?.role === "murderer");
  const you = h.youFor(murderers[0].socket.id);
  assert.equal(you.mustUseOwnNow, false, "no forced-own for a team");
});

test("a kill logs a framing clue (weapon → the framed player) and downs the victim", () => {
  const { h, players, murdererSock, host } = startedGame(5);
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

// --- Identity + host authority -----------------------------------------------------------------
// These encode a live-probed breach (2026-07-17): player ids are broadcast in m2:state, and m2:join
// used to hand back any player named by id — so any player could adopt the MURDERER and read their
// private role and kill intel. In a social deduction game the secret identity IS the game.

test("anti-cheat: a player id alone cannot reclaim a player — the rejoin token is required", () => {
  const h = harness();
  const a = h.connect("a");
  a.send("m2:join", { room: "R", name: "A" });
  const victimId = h.youFor("a").id;
  const token = h.youFor("a").rejoinToken;
  assert.ok(token, "the server must issue a rejoin token on the private channel");

  // The id is public — every client already has it from m2:state.
  assert.ok(h.lastState().players.some((p) => p.id === victimId), "ids are public (that is the premise)");

  const attacker = h.connect("atk");
  const before = h.emitted.length;
  attacker.send("m2:join", { room: "R", name: "Attacker", playerId: victimId }); // no token
  assert.equal(h.errorsAfter(before).length, 1, "hijack with a bare public id is rejected");
  assert.equal(h.youFor("atk"), undefined, "the attacker receives no private view");

  const wrong = h.connect("wrong");
  const before2 = h.emitted.length;
  wrong.send("m2:join", { room: "R", name: "Wrong", playerId: victimId, rejoinToken: "not-the-token" });
  assert.equal(h.errorsAfter(before2).length, 1, "hijack with a wrong token is rejected");
});

test("the rejoin token is NEVER exposed in the broadcast state", () => {
  const h = harness();
  const a = h.connect("a");
  a.send("m2:join", { room: "R", name: "A" });
  const token = h.youFor("a").rejoinToken;
  const blob = JSON.stringify(h.lastState());
  assert.ok(!blob.includes(token), "m2:state must not leak the token that protects identity");
  assert.ok(h.lastState().players.every((p) => p.rejoinToken === undefined));
});

test("a legitimate reconnect with the right token still recovers the player and its secret role", () => {
  const { h, murdererSock } = startedGame(5);
  const you = h.youFor(murdererSock.socket.id);
  assert.equal(you.role, "murderer");

  const again = h.connect("rejoined");
  again.send("m2:join", { room: "R", name: "P0", playerId: you.id, rejoinToken: you.rejoinToken });
  const recovered = h.youFor("rejoined");
  assert.equal(recovered?.id, you.id, "same player restored");
  assert.equal(recovered?.role, "murderer", "secret role recovered — the reconnect path still works");
});

test("anti-cheat: a player socket cannot run host actions (start / reset / vote control)", () => {
  const h = harness();
  const a = h.connect("a"); a.send("m2:join", { room: "R", name: "A" }); a.send("m2:pick", { characterId: "sam" });
  const b = h.connect("b"); b.send("m2:join", { room: "R", name: "B" }); b.send("m2:pick", { characterId: "allen" });
  const c = h.connect("c"); c.send("m2:join", { room: "R", name: "C" }); c.send("m2:pick", { characterId: "eugene" });

  let before = h.emitted.length;
  a.send("m2:start"); // a player, not the controller
  assert.equal(h.errorsAfter(before).length, 1, "a player cannot start the game");
  assert.equal(h.lastState().phase, "lobby", "the game did not start");

  const host = h.connect("host", true);
  host.send("m2:start");
  assert.equal(h.lastState().phase, "playing", "the real host can start");

  before = h.emitted.length;
  b.send("m2:reset", {}); // the probe's griefing vector
  assert.equal(h.errorsAfter(before).length, 1, "a player cannot reset the game");
  assert.equal(h.lastState().phase, "playing", "the game was not wiped");

  before = h.emitted.length;
  c.send("m2:openVote");
  assert.equal(h.errorsAfter(before).length, 1, "a player cannot call a town meeting");
  assert.equal(h.lastState().phase, "playing");
});

// --- Doctor role --------------------------------------------------------------------------------
const docOf = (h, players) => players.find((p) => h.youFor(p.socket.id)?.role === "doctor");

test("a 6-player game assigns murderer + detective + doctor + 3 villagers; a 5-player game has no doctor", () => {
  const g = startedGame(6);
  const roles = g.players.map((p) => g.h.youFor(p.socket.id)?.role);
  assert.equal(roles.filter((r) => r === "murderer").length, 1);
  assert.equal(roles.filter((r) => r === "detective").length, 1);
  assert.equal(roles.filter((r) => r === "doctor").length, 1);
  assert.equal(roles.filter((r) => r === "villager").length, 3);
  assert.equal(g.h.lastState().hasDoctor, true);
  const g5 = startedGame(5);
  assert.equal(g5.players.map((p) => g5.h.youFor(p.socket.id)?.role).filter((r) => r === "doctor").length, 0);
  assert.equal(g5.h.lastState().hasDoctor, false);
});

test("the doctor's shield BLOCKS the attack on that target — no death, no clue, but the turn is spent", () => {
  const { h, players, murdererSock } = startedGame(6);
  const doctor = docOf(h, players);
  const you = h.youFor(murdererSock.socket.id);
  const target = players.find((p) => p !== murdererSock && p !== doctor && h.youFor(p.socket.id)?.role === "villager");
  doctor.send("m2:protect", { targetId: target.pid() });
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId) || you.weapons[0];
  const before = h.emitted.length;
  murdererSock.send("m2:kill", { victimId: target.pid(), weaponId: w.id, methodIndex: 0 });
  assert.equal(h.lastState().players.find((p) => p.id === target.pid()).alive, true, "protected target survives");
  assert.equal(h.lastState().clues.length, 0, "a saved attack logs no clue");
  assert.ok(h.emitted.slice(before).some((e) => e.ev === "m2:announce" && e.payload?.type === "saved"), "a 'saved' moment announces");
  // shield is consumed: after cooldown, the same target can be killed
  h.advance(76000);
  murdererSock.send("m2:kill", { victimId: target.pid(), weaponId: w.id, methodIndex: 0 });
  assert.equal(h.lastState().players.find((p) => p.id === target.pid()).alive, false, "shield was one-use — the next attack lands");
});

test("the protected target is SECRET — not in the broadcast state; only the doctor sees it", () => {
  const { h, players } = startedGame(6);
  const doctor = docOf(h, players);
  const target = players.find((p) => p !== doctor);
  doctor.send("m2:protect", { targetId: target.pid() });
  assert.ok(!JSON.stringify(h.lastState()).includes("protectedId"), "public state must not carry the shield");
  assert.equal(h.youFor(doctor.socket.id).protectingId, target.pid(), "the doctor sees their own shield");
  const vil = players.find((p) => h.youFor(p.socket.id)?.role === "villager");
  assert.equal(h.youFor(vil.socket.id).protectingId, undefined, "others cannot see the shield");
});

test("anti-cheat: only the doctor protects; cooldown enforced; a dead doctor cannot", () => {
  const { h, players, murdererSock } = startedGame(6);
  const doctor = docOf(h, players);
  const vil = players.find((p) => h.youFor(p.socket.id)?.role === "villager");
  let before = h.emitted.length;
  vil.send("m2:protect", { targetId: doctor.pid() });
  assert.equal(h.errorsAfter(before).length, 1, "a villager cannot protect");
  doctor.send("m2:protect", { targetId: vil.pid() });
  before = h.emitted.length;
  doctor.send("m2:protect", { targetId: vil.pid() });
  assert.equal(h.errorsAfter(before).length, 1, "cooldown blocks back-to-back protection");
  // kill the doctor, then a dead doctor's protect is rejected
  h.advance(76000);
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId) || you.weapons[0];
  murdererSock.send("m2:kill", { victimId: doctor.pid(), weaponId: w.id, methodIndex: 0 });
  assert.equal(h.lastState().players.find((p) => p.id === doctor.pid()).alive, false, "the doctor is killable");
  before = h.emitted.length;
  doctor.send("m2:protect", { targetId: murdererSock.pid() });
  assert.equal(h.errorsAfter(before).length, 1, "a dead doctor cannot protect");
});

// --- Scoring across rounds ----------------------------------------------------------------------
test("scoring: a town win gives the winning side +3, survivors +1, detective +2 for a correct finding", () => {
  const { h, players, murdererSock, host } = startedGame(5); // murderer + detective + 3 villagers
  const detective = players.find((p) => h.youFor(p.socket.id)?.role === "detective");
  const villager = players.find((p) => h.youFor(p.socket.id)?.role === "villager");
  detective.send("m2:investigate", { suspectId: murdererSock.pid() }); // correct finding
  host.send("m2:openVote");
  players.filter((p) => h.lastState().players.find((q) => q.id === p.pid())?.alive).forEach((p) => p.send("m2:vote", { suspectId: murdererSock.pid() }));
  const st = h.lastState();
  assert.equal(st.winner, "town");
  assert.equal(st.scores[murdererSock.pid()] || 0, 0, "the caught (dead, losing) murderer scores 0");
  assert.equal(st.scores[villager.pid()], 4, "villager: +3 win, +1 survived");
  assert.equal(st.scores[detective.pid()], 6, "detective: +3 +1 +2 for correctly fingering the murderer");
});

test("scoring: round increments each start; scores persist over a soft reset, clear on a full reset", () => {
  const { h, players, murdererSock, host } = startedGame(5);
  assert.equal(h.lastState().round, 1);
  host.send("m2:openVote");
  players.filter((p) => h.lastState().players.find((q) => q.id === p.pid())?.alive).forEach((p) => p.send("m2:vote", { suspectId: murdererSock.pid() }));
  const afterR1 = { ...h.lastState().scores };
  assert.ok(Object.values(afterR1).some((v) => v > 0), "round 1 scored");
  host.send("m2:reset", {}); // soft reset → next round
  assert.deepEqual(h.lastState().scores, afterR1, "scores persist through a soft reset (running tournament)");
  host.send("m2:start");
  assert.equal(h.lastState().round, 2, "round bumps on the next start");
  host.send("m2:reset", { full: true });
  assert.deepEqual(h.lastState().scores, {}, "a full reset clears the board");
  assert.equal(h.lastState().round, 0);
});

// --- Dying clue (last words) --------------------------------------------------------------------
const killOne = (h, players, murdererSock) => {
  const you = h.youFor(murdererSock.socket.id);
  const victim = players.find((p) => p !== murdererSock && h.youFor(p.socket.id)?.role !== "murderer");
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId) || you.weapons[0];
  murdererSock.send("m2:kill", { victimId: victim.pid(), weaponId: w.id, methodIndex: 0 });
  return victim;
};

test("a killed player may leave last words once — public, trimmed, and locked after", () => {
  const { h, players, murdererSock } = startedGame(5);
  const victim = killOne(h, players, murdererSock);
  assert.equal(h.lastState().players.find((p) => p.id === victim.pid()).alive, false);
  victim.send("m2:lastWords", { text: "   It was the Doctor!   " });
  assert.equal(h.lastState().players.find((p) => p.id === victim.pid()).lastWords, "It was the Doctor!", "trimmed + public in broadcast state");
  const before = h.emitted.length;
  victim.send("m2:lastWords", { text: "actually the Baker" });
  assert.equal(h.errorsAfter(before).length, 1, "speaking twice is rejected");
  assert.equal(h.lastState().players.find((p) => p.id === victim.pid()).lastWords, "It was the Doctor!", "first message stands");
});

test("anti-cheat: a LIVING player cannot leave last words", () => {
  const { h, players, murdererSock } = startedGame(5);
  const alive = players.find((p) => p !== murdererSock);
  const before = h.emitted.length;
  alive.send("m2:lastWords", { text: "I'm not even dead" });
  assert.equal(h.errorsAfter(before).length, 1);
  assert.equal(h.lastState().players.find((p) => p.id === alive.pid()).lastWords, null);
});

test("last words: empty is ignored (not locked), long is capped to 120 chars", () => {
  const { h, players, murdererSock } = startedGame(5);
  const victim = killOne(h, players, murdererSock);
  victim.send("m2:lastWords", { text: "   " });
  assert.equal(h.lastState().players.find((p) => p.id === victim.pid()).lastWords, null, "empty ignored, still able to speak");
  victim.send("m2:lastWords", { text: "x".repeat(200) });
  assert.equal(h.lastState().players.find((p) => p.id === victim.pid()).lastWords.length, 120, "capped");
});

// --- Item-set model (founder's manifest): the set frames the suspect, the method is the story ----

test("the murderer's chosen method is recorded on the clue, and the set still frames its owner", () => {
  const { h, players, murdererSock, host } = startedGame(5);
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
    const { h, players, murdererSock, host } = startedGame(5);
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
  const { h, players, murdererSock, host } = startedGame(5);
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
  const { h, players, murdererSock, host } = startedGame(5);
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
  const { h, players, murdererSock, host } = startedGame(5);
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
  const { h, players, murdererSock, host } = startedGame(5);
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
  const { h, players, murdererSock, host } = startedGame(5);
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
  const { h, players, murdererSock, host } = startedGame(5);
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
  const { h, players, murdererSock, host } = startedGame(3); // 1 murderer + 2 villagers, target defaults to 4
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
  g.host.send("m2:openVote");
  const innocent = vills[1];
  [g.murdererSock, vills[2], vills[3]].forEach((p) => p.send("m2:vote", { suspectId: innocent.pid() }));
  g.host.send("m2:closeVote"); // host closes → resolve
  const st = g.h.lastState();
  assert.equal(st.phase, "playing"); // wrong guess → back to playing
  assert.equal(st.players.find((p) => p.id === innocent.pid()).cleared, true);
  // Reward: cooldown was shortened to ~30s. At +31s the next kill is allowed (would be blocked at 75s).
  g.h.advance(31_000);
  g.murdererSock.send("m2:kill", { victimId: vills[2].pid(), weaponId: w.id }); // w's 2nd use
  assert.equal(g.h.lastState().clues.length, 2, "shortened cooldown let the next kill through at +31s");
});

test("voting: a split with no majority resolves with no effect (back to playing)", () => {
  const { h, players, murdererSock, host } = startedGame(5);
  void murdererSock;
  host.send("m2:openVote");
  const A = players[2].pid(), B = players[3].pid();
  players[0].send("m2:vote", { suspectId: A });
  players[1].send("m2:vote", { suspectId: A }); // 2 for A
  players[2].send("m2:vote", { suspectId: B });
  players[4].send("m2:vote", { suspectId: B }); // 2 for B; player 3 abstains → not all voted
  host.send("m2:closeVote");
  const st = h.lastState();
  assert.equal(st.phase, "playing"); // 2 vs 2 of 5 → no majority
  assert.equal(st.winner, null);
  assert.ok(st.players.every((p) => !p.cleared), "no one is cleared on a no-majority vote");
});

test("anti-cheat: the dead cannot vote and no one votes twice", () => {
  const { h, players, murdererSock, host } = startedGame(5);
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  const dead = players.find((p) => p !== murdererSock);
  murdererSock.send("m2:kill", { victimId: dead.pid(), weaponId: w.id });
  const alive1 = players.find((p) => p !== murdererSock && p !== dead);
  host.send("m2:openVote"); // the host opens the meeting; the murderer is alive and may vote

  let before = h.emitted.length;
  dead.send("m2:vote", { suspectId: murdererSock.pid() }); // dead → rejected
  assert.equal(h.errorsAfter(before).length, 1, "the dead cannot vote");

  alive1.send("m2:vote", { suspectId: murdererSock.pid() }); // living vote accepted
  before = h.emitted.length;
  alive1.send("m2:vote", { suspectId: murdererSock.pid() }); // second time → rejected
  assert.equal(h.errorsAfter(before).length, 1, "no double voting");
});

test("rule interaction: a cleared suspect is immune from RE-voting but the murderer can still kill them", () => {
  const { h, players, murdererSock, host } = startedGame(5);
  const innocent = players.find((p) => p !== murdererSock);
  // Wrong majority clears the innocent.
  host.send("m2:openVote");
  players.slice(0, 3).forEach((p) => p.send("m2:vote", { suspectId: innocent.pid() }));
  host.send("m2:closeVote");
  assert.equal(h.lastState().players.find((p) => p.id === innocent.pid()).cleared, true);
  // Re-open: the cleared player cannot be voted again.
  host.send("m2:openVote");
  const before = h.emitted.length;
  players[1].send("m2:vote", { suspectId: innocent.pid() });
  assert.equal(h.errorsAfter(before).length, 1, "cleared suspect is rejected from voting");
  host.send("m2:closeVote");
  // But clearing is vote-immunity only — the murderer can still kill them.
  const you = h.youFor(murdererSock.socket.id);
  const w = you.weapons.find((x) => x.id !== you.ownWeaponId);
  murdererSock.send("m2:kill", { victimId: innocent.pid(), weaponId: w.id });
  assert.equal(h.lastState().players.find((p) => p.id === innocent.pid()).alive, false, "a cleared player can still be murdered");
});

test("full game arc: kill → clue → wrong vote (clear+reward) → reward-cooldown kill → correct vote → town wins", () => {
  const { h, players, murdererSock, host } = startedGame(5);
  const own = h.youFor(murdererSock.socket.id).ownWeaponId;
  const vills = players.filter((p) => p !== murdererSock);
  const otherWeapon = () => h.youFor(murdererSock.socket.id).weapons.find((x) => x.id !== own && x.remaining > 0);

  murdererSock.send("m2:kill", { victimId: vills[0].pid(), weaponId: otherWeapon().id }); // kill 1
  assert.equal(h.lastState().clues.length, 1);

  host.send("m2:openVote"); // town meeting → wrongly clears vills[1]
  [murdererSock, vills[2], vills[3]].forEach((p) => p.send("m2:vote", { suspectId: vills[1].pid() }));
  host.send("m2:closeVote");
  assert.equal(h.lastState().players.find((p) => p.id === vills[1].pid()).cleared, true);

  h.advance(31_000); // reward shortened the cooldown → next kill lands before the full 75s
  murdererSock.send("m2:kill", { victimId: vills[2].pid(), weaponId: otherWeapon().id }); // kill 2
  assert.equal(h.lastState().clues.length, 2);

  host.send("m2:openVote"); // alive: murderer + cleared-but-alive vills[1] + vills[3]
  [vills[1], vills[3]].forEach((p) => p.send("m2:vote", { suspectId: murdererSock.pid() })); // 2 of 3 → majority
  host.send("m2:closeVote");
  const st = h.lastState();
  assert.equal(st.phase, "ended");
  assert.equal(st.winner, "town");
});

test("voting: a correct majority on the murderer wins for the town", () => {
  const g = startedGame(5);
  const vills = g.players.filter((p) => p !== g.murdererSock);
  g.host.send("m2:openVote");
  vills.slice(0, 3).forEach((p) => p.send("m2:vote", { suspectId: g.murdererSock.pid() }));
  g.host.send("m2:closeVote");
  const st = g.h.lastState();
  assert.equal(st.phase, "ended");
  assert.equal(st.winner, "town");
});
