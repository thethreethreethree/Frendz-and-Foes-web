// Why is the REMOTE slow when the website is fast? Measure, don't theorise.
//
// Both surfaces ship from one bundle, so a difference between them is not download weight — it is
// what each does after the script arrives. This walks the same journeys a host actually takes and
// reports, per surface: navigations (a full page reload costs the whole bundle again), requests,
// bytes, time to first paint of real content, and any long tasks on the main thread.
//
// Usage: node tools/smoke/perf.mjs [baseUrl]
import { spawn } from "node:child_process";
import WebSocket from "ws";

const BASE = process.argv[2] || "http://127.0.0.1:8099";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9388;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const JOURNEYS = [
  { name: "home", url: "/" },
  { name: "waitlist", url: "/#/waitlist" },
  { name: "control (no room)", url: "/#/control" },
  { name: "control feud +room", url: "/?room=PF01&game=feud#/control" },
  { name: "control trivia +room", url: "/?room=PF02&game=trivia#/control" },
  { name: "display feud +room", url: "/?room=PF03&game=feud#/display" },
];

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "/pzperf" + Date.now(),
  "about:blank"], { stdio: "ignore" });
await sleep(3000);

let page = null;
for (let i = 0; i < 20 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); }
  catch { await sleep(500); }
}
if (!page) { console.error("no chrome at", CHROME); process.exit(2); }

const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise((r) => ws.on("open", r));
let id = 0; const pending = new Map();
let requests = [];   // {url, bytes}
let navigations = 0; // a full document load — the bundle is paid for again each time
let longTasks = [];

ws.on("message", (raw) => {
  const m = JSON.parse(raw);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Network.responseReceived") {
    requests.push({ url: m.params.response.url, bytes: 0, type: m.params.type });
  }
  if (m.method === "Network.loadingFinished") {
    const last = requests[requests.length - 1];
    if (last) last.bytes = m.params.encodedDataLength || 0;
  }
  // A new document = the whole app boots again. This is what a window.location.reload() costs.
  if (m.method === "Page.frameNavigated" && !m.params.frame.parentId) navigations++;
});

const send = (meth, p = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method: meth, params: p })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

console.log(`base: ${BASE}\n`);
console.log("surface".padEnd(24) + "ready".padEnd(10) + "navs".padEnd(7) + "reqs".padEnd(7) + "bytes".padEnd(11) + "first text");
console.log("-".repeat(100));

for (const j of JOURNEYS) {
  requests = []; navigations = 0; longTasks = [];
  // about:blank between runs so each journey is measured cold-ish but from a warm HTTP cache,
  // which is what a host re-opening the remote actually experiences.
  await send("Page.navigate", { url: "about:blank" });
  await sleep(400);
  requests = []; navigations = 0;

  const t0 = Date.now();
  await send("Page.navigate", { url: `${BASE}${j.url}` });

  let ready = null; let text = "";
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    const booted = await ev(`!!document.querySelector('#root')?.firstElementChild`);
    text = ((await ev("document.body ? document.body.innerText : ''")) || "").replace(/\s+/g, " ").trim();
    // "Ready" means content a person could act on -- not the loading interstitials.
    if (booted && text.length > 12 && !/^(Connecting…|Finding room)/.test(text)) { ready = Date.now() - t0; break; }
  }
  await sleep(600); // let late requests (songs.json, art, QR) land before totting up

  const bytes = requests.reduce((n, r) => n + r.bytes, 0);
  console.log(
    j.name.padEnd(24) +
    String(ready === null ? "NEVER" : ready + "ms").padEnd(10) +
    String(navigations).padEnd(7) +
    String(requests.length).padEnd(7) +
    (Math.round(bytes / 1024) + "kB").padEnd(11) +
    text.slice(0, 44),
  );
}

console.log("\nnavs > 1 means the page reloaded itself — the whole bundle paid for twice.");
ws.close(); chrome.kill();
