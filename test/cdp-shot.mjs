// Real-timed screenshot via the Chrome DevTools Protocol (msedge). Unlike --virtual-time-budget
// + --screenshot, this waits real wall-clock time so async work like a WebSocket sync completes.
// Usage: node test/cdp-shot.mjs <displayUrl> <hostUrl> <outPng>
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { WebSocket } from "ws";

const [, , displayUrl, hostUrl, out] = process.argv;
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9333;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const stamp = Date.now(); // fresh profiles each run → no stale tabs, no cleanup needed
const host = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--disable-sync",
  `--user-data-dir=${process.env.TEMP}\\ff-cdp-host-${stamp}`,
  hostUrl,
]);
const disp = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  "--no-first-run", "--disable-sync", "--no-default-browser-check",
  "--window-size=1920,1080", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP}\\ff-cdp-disp-${stamp}`,
  displayUrl,
]);

try {
  await delay(5000); // real time for both to connect + sync
  const host = new URL(displayUrl).host; // derive from the actual URL (no hardcoded port)
  const list = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
  const page = list.find(
    (t) =>
      t.type === "page" &&
      t.webSocketDebuggerUrl &&
      t.url.includes(host) &&
      t.url.includes("display"),
  );
  if (!page) throw new Error("no display page target; got: " + JSON.stringify(list.map((t) => t.url)));

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res) => ws.on("open", res));
  const shot = await new Promise((res, rej) => {
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id === 1) (msg.result ? res(msg.result.data) : rej(new Error(JSON.stringify(msg))));
    });
    ws.send(JSON.stringify({ id: 1, method: "Page.captureScreenshot", params: { format: "png" } }));
  });
  writeFileSync(out, Buffer.from(shot, "base64"));
  console.log("wrote", out);
  ws.close();
} finally {
  host.kill();
  disp.kill();
}
