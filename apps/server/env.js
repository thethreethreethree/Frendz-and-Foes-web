// Load a local .env (gitignored) into process.env BEFORE any other module reads it. Node 22's
// built-in loader — no dependency. Harmless when there is no .env (e.g. on hosts that inject env
// vars directly): the call throws ENOENT and we swallow it. Imported first in index.js so secrets
// like DEEPSEEK_API_KEY are present by the time host.js captures them at import time.
try {
  process.loadEnvFile();
} catch {
  // no .env here — env comes from the process environment (systemd, Render, etc.)
}
