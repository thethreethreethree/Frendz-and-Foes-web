// The room-scoped founder pass — the gate that lets the OWNER test a party game on a locked site.
//
// The founder pass is per-BROWSER, and a party test is by definition several browsers: a television,
// the host's phone, and a guest's phone. A guest scanning the host's QR hit the waitlist page, so
// the only ways to test were to hand testers the admin passcode (which is also the superadmin
// override header on every founder endpoint) or to set GAMES_OPEN=true and give the product away
// before the campaign. Neither is acceptable, so access became room-scoped.
//
// This file exists to prove the gate did not simply come off. The interesting assertions are the
// NEGATIVE ones: an unmarked room must stay shut, and a guest must never be able to mark one.
process.env.GAMES_OPEN = "false";
process.env.ENFORCE_ENTITLEMENTS = "false";
process.env.ADMIN_PASSCODE = "test-passcode-do-not-ship";
process.env.AUTH_SECRET = "test-secret-do-not-ship";
process.env.PORT = process.env.PORT || "8123";

import { test } from "node:test";
import assert from "node:assert/strict";
import { io as ioc } from "socket.io-client";

await import("../apps/server/index.js");
const BASE = `http://127.0.0.1:${process.env.PORT}`;
await new Promise((r) => setTimeout(r, 600));

const status = async (room) =>
  (await fetch(room ? `${BASE}/api/status?room=${encodeURIComponent(room)}` : `${BASE}/api/status`)).json();

/** Join once and report what the server did: "locked" or "in". */
function tryJoin({ room, role, cookie }) {
  return new Promise((resolve) => {
    const sock = ioc(BASE, {
      transports: ["websocket"],
      extraHeaders: cookie ? { Cookie: cookie } : {},
      forceNew: true,
    });
    let done = false;
    const finish = (v) => { if (!done) { done = true; sock.close(); resolve(v); } };
    sock.on("locked", () => finish("locked"));
    sock.on("state", () => finish("in"));
    sock.on("presence", () => finish("in"));
    sock.on("connect", () => sock.emit("join", { room, role, game: "feud" }));
    setTimeout(() => finish("in"), 1200); // no refusal arrived => the join was accepted
  });
}

test("the public gate is shut, and an unknown room is not a way round it", async () => {
  const s = await status();
  assert.equal(s.gamesOpen, false, "GAMES_OPEN must be false for this file to prove anything");
  assert.equal(s.roomOpen, false, "no room asked about -> not open");

  const unknown = await status("ZZZZ");
  assert.equal(unknown.roomOpen, false, "a room nobody hosts must answer false");

  assert.equal(await tryJoin({ room: "ZZZZ", role: "player" }), "locked");
  assert.equal(await tryJoin({ room: "ZZZZ", role: "host" }), "locked");
});

test("a guest cannot mark a room open by joining it", async () => {
  // The whole privilege must originate from the owner's browser. If a passcode-less socket could
  // mark a room simply by claiming role:"host", the gate would be decorative.
  await tryJoin({ room: "GST1", role: "host" });
  await tryJoin({ room: "GST1", role: "display" });
  assert.equal((await status("GST1")).roomOpen, false, "a guest must never mark a room");
  assert.equal(await tryJoin({ room: "GST1", role: "player" }), "locked");
});

test("the founder's own room admits a guest who has no cookie at all", async () => {
  // 1. The owner exchanges the passcode for a signed pass.
  const res = await fetch(`${BASE}/api/founder/pass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passcode: process.env.ADMIN_PASSCODE }),
  });
  assert.equal(res.status, 200);
  const setCookie = res.headers.get("set-cookie");
  assert.ok(setCookie, "a pass must be issued");
  const cookie = setCookie.split(";")[0];

  // 2. The owner's phone hosts a room.
  assert.equal(await tryJoin({ room: "OWN1", role: "host", cookie }), "in");

  // 3. That room — and only that room — is now open to anyone.
  assert.equal((await status("OWN1")).roomOpen, true, "the hosted room is open");
  assert.equal((await status("OWN2")).roomOpen, false, "a room next door is not");

  // 4. A guest with NO cookie joins it and plays.
  assert.equal(await tryJoin({ room: "OWN1", role: "player" }), "in");

  // 5. The public gate has not moved for anyone else.
  const s = await status();
  assert.equal(s.gamesOpen, false);
  assert.equal(s.founder, false, "a cookieless caller is not the founder");
  assert.equal(await tryJoin({ room: "OWN2", role: "player" }), "locked");
});

test("a wrong passcode issues nothing", async () => {
  const res = await fetch(`${BASE}/api/founder/pass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passcode: "not-the-passcode" }),
  });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("set-cookie"), null);
});
