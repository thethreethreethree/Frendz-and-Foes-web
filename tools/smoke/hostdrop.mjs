// Does the big screen stay on the GAME when the host's phone drops for a moment?
//
// WHY THIS EXISTS. `DisplayPairing` computed "is a host attached" from the socket's current state
// and put a FULL-SCREEN QR over the television whenever that was false. Mid-game that is false
// constantly, for reasons that are not failures: the host's phone locks, Safari backgrounds the
// tab, the wifi blips, the host reloads their controller, or the display's own socket reconnects.
// The server deletes the host's peer the instant their socket drops and re-broadcasts presence with
// host:0, so the takeover was immediate. The owner hit it live: "the game qr code showed up while i
// was in the middle of a test".
//
// Nothing could have caught this without a browser and a real disconnect. The surface sweep loads a
// page and asks whether it rendered; this needs a page that rendered, a host that arrived, and a
// host that then went away.
//
// THE TEST: display joins a room, a host socket joins the same room, the display must leave the
// pairing card; the host socket then drops, and for the whole grace window the display must still
// be showing the game — not "SCAN TO HOST".
//
// Usage: node tools/smoke/hostdrop.mjs [baseUrl]
import { spawn } from "node:child_process";
import WebSocket from "ws";
import { io as ioc } from "socket.io-client";

const BASE = process.argv[2] || "http://127.0.0.1:8099";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9377;
const ROOM = "HD" + Math.floor(10 + Math.random() * 89);
const GAME = "feud";
// Shorter than DisplayPairing's 45s grace: we are asserting the screen survives a BLIP, and the
// whole point is that the card must not return during it.
const WATCH_MS = 8000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "/pzhostdrop" + Date.now(),
  "about:blank"], { stdio: "ignore" });
await sleep(3000);

let page = null;
for (let i = 0; i < 20 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); }
  catch { await sleep(500); }
}
if (!page) { console.error("could not attach to Chrome at", CHROME); process.exit(2); }

const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise((r) => ws.on("open", r));
let id = 0; const pending = new Map();
ws.on("message", (raw) => { const m = JSON.parse(raw); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (m, p = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method: m, params: p })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

const bodyText = () => ev("document.body ? document.body.innerText : ''");
const showsCard = async () => /SCAN TO HOST/i.test((await bodyText()) || "");

// Wait for the APP, not for a timeout. An empty body makes every assertion below meaningless and
// silently truthy: showsCard() is false on a blank page, so "the card cleared" would pass for a
// page that never rendered. A guard that can pass because nothing loaded is not a guard.
async function waitForApp(what) {
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const booted = await ev(`!!document.querySelector('#root')?.firstElementChild`);
    const text = (await bodyText()) || "";
    if (booted && text.trim().length > 8) return true;
  }
  console.error(`ABORT: ${what} never rendered — cannot test anything on a blank page.`);
  ws.close(); chrome.kill();
  process.exit(2);
}

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
  if (!ok) failed++;
};

// 1. Open the display. With no host anywhere, the pairing card SHOULD be up — that is its job.
await send("Page.navigate", { url: `${BASE}/?room=${ROOM}&game=${GAME}#/display` });
await waitForApp("the display");
let up = false;
for (let i = 0; i < 12 && !up; i++) { await sleep(500); up = await showsCard(); }
check("with no host, the display asks to be paired", up,
      up ? `room ${ROOM}` : `room ${ROOM}; saw: ${((await bodyText()) || "<empty>").replace(/\s+/g, " ").slice(0, 90)}`);

// 2. A host arrives.
const host = ioc(BASE, { transports: ["websocket"], forceNew: true });
await new Promise((r) => host.on("connect", r));
host.emit("join", { room: ROOM, role: "host", game: GAME });

// Require the app to still be rendering, not merely for the string to be absent.
let cleared = false;
for (let i = 0; i < 15 && !cleared; i++) {
  await sleep(700);
  const text = (await bodyText()) || "";
  cleared = text.trim().length > 8 && !/SCAN TO HOST/i.test(text);
}
check("a host arriving clears the pairing card", cleared);

if (!cleared) {
  console.log("\ncannot test the drop without a linked host first");
  ws.close(); chrome.kill(); host.close();
  process.exit(1);
}

// 3. THE POINT OF THE FILE. The host's phone drops mid-game.
host.close();

let cardReturned = false;
let firstReturnAt = null;
const t0 = Date.now();
while (Date.now() - t0 < WATCH_MS) {
  await sleep(700);
  if (await showsCard()) { cardReturned = true; firstReturnAt = Date.now() - t0; break; }
}
check(
  "the host dropping does NOT put a QR over the live game",
  !cardReturned,
  cardReturned ? `card returned after ${firstReturnAt}ms of a 45000ms grace` : `held for ${WATCH_MS}ms`,
);

// 4. And the screen says something honest about it rather than nothing.
const text = (await bodyText()) || "";
check("the display says the host is reconnecting", /reconnect/i.test(text), text.replace(/\s+/g, " ").slice(0, 70));

ws.close(); chrome.kill();
console.log(failed ? `\n${failed} PROBLEM(S)` : "\nthe big screen survives a host blip");
process.exit(failed ? 1 : 0);
