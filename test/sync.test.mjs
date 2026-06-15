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
