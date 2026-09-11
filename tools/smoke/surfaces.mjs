// Open every surface of every game in a REAL browser and report what is broken.
//
// WHY THIS EXISTS. On 2026-09-10 five host controllers crashed the instant they opened
// ("useConnection must be used within a provider"), a player leaving froze four games, and typing a
// room code dropped players into the wrong game. Every one was a LOGIC bug. Every one survived a
// clean typecheck, a clean build, and 135 passing tests, because none of those things opens a page.
//
// The cheapest check that would have caught the crash is this: load the page and see if it rendered.
// 14 games x 3 surfaces = 42 loads. It needs a browser and it needs to WAIT -- a screenshot taken on
// a virtual clock reports "Connecting…", which is a picture of nothing and passes every time.
//
// Usage:  node tools/smoke/surfaces.mjs [baseUrl]
import { spawn } from "node:child_process";
import WebSocket from "ws";

const BASE = process.argv[2] || "https://frendz-and-foes.onrender.com";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9240;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GAMES = [
  "feud", "bingo", "murder", "trivia", "taboo", "headsup", "reverse",
  "monikers", "codenames", "justone", "ballpark", "pictionary", "telestrations", "afterdark",
];
const SURFACES = ["display", "control", "play"];

// A surface counts as rendered when it shows something a person could act on. "Connecting…" is not
// a pass -- it is the state every broken page also sits in.
const BROKEN = /Unexpected Application Error|Cannot read|is not defined|is not a function|must be used within/i;

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=" + (process.env.TEMP || "/tmp") + "/pzsmoke",
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
let id = 0; const pending = new Map(); let consoleErrors = [];
ws.on("message", (raw) => {
  const m = JSON.parse(raw);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Runtime.exceptionThrown") {
    const d = m.params?.exceptionDetails;
    consoleErrors.push(d?.exception?.description || d?.text || "exception");
  }
});
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;

await send("Runtime.enable");
await send("Page.enable");

const results = [];
for (const game of GAMES) {
  for (const surface of SURFACES) {
    consoleErrors = [];
    const room = "SM" + Math.floor(10 + Math.random() * 89);
    await send("Page.navigate", { url: `${BASE}/?room=${room}&game=${game}#/${surface}` });

    // Wait for something real. Polling beats a fixed sleep: the socket handshake is genuine network.
    let text = "", verdict = null;
    for (let i = 0; i < 18; i++) {
      await sleep(1000);
      text = ((await ev("document.body ? document.body.innerText : ''")) || "").replace(/\s+/g, " ").trim();
      if (BROKEN.test(text)) { verdict = "CRASH"; break; }
      // "Some text appeared" is NOT proof. On the first run an unrelated local interstitial
      // ("INCOMING HTTP REQUEST DETECTED") covered fifteen surfaces and every one reported ok --
      // a pass for pages the harness never actually saw. So require a marker only PlayZoo renders.
      const isApp = await ev(`!!document.querySelector('#root')?.firstElementChild`);
      if (isApp && text && !/^(Connecting…|Finding room)/.test(text) && text.length > 12) { verdict = "ok"; break; }
    }
    if (!verdict) verdict = text ? (/^(Connecting…|Finding room)/.test(text) ? "STUCK" : "NOT-APP") : "BLANK";
    const thrown = consoleErrors.filter((e) => !/favicon|manifest|net::ERR/i.test(e));
    results.push({ game, surface, verdict, thrown: thrown.length, text: text.slice(0, 54) });
    const mark = verdict === "ok" ? (thrown.length ? "warn" : "ok  ") : verdict;
    console.log(`${mark.padEnd(6)} ${game.padEnd(14)} ${surface.padEnd(8)} ${thrown.length ? "[" + thrown.length + " thrown] " : ""}${text.slice(0, 46)}`);
  }
}

console.log("\n================ SUMMARY ================");
const bad = results.filter((r) => r.verdict !== "ok");
const warn = results.filter((r) => r.verdict === "ok" && r.thrown > 0);
console.log(`  ${results.length} surfaces checked`);
console.log(`  ${bad.length} broken, ${warn.length} rendered but threw`);
for (const b of bad) console.log(`    ${b.verdict}  ${b.game}/${b.surface}  ${b.text}`);
for (const w of warn) console.log(`    threw ${w.thrown}  ${w.game}/${w.surface}`);

ws.close(); chrome.kill();
process.exit(bad.length ? 1 : 0);
