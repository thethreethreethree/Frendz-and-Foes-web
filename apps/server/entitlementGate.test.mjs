// Host entitlement gate.  Run:  node apps/server/entitlementGate.test.mjs
//
// Entitlements can only gate the HOST. Players join a party by scanning a QR with no account, and
// `role` is self-declared on the socket, so gating players is both unenforceable and wrong for the
// product — one person subscribes, their friends play.
//
// The case that actually matters is the DEFAULT: with ENFORCE_ENTITLEMENTS unset, nothing changes
// for anyone. Shipping this switched on would lock people out of their own party.
//
// Boots the real server twice — once with the flag off, once on — and drives a real socket.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { io as ioClient } from "socket.io-client";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEP = String.fromCharCode(92);
const SRV = "file:///" + HERE.split(SEP).join("/").split(" ").join("%20") + "/";
const REPO = join(HERE, "..", "..");
const TMP = join(tmpdir(), "playzoo-gate-test");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, "auth"), { recursive: true });

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

function startServer(port, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(HERE, "index.js")], {
      env: {
        ...process.env, PORT: String(port),
        AUTH_DIR: join(TMP, "auth"), DB_PATH: join(TMP, "playzoo.db"),
        GAMES_OPEN: "true", ADMIN_PASSCODE: "gate-test-pass", ...extraEnv,
      },
      cwd: REPO, stdio: ["ignore", "pipe", "pipe"],
    });
    const done = (d) => { if (String(d).includes("relay listening")) resolve(child); };
    child.stdout.on("data", done);
    child.stderr.on("data", done);
    setTimeout(() => reject(new Error("server did not start")), 15000);
  });
}

// Try to join as `role` and report what came back: "joined" | "locked:<reason>".
function tryJoin(port, role, auth = {}) {
  return new Promise((resolve) => {
    const sock = ioClient(`http://127.0.0.1:${port}`, { transports: ["websocket"], auth, forceNew: true });
    const finish = (v) => { try { sock.close(); } catch { /* ignore */ } resolve(v); };
    sock.on("connect", () => sock.emit("join", { room: "TEST", role }));
    sock.on("presence", () => finish("joined"));
    sock.on("locked", (d) => finish("locked:" + (d?.reason || (d?.waitlist ? "waitlist" : "?"))));
    setTimeout(() => finish("timeout"), 6000);
  });
}

// --- 1. The default: flag unset, nothing is gated -------------------------------------------------
console.log("\n--- ENFORCE_ENTITLEMENTS unset (the default) ---");
{
  const srv = await startServer(8851, {});
  check("a host with no account can still host", await tryJoin(8851, "host"), "joined");
  check("a display can still connect", await tryJoin(8851, "display"), "joined");
  check("a player can still join", await tryJoin(8851, "player"), "joined");
  srv.kill();
}

// --- 2. Flag on ----------------------------------------------------------------------------------
console.log("\n--- ENFORCE_ENTITLEMENTS=true ---");
{
  const srv = await startServer(8852, { ENFORCE_ENTITLEMENTS: "true" });
  check("hosting without an account is refused", await tryJoin(8852, "host"), "locked:sign-in");
  check("a display without an account is refused", await tryJoin(8852, "display"), "locked:sign-in");
  // The important one: players are NEVER gated. They have no account and never will.
  check("a PLAYER still joins freely", await tryJoin(8852, "player"), "joined");
  // The founder must never be locked out of their own product by a billing rule.
  check("the superadmin passcode always hosts",
    await tryJoin(8852, "host", { adminPasscode: "gate-test-pass" }), "joined");
  check("a wrong passcode does not pass",
    await tryJoin(8852, "host", { adminPasscode: "wrong" }), "locked:sign-in");
  srv.kill();
}

// --- 3. Entitlement logic behind the gate ---------------------------------------------------------
// The socket path needs a signed cookie, which is awkward to forge here; the DECISION it makes is
// entitlementsFor(), so that is asserted directly rather than not at all.
console.log("\n--- the decision the gate makes ---");
{
  process.env.AUTH_DIR = join(TMP, "auth");
  process.env.DB_PATH = join(TMP, "playzoo.db");
  const subs = await import(SRV + "subscriptions.js");
  const DAY = 86400_000;
  subs.setSubscription("bHOST", { plan: "head-keeper", status: "active", currentPeriodEnd: Date.now() + DAY });
  check("an active plan is entitled to host", subs.entitlementsFor("bHOST").active, true);
  subs.setSubscription("bHOST", { plan: "head-keeper", status: "active", currentPeriodEnd: Date.now() - DAY });
  check("an expired plan is not", subs.entitlementsFor("bHOST").active, false);
  check("someone with no plan is not", subs.entitlementsFor("bNOONE").active, false);
}

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
