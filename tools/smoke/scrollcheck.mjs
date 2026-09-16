// Can you actually REACH the bottom of every long page? Drives Chrome at 390x844 and proves it.
//
// WHY THIS EXISTS (again). index.css sets `body { overflow: hidden }`, so every route is a
// fixed-height box that must carry its own inner scroller (`.ff-scroll`). Forget it on one route
// and the page looks perfect in a screenshot while everything below the fold is unreachable —
// nothing throws, nothing 404s, no test fails, and the surface sweep still says "ok" because the
// page rendered.
//
// That is not hypothetical. On 2026-09-16 the owner reported the waitlist chat as unusable: John
// greets you, and the textarea to answer him sat below the fold on a page that could not scroll.
// The 2026-09-08 handover claims "`scrollcheck` drives Chrome at 390x844 and asserts the container
// moved" — but no such tool was ever committed, so the guard it describes did not exist and the
// regression walked straight through. This is that tool, committed.
//
// A page PASSES if either it fits the viewport, or it has a container that actually moves. A page
// FAILS if its content is taller than the viewport and nothing scrolls — that is content a person
// cannot get to.
//
// Usage: node tools/smoke/scrollcheck.mjs [baseUrl]
import { spawn } from "node:child_process";
import WebSocket from "ws";

const BASE = process.argv[2] || "http://127.0.0.1:8099";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9366;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Route, and a selector that must be REACHABLE on it (not merely present in the DOM).
const ROUTES = [
  { path: "#/waitlist", mustReach: "textarea", why: "the composer to answer John" },
  { path: "#/ask-john", mustReach: "textarea", why: "the composer" },
  { path: "#/club", mustReach: null, why: null },
  { path: "#/founder", mustReach: null, why: null },
  { path: "", mustReach: null, why: null },
];

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "/pzscroll" + Date.now(),
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
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

// The scroller is whichever element is actually taller than itself. Deliberately NOT "the element
// with .ff-scroll" -- that would test that the class is present, which is the filename talking.
// This measures the behaviour: can anything move?
const PROBE = `(() => {
  const docEl = document.scrollingElement || document.documentElement;
  const cands = [...document.querySelectorAll("*")].filter((e) => {
    const s = getComputedStyle(e);
    return /auto|scroll/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 200;
  });
  const el = cands[0] || null;
  return {
    bodyOverflow: getComputedStyle(document.body).overflowY,
    docScrollable: docEl.scrollHeight > docEl.clientHeight + 4,
    innerH: window.innerHeight,
    contentH: document.body.scrollHeight,
    hasScroller: !!el,
    scrollHeight: el ? el.scrollHeight : 0,
    clientHeight: el ? el.clientHeight : 0,
  };
})()`;

let failed = 0;
for (const r of ROUTES) {
  await send("Page.navigate", { url: `${BASE}/${r.path}` });
  let info = null;
  for (let i = 0; i < 15; i++) {
    await sleep(800);
    const ok = await ev(`!!document.querySelector('#root')?.firstElementChild`);
    if (ok) { info = await ev(PROBE); if (info) break; }
  }
  if (!info) { console.log(`FAIL  ${r.path || "/"}  never rendered`); failed++; continue; }

  const overflows = info.contentH > info.innerH + 4;

  // Scroll whatever moves, then measure that it MOVED. A container that reports a scrollHeight but
  // refuses to move is the same as no container at all.
  const moved = await ev(`(() => {
    const docEl = document.scrollingElement || document.documentElement;
    const cands = [...document.querySelectorAll("*")].filter((e) => {
      const s = getComputedStyle(e);
      return /auto|scroll/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 200;
    });
    const el = cands[0] || docEl;
    const before = el.scrollTop;
    el.scrollTop = el.scrollHeight;
    return { before, after: el.scrollTop, moved: el.scrollTop > before };
  })()`);
  await sleep(300);

  let reachNote = "";
  if (r.mustReach) {
    // "Reachable" means inside the viewport AFTER scrolling to the end -- not merely in the DOM.
    const reach = await ev(`(() => {
      const el = document.querySelector(${JSON.stringify(r.mustReach)});
      if (!el) return { found: false };
      const b = el.getBoundingClientRect();
      return { found: true, top: Math.round(b.top), bottom: Math.round(b.bottom),
               inView: b.top >= 0 && b.bottom <= window.innerHeight + 1 };
    })()`);
    if (!reach?.found) { reachNote = ` -- ${r.mustReach} NOT IN DOM`; }
    else if (!reach.inView) { reachNote = ` -- ${r.why} is UNREACHABLE (bottom ${reach.bottom} vs viewport ${info.innerH})`; }
    else { reachNote = ` -- ${r.why} reachable (bottom ${reach.bottom})`; }
    if (reach?.found && !reach.inView) { failed++; }
    else if (!reach?.found) { failed++; }
  }

  const scrollOk = !overflows || moved?.moved;
  if (!scrollOk) failed++;
  const verdict = scrollOk && !reachNote.includes("UNREACHABLE") && !reachNote.includes("NOT IN DOM") ? "ok  " : "FAIL";
  console.log(
    `${verdict}  ${(r.path || "/").padEnd(14)} content ${info.contentH}px in ${info.innerH}px` +
    `${overflows ? "" : " (fits)"} scrolled ${moved?.before ?? 0}->${moved?.after ?? 0}${reachNote}`,
  );
}

ws.close(); chrome.kill();
console.log(failed ? `\n${failed} PROBLEM(S)` : "\nevery long page can be scrolled to its end");
process.exit(failed ? 1 : 0);
