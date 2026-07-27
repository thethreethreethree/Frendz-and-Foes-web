// Integration test for the relay server: snapshot fan-out, late-join catch-up, and pulses.
// Run with: node --test test/sync.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { io as ioc } from "socket.io-client";

process.env.PORT = "8799";
await import("../apps/server/index.js"); // boots the relay on PORT
const URL = "http://localhost:8799";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const connected = (s) => new Promise((res) => s.on("connect", res));
const nextEvent = (s, ev) => new Promise((res) => s.once(ev, res));
const client = () => ioc(URL, { transports: ["websocket"], forceNew: true });

test("snapshot relays host → display", async () => {
  const host = client();
  const disp = client();
  await Promise.all([connected(host), connected(disp)]);
  disp.emit("join", { room: "ROOM1", role: "display" });
  host.emit("join", { room: "ROOM1", role: "host" });
  await delay(40);

  const got = nextEvent(disp, "sync");
  host.emit("sync", { state: { phase: "playing" }, buzzersArmed: true });
  const snap = await got;

  assert.equal(snap.buzzersArmed, true);
  assert.equal(snap.state.phase, "playing");
  host.close();
  disp.close();
});

test("late joiner catches up with the stored snapshot", async () => {
  const host = client();
  await connected(host);
  host.emit("join", { room: "ROOM2", role: "host" });
  host.emit("sync", { state: { phase: "finished" }, buzzersArmed: false });
  await delay(40);

  const disp = client();
  await connected(disp);
  const got = nextEvent(disp, "sync");
  disp.emit("join", { room: "ROOM2", role: "display" });
  const snap = await got;

  assert.equal(snap.state.phase, "finished");
  host.close();
  disp.close();
});

test("pulses relay but are not stored", async () => {
  const host = client();
  const disp = client();
  await Promise.all([connected(host), connected(disp)]);
  disp.emit("join", { room: "ROOM3", role: "display" });
  host.emit("join", { room: "ROOM3", role: "host" });
  await delay(40);

  const got = nextEvent(disp, "pulse");
  host.emit("pulse", { kind: "sfx", name: "ding" });
  const pulse = await got;

  assert.equal(pulse.kind, "sfx");
  assert.equal(pulse.name, "ding");
  host.close();
  disp.close();
});

test("presence reports peers in a room", async () => {
  const host = client();
  await connected(host);
  const got = nextEvent(host, "presence");
  host.emit("join", { room: "ROOM4", role: "host" });
  const p = await got;
  assert.equal(p.host, 1);
  host.close();
  // Give the server a tick to process disconnect cleanly.
  await delay(20);
});

// --- Phone-first Frendz and Foes: team answer-phones + the host trust boundary ----------------

test("a team answer submits an intent that reaches the host only (not other teams)", async () => {
  const host = client();
  const answerer = client();
  const viewer = client();
  await Promise.all([connected(host), connected(answerer), connected(viewer)]);
  host.emit("join", { room: "ROOM5", role: "host" });
  answerer.emit("join", { room: "ROOM5", role: "answerer", teamId: "t1" });
  viewer.emit("join", { room: "ROOM5", role: "viewer", teamId: "t1" });
  await delay(40);

  let viewerGot = false;
  viewer.on("intent", () => { viewerGot = true; });

  const got = nextEvent(host, "intent");
  answerer.emit("intent", { teamId: "t1", kind: "guess", text: "sandals" });
  const intent = await got;

  assert.equal(intent.teamId, "t1");
  assert.equal(intent.text, "sandals");
  await delay(30);
  assert.equal(viewerGot, false, "a viewer must not receive another team's guesses");

  host.close();
  answerer.close();
  viewer.close();
});

test("a non-host peer cannot broadcast game state (sync is host-only)", async () => {
  const attacker = client();
  await connected(attacker);
  attacker.emit("join", { room: "ROOM6", role: "answerer", teamId: "t1" });
  attacker.emit("sync", { state: { phase: "hacked" }, buzzersArmed: false, scoresVisible: true });
  await delay(40);

  // A display joining later must NOT receive a stored snapshot from the non-host.
  const disp = client();
  await connected(disp);
  let got = null;
  disp.on("sync", (s) => { got = s; });
  disp.emit("join", { room: "ROOM6", role: "display" });
  await delay(40);

  assert.equal(got, null, "the relay must reject a non-host's snapshot");
  attacker.close();
  disp.close();
});

test("an answerer's intent is ignored if it comes from a non-answerer role", async () => {
  const host = client();
  const spectator = client();
  await Promise.all([connected(host), connected(spectator)]);
  host.emit("join", { room: "ROOM6B", role: "host" });
  spectator.emit("join", { room: "ROOM6B", role: "spectator" });
  await delay(40);

  let hostGot = false;
  host.on("intent", () => { hostGot = true; });
  spectator.emit("intent", { teamId: "t1", kind: "guess", text: "nope" });
  await delay(40);

  assert.equal(hostGot, false, "only answerer-role peers may submit intents");
  host.close();
  spectator.close();
});

test("presence reports per-team answerer/viewer counts", async () => {
  const host = client();
  const answerer = client();
  await Promise.all([connected(host), connected(answerer)]);
  host.emit("join", { room: "ROOM7", role: "host" });
  let p = null;
  host.on("presence", (x) => { p = x; });
  answerer.emit("join", { room: "ROOM7", role: "answerer", teamId: "t1" });
  await delay(40);

  assert.equal(p.answerer, 1);
  assert.equal(p.teams.t1.answerers, 1);
  assert.equal(p.teams.t1.viewers, 0);
  host.close();
  answerer.close();
  await delay(20);
});
