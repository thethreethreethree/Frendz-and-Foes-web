// Reveal ALL 75 Bingo dares on the real display and measure every one of them.
//
// WHY THIS EXISTS. The party deck's longest dare is 115 characters where the old deck's longest was
// 95. The display's dare block is `min-h-[5rem] max-w-2xl ... text-2xl`, which READS like it grows
// rather than clips -- but reading the classes is reading the source instead of the render, which is
// the failure this project keeps a law about. So this drives the real host controller, reveals each
// dare on the real display at real TV size, and measures what the room actually sees.
//
// It sweeps all 75 rather than hunting the longest one because the draw is random: every ball
// becomes current exactly once in a full sweep, so a sweep is deterministic where a hunt is not --
// and it checks the other 74 for free.
//
// Usage: node tools/smoke/bingodares.mjs [baseUrl] [outDir]
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import WebSocket from "ws";

const BASE = process.argv[2] || "http://127.0.0.1:8099";
const OUT = process.argv[3] || "tools/smoke/_dareshots";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9434;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "/pzdare" + Date.now(),
  "about:blank"], { stdio: "ignore" });
await sleep(3000);

async function openTab(url) {
  return await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
}
function attach(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0; const pending = new Map();
  ws.on("message", (raw) => { const m = JSON.parse(raw); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
  return { ws, send, ev, ready: new Promise((r) => ws.on("open", r)) };
}

const ctl = attach(await openTab(`${BASE}/?game=bingo#/control`));
await ctl.ready;
await ctl.send("Runtime.enable"); await ctl.send("Page.enable");
await ctl.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(6000);

const disp = attach(await openTab(`${BASE}/?game=bingo&room=BINGO#/display`));
await disp.ready;
await disp.send("Runtime.enable"); await disp.send("Page.enable");
await disp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await sleep(6000);

const click = (needle) => `(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes(${JSON.stringify(needle)}) && !x.disabled);
  if (!b) return "NOBUTTON";
  b.click(); return "OK";
})()`;

// The dare on the DISPLAY: the deepest element holding the revealed text. Identified structurally
// (longest leaf text in the centre column) rather than by a brittle regex over innerText.
const MEASURE = `(() => {
  const leaves = [...document.querySelectorAll("div")]
    .filter((d) => d.children.length === 0 && d.textContent.trim().length > 12);
  const el = leaves.sort((a, b) => b.textContent.trim().length - a.textContent.trim().length)[0];
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    text: el.textContent.trim(),
    chars: el.textContent.trim().length,
    w: Math.round(r.width), h: Math.round(r.height),
    top: Math.round(r.top), bottom: Math.round(r.bottom),
    clipped: el.scrollHeight > el.clientHeight + 1,
    offScreen: r.bottom > innerHeight || r.top < 0,
    fontSize: cs.fontSize,
    lines: Math.round(r.height / parseFloat(cs.lineHeight || "0") ) || null,
  };
})()`;

const seen = [];
let drew = 0;
for (let i = 0; i < 80; i++) {
  if (await ctl.ev(click("Draw next ball")) !== "OK") break;
  drew++;
  await sleep(260);
  if (await ctl.ev(click("Reveal dare on screen")) !== "OK") { console.log("reveal unavailable at draw", drew); }
  await sleep(520);
  const m = await disp.ev(MEASURE);
  if (m) seen.push(m);
}

const bad = seen.filter((m) => m.clipped || m.offScreen);
const longest = seen.slice().sort((a, b) => b.chars - a.chars)[0];
const tallest = seen.slice().sort((a, b) => b.h - a.h)[0];

console.log("draws:", drew, "| dares measured on the display:", seen.length);
console.log("distinct texts:", new Set(seen.map((s) => s.text)).size);
console.log("clipped or off-screen:", bad.length);
for (const b of bad.slice(0, 5)) console.log("   BAD:", JSON.stringify(b));
console.log("LONGEST:", JSON.stringify(longest, null, 2));
console.log("TALLEST BOX:", tallest && `${tallest.h}px for ${tallest.chars} chars`);

// Photograph the longest one, which is the case the container was doubted on.
if (longest) {
  // Re-draw is not possible (deck exhausted), so shoot the final state plus report the numbers.
  const shot = await disp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/display-final-dare.png`, Buffer.from(shot.result.data, "base64"));
  console.log("wrote", `${OUT}/display-final-dare.png`);
}
writeFileSync(`${OUT}/measurements.json`, JSON.stringify(seen, null, 2));
console.log("wrote", `${OUT}/measurements.json`);

chrome.kill();
process.exit(bad.length === 0 && seen.length >= 70 ? 0 : 1);
