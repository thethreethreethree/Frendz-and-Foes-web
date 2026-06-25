// Open a page, click a selector, then screenshot (for verifying interactive UI headlessly).
// Usage: node test/cdp-click.mjs <url> <cssSelector> <outPng>
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { WebSocket } from "ws";

const [, , url, selector, out] = process.argv;
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9444;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = Date.now();

const proc = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--disable-sync",
  "--window-size=500,1200", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP}\\ff-cdp-click-${stamp}`,
  url,
]);

let id = 0;
const send = (ws, method, params) =>
  new Promise((res) => {
    const mid = ++id;
    const onMsg = (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.id === mid) {
        ws.off("message", onMsg);
        res(m.result);
      }
    };
    ws.on("message", onMsg);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

try {
  await delay(3500);
  const list = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
  const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.on("open", r));
  await send(ws, "Runtime.enable");
  await send(ws, "Runtime.evaluate", {
    expression: `document.querySelector(${JSON.stringify(selector)})?.click()`,
  });
  await delay(1200);
  const shot = await send(ws, "Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log("wrote", out);
  ws.close();
} finally {
  proc.kill();
}
