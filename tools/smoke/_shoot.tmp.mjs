// LAW 1 pass: open each of the 14 host controllers at phone size and photograph it.
// One navigation per game, real wall-clock wait (a virtual-clock shot photographs "Connecting…").
// Usage: node shoot-remotes.mjs <baseUrl> <outDir>
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import WebSocket from "ws";

const BASE = process.argv[2] || "http://127.0.0.1:8099";
const OUT = process.argv[3];
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9412;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const GAMES = (process.env.SHOOT_GAMES || "").split(",").filter(Boolean).length ? process.env.SHOOT_GAMES.split(",") : [
  "feud", "trivia", "bingo", "murder", "monikers", "headsup", "taboo",
  "pictionary", "reverse", "codenames", "justone", "ballpark", "telestrations", "afterdark",
];

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "/pzshoot" + Date.now(),
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
ws.on("message", (raw) => {
  const m = JSON.parse(raw);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;

await send("Runtime.enable");
await send("Page.enable");
// iPhone-class viewport. The remote is a phone-first surface; photographing it at desktop
// width would be photographing a thing no host ever sees.
await send("Emulation.setDeviceMetricsOverride", {
  width: +(process.env.SHOOT_W || 390), height: +(process.env.SHOOT_H || 844), deviceScaleFactor: 2, mobile: !process.env.SHOOT_W,
});

const shoot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  if (!r.result?.data) { console.log("  !! no shot for", name); return; }
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, "base64"));
};

for (const game of GAMES) {
  const room = "RD" + Math.floor(1000 + Math.random() * 8999); // wide space: no room collisions
  await send("Page.navigate", { url: `${BASE}/?room=${room}&game=${game}#/${process.env.SHOOT_SURFACE || "control"}` });

  let text = "";
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    text = ((await ev("document.body ? document.body.innerText : ''")) || "").replace(/\s+/g, " ").trim();
    const isApp = await ev(`!!document.querySelector('#root')?.firstElementChild`);
    if (isApp && text && !/^(Connecting…|Finding room)/.test(text) && text.length > 12) break;
  }
  await sleep(1500); // let art/QR finish painting before the shutter

  await shoot(game);

  // The remotes are single scrolling columns; the fold hides most of them. Record how much
  // is below it, and take a second frame from the bottom when there is more to see.
  const scroll = await ev(`(() => {
    const els = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 40 && e.clientHeight > 300);
    const el = els[0];
    if (!el) return { scrollable: false };
    return { scrollable: true, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  })()`);

  if (scroll?.scrollable) {
    await ev(`(() => {
      const els = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 40 && e.clientHeight > 300);
      els[0].scrollTop = els[0].scrollHeight;
    })()`);
    await sleep(800);
    await shoot(`${game}-bottom`);
  }

  console.log(`${game.padEnd(14)} ${scroll?.scrollable ? `scrolls ${scroll.scrollHeight}px in ${scroll.clientHeight}px` : "fits"}  :: ${text.slice(0, 70)}`);
}

ws.close(); chrome.kill();
console.log("\ndone ->", OUT);
