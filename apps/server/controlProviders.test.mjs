// Can every game's host controller actually MOUNT?
//
// WHY THIS EXISTS: five of the fourteen host controllers crashed on open with "Unexpected
// Application Error! useConnection must be used within a provider" -- After Dark, Sketch Relay,
// Ballpark, Solo Clue and Cover Ops. Each renders StatusPill, StatusPill calls useConnection, and
// useConnection THROWS when no ConnectionCtx is above it. The store-based games get that context
// from their store; those five are built on plain hooks and had no store, so nothing supplied it.
//
// Every existing test passed. The server was blameless -- a full After Dark round plays through
// against the live server. The display and player surfaces looked fine because they import only QR,
// which reads no context. Only the CONTROLLER route crashed, and only in a browser.
//
// So this walks ControlRoute the way React does: for each `game === "..."` branch, find what it
// renders, follow that component to its source, and if that component (or anything it renders)
// needs the connection context, require a Provider in the branch. It DERIVES the list rather than
// hard-coding the five that were broken, so a fifteenth game added tomorrow is covered too.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..", "web", "src");

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

// --- index every component source under apps/web/src -----------------------------------------
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(name)) files.push(p);
  }
})(WEB);

const src = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

/** Which components does this file export? */
const exportsOf = (text) =>
  [...text.matchAll(/export\s+(?:default\s+)?function\s+([A-Z]\w*)/g)].map((m) => m[1]);

const fileForComponent = new Map();
for (const [f, text] of src) for (const name of exportsOf(text)) if (!fileForComponent.has(name)) fileForComponent.set(name, f);

