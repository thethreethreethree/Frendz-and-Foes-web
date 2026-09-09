// Load a local .env (gitignored) into process.env BEFORE any other module reads it. Node 22's
// built-in loader — no dependency. Imported first in index.js so secrets like DEEPSEEK_API_KEY and
// ADMIN_PASSCODE are present by the time other modules capture them at import time.
//
// We load from the repo root by an ABSOLUTE path (…/apps/server/env.js → ../../.env), not the bare
// cwd form, because the process cwd under systemd/npm is not guaranteed to be the repo root — a
// cwd-relative ".env" silently loaded nothing for some vars. The bare call remains a fallback.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootEnv = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");
try {
  process.loadEnvFile(rootEnv);
} catch {
  try { process.loadEnvFile(); } catch { /* no .env — env comes from the process environment */ }
}

// One-line boot summary of which secrets resolved (presence only, never values) — so a missing key
// is visible in the journal instead of surfacing as a mysterious 401 later.
console.log("[ff-server] env:", JSON.stringify({
  deepseek: !!(process.env.DEEPSEEK_API_KEY || process.env.HOST_API_KEY),
  adminPasscodeLen: (process.env.ADMIN_PASSCODE || "").length,
  signupsOpen: process.env.SIGNUPS_OPEN === "true",
  gamesOpen: process.env.GAMES_OPEN === "true",
  enforceEntitlements: process.env.ENFORCE_ENTITLEMENTS === "true",
}));

// The one combination that quietly gives the product away.
//
// GAMES_OPEN without ENFORCE_ENTITLEMENTS means every visitor can host all fourteen games and a
// paid plan buys nothing. It is a legitimate state to choose -- a free launch weekend, a demo --
// so this warns rather than refuses. But it is shouted, every boot, because the alternative is
// discovering it from a backer asking why they paid.
export function warnIfUnguarded() {
  if (process.env.GAMES_OPEN === "true" && process.env.ENFORCE_ENTITLEMENTS !== "true") {
    const line = "=".repeat(78);
    console.warn(line);
    console.warn("[ff-server] GAMES ARE OPEN AND ENTITLEMENTS ARE NOT ENFORCED.");
    console.warn("[ff-server] Every visitor can host all 14 games. A paid plan currently buys nothing.");
    console.warn("[ff-server] Set ENFORCE_ENTITLEMENTS=true and restart, or ignore this if it is deliberate.");
    console.warn(line);
  }
}

// Called HERE, at import, not left as an export for someone to remember. index.js imports this
// module for its side effects ("MUST be first"), so the check runs on every boot by construction.
// An exported warning nobody calls is the same shape as the entitlement that was never enforced.
warnIfUnguarded();
