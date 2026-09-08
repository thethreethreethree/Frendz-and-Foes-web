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
}));