// --- which components need ConnectionCtx, directly or through what they render -----------------
// StatusPill/DisplayPairing/ControlPairButton call useConnection. Anything rendering one of those
// needs a provider above it, so the need propagates upward until it stops changing.
const DIRECT = ["StatusPill", "DisplayPairing", "ControlPairButton"];
const needs = new Set(DIRECT);
for (let changed = true; changed; ) {
  changed = false;
  for (const [f, text] of src) {
    for (const name of exportsOf(text)) {
      if (needs.has(name)) continue;
      const rendersNeedy = [...needs].some((n) => new RegExp(`<${n}[\\s/>]`).test(text));
      if (rendersNeedy || /\buseConnection\s*\(/.test(text)) { needs.add(name); changed = true; }
    }
  }
}
check("the context-hungry components were identified", needs.size > DIRECT.length,
      `found ${needs.size}: ${[...needs].slice(0, 8).join(", ")}`);

// --- walk ControlRoute's branches --------------------------------------------------------------
const control = readFileSync(join(WEB, "routes", "ControlRoute.tsx"), "utf8");
const branches = [...control.matchAll(/if \(game === "(\w+)"\) \{([\s\S]*?)\n  \}/g)];
check("ControlRoute branches were parsed", branches.length >= 10, `${branches.length} found`);

let audited = 0;
for (const [, game, body] of branches) {
  // What does this branch render? Any capitalised JSX tag in it.
  const rendered = [...new Set([...body.matchAll(/<([A-Z]\w*)[\s/>]/g)].map((m) => m[1]))];
  const hungry = rendered.filter((r) => needs.has(r));
  if (hungry.length === 0) continue;
  audited++;
  const hasProvider = /Provider[\s>]/.test(body);
  check(`"${game}" host controller has a connection provider`, hasProvider,
        `renders ${hungry.join(", ")} with no Provider -- this is the crash-on-open bug`);
}
check("several controllers were actually audited", audited >= 5, `${audited} branches needed one`);

// --- the provider itself must supply the whole shape StatusPill destructures ---------------------
// A provider that omits a field would swap a loud crash for a quietly wrong status pill.
const provider = readFileSync(join(WEB, "net", "SocketConnection.tsx"), "utf8");
for (const field of ["connected", "presence", "room", "role"]) {
  check(`the socket provider supplies "${field}"`, new RegExp(`${field}[,:}]`).test(provider));
}
// The socket is normally connected BEFORE this mounts, so waiting only for the "connect" event
// would leave the pill reading "Offline" for the whole session.
check("it seeds connected state instead of waiting for an event that already fired",
      /setConnected\(s\.connected\)/.test(provider));

// --- the host QR must NAME its game, never sniff it ------------------------------------------------
// getGameFromUrl() returns "feud" for a missing or unrecognised param, and ControlRoute's final
// fall-through renders Feud. controllerUrl() used to call it, so a display whose URL had lost its
// game param minted a "SCAN TO HOST" QR pointing at the wrong game -- silently, with no error
// anywhere. The owner hit exactly that: a Trivia QR that opened a broken Feud screen.
const roomSrc = readFileSync(join(WEB, "net", "room.ts"), "utf8");
const ctl = roomSrc.slice(roomSrc.indexOf("export function controllerUrl"));
const ctlBody = ctl.slice(0, ctl.indexOf("\n}"));
check("controllerUrl takes the game as an argument",
      /export function controllerUrl\(room: string, game: GameType\)/.test(ctl),
      "sniffing the ambient URL is what pointed a Trivia QR at Feud");
check("and never falls back to reading it from the URL",
      !/getGameFromUrl/.test(ctlBody),
      'defaulting to "feud" is a silent wrong answer, not a safe one');

const pairingSrc = readFileSync(join(WEB, "net", "pairing.tsx"), "utf8");
check("DisplayPairing requires a game", /DisplayPairing\(\{ game \}/.test(pairingSrc));
check("HostQR requires a game", /HostQR\(\{ room, game \}/.test(pairingSrc));
const displaySrc = readFileSync(join(WEB, "routes", "DisplayRoute.tsx"), "utf8");
check("no DisplayPairing is rendered without one", !/<DisplayPairing \/>/.test(displaySrc),
      "a bare <DisplayPairing /> is the old bug");

// --- a typed room code must be ROUTED BY THE ROOM, not by a default -------------------------------
// The display invites typing ("or enter room code 8NAC"), but a typed code carries no game, and
// PlayerRoute resolved one from the URL -- i.e. from getGameFromUrl's default -- so a player joining
// a Trivia night by code was silently dropped into a different game. Same class as the QR bug, on
// the side where most of the people are.
const playerSrc = readFileSync(join(WEB, "routes", "PlayerRoute.tsx"), "utf8");
check("PlayerRoute asks the server which game a bare room code is running",
      /api\/room\//.test(playerSrc),
      "routing a typed code by a default is a guess wearing a confident face");
check("and does not render a guessed game while that answer is in flight",
      /Finding room/.test(playerSrc));

// The endpoint has to sit ABOVE the SPA catch-all or Express never reaches it and the fetch quietly
// gets index.html back. That is exactly how it was written the first time; the probe caught it only
// because it tried to JSON.parse "<!doctype html>".
const serverSrc = readFileSync(join(HERE, "index.js"), "utf8");
// Match REGISTRATIONS, not prose: the comment above the endpoint mentions app.get("*") by name,
// and a naive indexOf finds that documentation first and reports the opposite of the truth.
const at = (re) => { const m = serverSrc.match(re); return m ? m.index : -1; };
const roomRoute = at(/^\s*app\.get\("\/api\/room\/:code"/m);
const catchAll = at(/^\s*app\.get\("\*"/m);
check("the room lookup endpoint exists", roomRoute > -1);
check("and is registered BEFORE the SPA catch-all", roomRoute > -1 && catchAll > -1 && roomRoute < catchAll,
      "registered after it, every request returns index.html instead of JSON");
check("only a host or display may set a room's game",
      /role === "host" \|\| socket\.data\.role === "display"[\s\S]{0,120}r\.game = game/.test(serverSrc),
      "a player phone must never relabel the room out from under everyone");

console.log(fails ? `\n${fails} FAILED` : "\nall control-route provider checks passed");
process.exit(fails ? 1 : 0);
