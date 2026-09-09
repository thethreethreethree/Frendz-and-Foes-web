// Does the ROLE actually gate the HTTP route?
//
// staff.test.mjs proves can() returns the right answer. That is not the same claim: can() could be
// perfect while a route simply forgets to call it. isSuperadmin() now admits ANY valid staff
// session, so every admin route that does not narrow itself is open to every role — a `readonly`
// account reading the money ledger would pass every unit test in the repo.
//
// So this boots the real server, logs in as a real support account, and calls the real routes.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const HERE = dirname(fileURLToPath(import.meta.url));
const TMP = mkdtempSync(join(tmpdir(), "pz-gate-"));
// A FREE port, asked of the OS, not a fixed one.
//
// This first used a hard-coded 3199 and failed intermittently in the full suite: a previous run's
// server had not released the port yet, so the boot check timed out and the whole file failed with
// no assertion having actually run. A test that fails at random is worse than no test, because it
// trains you to re-run instead of read.
const PORT = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const PASSCODE = "gate-test-passcode";

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

const server = spawn(process.execPath, [join(HERE, "index.js")], {
  env: {
    ...process.env,
    PORT: String(PORT),
    DB_PATH: join(TMP, "gate.db"),
    AUTH_DIR: join(TMP, "auth"),
    ADMIN_PASSCODE: PASSCODE,
    GAMES_OPEN: "1",
    NODE_ENV: "test",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => { serverLog += d.toString(); });
server.stderr.on("data", (d) => { serverLog += d.toString(); });

const base = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${base}/healthz`);
      if (r.ok) return true;
    } catch { /* not yet */ }
    await sleep(500);
  }
  return false;
}

const up = await waitUp();
check("the server started", up, serverLog.slice(-400));
if (!up) { server.kill(); process.exit(1); }

const asOwner = { "x-admin-passcode": PASSCODE };

// Create a support account through the real API, using the shared passcode as owner.
const made = await fetch(`${base}/api/backer/admin/staff`, {
  method: "POST", headers: { ...asOwner, "content-type": "application/json" },
  body: JSON.stringify({ email: "support@gate.test", password: "correct-horse-battery", role: "support" }),
}).then((r) => r.json());
check("a support account is created", !!made.staff, JSON.stringify(made));

// Log in as them and keep the cookie.
const login = await fetch(`${base}/api/backer/admin/staff/login`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "support@gate.test", password: "correct-horse-battery" }),
});
check("they can log in", login.status === 200, String(login.status));
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
check("a session cookie is issued", /^pz_staff=/.test(cookie), cookie);

const asSupport = { cookie };
const status = async (path, headers) => (await fetch(base + path, { headers })).status;

// --- THE POINT OF THIS FILE ------------------------------------------------------------------
console.log("");
console.log("--- a support account must be refused the money routes ---");
check("GET payments is 403 for support", await status("/api/backer/admin/payments", asSupport) === 403);
check("payments.csv is 403 for support", await status("/api/backer/admin/payments.csv", asSupport) === 403);
check("staff management is 403 for support", await status("/api/backer/admin/staff", asSupport) === 403,
      "otherwise support could promote themselves to owner");

console.log("");
console.log("--- but support CAN do its actual job ---");
check("fulfilment is allowed", await status("/api/backer/admin/fulfilment", asSupport) === 200);
check("activity is allowed", await status("/api/backer/admin/activity", asSupport) === 200);

console.log("");
console.log("--- the owner passcode still reaches everything ---");
check("payments OK with the passcode", await status("/api/backer/admin/payments", asOwner) === 200);
check("staff OK with the passcode", await status("/api/backer/admin/staff", asOwner) === 200);

console.log("");
console.log("--- no credentials at all reaches nothing ---");
check("payments is 401 unauthenticated", await status("/api/backer/admin/payments", {}) === 401);
check("activity is 401 unauthenticated", await status("/api/backer/admin/activity", {}) === 401);

console.log("");
console.log("--- revoking ends the session already in hand ---");
await fetch(`${base}/api/backer/admin/staff/${made.staff.id}`, {
  method: "PATCH", headers: { ...asOwner, "content-type": "application/json" },
  body: JSON.stringify({ active: false }),
});
check("the revoked account's live cookie stops working",
      await status("/api/backer/admin/fulfilment", asSupport) === 401,
      "checked at read time, so revocation is immediate rather than taking a week");

server.kill();
console.log(fails ? `\n${fails} FAILED` : "\nall role-gate checks passed");
process.exit(fails ? 1 : 0);
