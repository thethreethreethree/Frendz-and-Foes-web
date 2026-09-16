// The journey a HOST actually takes, and how responsive the remote is once they are in it.
//
// tools/smoke/perf.mjs measures a cold load of one URL. That is not what a host does. A host opens
// /#/control, picks a game from the tiles, and then drives the remote by tapping. Two things could
// make that feel slow that a single-URL measurement cannot see:
//
//   1. ControlRoute's game picker calls setUrlGame() then window.location.reload() — a FULL page
//      reload, so the entire bundle is fetched, parsed and booted a second time before the remote
//      appears. Same for the room/game resolution mismatch path and for the ⌂ Home button.
//   2. Tap latency. The remote re-renders a lot per action; a store that dispatches, persists and
//      emits on every press can make a button feel dead.
//
// Usage: node tools/smoke/perf-journey.mjs [baseUrl]
import { spawn } from "node:child_process";
import WebSocket from "ws";

const BASE = process.argv[2] || "http://127.0.0.1:8099";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9399;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "/pzjourney" + Date.now(),
  "about:blank"], { stdio: "ignore" });
await sleep(3000);

let page = null;
for (let i = 0; i < 20 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); }
  catch { await sleep(500); }
}
if (!page) { console.error("no chrome"); process.exit(2); }

const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise((r) => ws.on("open", r));
let id = 0; const pending = new Map();
let navigations = 0; let bytes = 0; let reqs = 0;
ws.on("message", (raw) => {
  const m = JSON.parse(raw);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Page.frameNavigated" && !m.params.frame.parentId) navigations++;
  if (m.method === "Network.responseReceived") reqs++;
  if (m.method === "Network.loadingFinished") bytes += m.params.encodedDataLength || 0;
});
const send = (meth, p = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method: meth, params: p })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const text = async () => ((await ev("document.body ? document.body.innerText : ''")) || "").replace(/\s+/g, " ").trim();
async function waitFor(re, budget = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < budget) {
    await sleep(150);
    if (re.test(await text())) return Date.now() - t0;
  }
  return null;
}

console.log(`base: ${BASE}\n`);

// ---- JOURNEY: open the controller, pick a game from the tiles, wait for the remote -------------
await send("Page.navigate", { url: "about:blank" });
await sleep(400);
navigations = 0; bytes = 0; reqs = 0;

const tStart = Date.now();
await send("Page.navigate", { url: `${BASE}/#/control` });
const tPicker = await waitFor(/PICK A GAME/i);
console.log(`1. game picker on screen            ${tPicker ?? "NEVER"}ms   (navs ${navigations}, ${Math.round(bytes / 1024)}kB, ${reqs} reqs)`);

if (tPicker === null) { console.log("no picker — is this host gated?"); ws.close(); chrome.kill(); process.exit(1); }

const navsBefore = navigations, bytesBefore = bytes, reqsBefore = reqs;
const tapAt = Date.now();
// Click the first game tile the same way a thumb would.
const clicked = await ev(`(() => {
  const el = [...document.querySelectorAll('button, a')].find((e) => /Survey Showdown|Top answers/i.test(e.innerText || ""));
  if (!el) return false;
  el.click();
  return true;
})()`);
if (!clicked) { console.log("could not find a game tile to tap"); ws.close(); chrome.kill(); process.exit(1); }

const tRemote = await waitFor(/ROOM|SETUP|TEAMS & SETUP/i, 40000);
const afterTap = Date.now() - tapAt;
console.log(`2. TAP a game tile -> remote ready   ${tRemote === null ? "NEVER" : afterTap}ms   (navs +${navigations - navsBefore}, +${Math.round((bytes - bytesBefore) / 1024)}kB, +${reqs - reqsBefore} reqs)`);
console.log(`   total from cold to usable remote  ${Date.now() - tStart}ms   (navs ${navigations} total)`);

// ---- TAP LATENCY on the remote ----------------------------------------------------------------
// How long from press to the UI actually changing? Measured on a control that mutates game state.
await sleep(800);
const latencies = [];
for (let i = 0; i < 5; i++) {
  const r = await ev(`(async () => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Next|Draw next ball|\\+ Add team/i.test(b.innerText || ""));
    if (!btn) return null;
    const before = document.body.innerText;
    const t = performance.now();
    btn.click();
    // Wait for the DOM to actually differ — a click that changes nothing is not a measurement.
    for (let n = 0; n < 200; n++) {
      await new Promise((r) => requestAnimationFrame(r));
      if (document.body.innerText !== before) return Math.round(performance.now() - t);
    }
    return -1;
  })()`);
  if (typeof r === "number" && r >= 0) latencies.push(r);
  await sleep(350);
}
console.log(
  `3. tap -> DOM update                 ${latencies.length ? latencies.join("ms, ") + "ms" : "no measurable control found"}`,
);

ws.close(); chrome.kill();
console.log("\nA reload between 1 and 2 means the whole bundle is downloaded, parsed and booted twice.");
