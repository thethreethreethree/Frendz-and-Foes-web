// Persistence for white-label brands.
//
// STORAGE: SQLite (`brands` in sqlite.js), migrated from one JSON file per brand under
// data/brands/<slug>.json. The original store's own comment said it was "the same shape a SQLite
// store would expose, so swapping to a real DB when accounts/queries arrive is a contained change" —
// this is that change, and the exports are indeed unchanged, so index.js needed no edits.
//
// The legacy per-brand JSON files are auto-imported ONCE, guarded by a recorded marker (not by "is
// the table empty?", which would resurrect deleted brands). They are NOT deleted - they stay as backup.
//
// Fail-safe preserved: if the database can't be opened, persistence reports off and the server keeps
// running on the built-in default brand. A storage problem must never take down the games, which is
// also why sqlite.js is imported dynamically here rather than statically.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data", "brands");

// Slugs are already validated in index.js, but never trust a key that reaches storage.
const safeSlug = (s) => (/^[a-z0-9][a-z0-9-]{0,39}$/.test(String(s)) ? String(s) : null);

let db = null;
let logEvent = () => {};
let tx = (fn) => fn();
let hasMigrated = () => false;
let markMigrated = () => {};
let ready = false;
try {
  const m = await import("./sqlite.js");
  db = m.db; logEvent = m.logEvent; tx = m.tx;
  hasMigrated = m.hasMigrated; markMigrated = m.markMigrated;
  ready = true;
  console.log("[ff-server] brand store ready (sqlite)");
} catch (err) {
  console.error("[ff-server] brand store DISABLED (persistence off, default brand only):", err?.message || err);
}

export const dbReady = () => ready;

// --- One-time migration of the per-brand JSON files -----------------------------------------------
// Runs ONCE, guarded by a recorded marker rather than by "is the table empty?" - emptying the table
// is something an admin legitimately does, and treating that as "never migrated" resurrected a
// deliberately-deleted brand on the next restart. In a transaction, so it cannot half-import.
// mtime becomes updated_at, preserving the ordering the old listBrandSlugs() reported.
function importLegacyFiles() {
  if (!ready) return;
  try {
    if (hasMigrated("brands")) return;                       // explicitly done before
    if (db.prepare("SELECT COUNT(*) AS n FROM brands").get().n > 0) {
      markMigrated("brands", { backfilled: true });          // live before markers existed
      return;
    }
    if (!existsSync(DATA_DIR)) { markMigrated("brands", { empty: true }); return; }
    const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json") && !f.endsWith(".tmp.json"));
    if (!files.length) return;
    let n = 0;
    tx(() => {
      const ins = db.prepare("INSERT OR IGNORE INTO brands (slug, config, updated_at) VALUES (?, ?, ?)");
      for (const f of files) {
        const slug = safeSlug(f.replace(/\.json$/, ""));
        if (!slug) continue;
        let cfg;
        try { cfg = readFileSync(join(DATA_DIR, f), "utf8"); } catch { continue; }
        try { JSON.parse(cfg); } catch { continue; }   // skip a corrupt file rather than storing junk
        let updated = Date.now();
        try { updated = Math.round(statSync(join(DATA_DIR, f)).mtimeMs); } catch { /* ignore */ }
        ins.run(slug, cfg, updated);
        n += 1;
      }
    });
    if (n) {
      console.log(`[ff-server] migrated ${n} brand(s) from JSON into SQLite`);
      logEvent("migrate.brands", null, { count: n, from: "data/brands/*.json" });
      markMigrated("brands", { count: n });
    }
  } catch (err) {
    console.error("[ff-server] brand JSON migration FAILED:", err?.message || err);
  }
}
importLegacyFiles();

export function getBrand(slug) {
  const s = safeSlug(slug);
  if (!ready || !s) return null;
  try {
    const row = db.prepare("SELECT config FROM brands WHERE slug = ?").get(s);
    return row ? JSON.parse(row.config) : null;
  } catch {
    return null;
  }
}

export function listBrandSlugs() {
  if (!ready) return [];
  try {
    return db.prepare("SELECT slug, updated_at FROM brands ORDER BY slug").all()
      .map((r) => ({ slug: r.slug, updated_at: r.updated_at }));
  } catch {
    return [];
  }
}

export function upsertBrand(slug, config) {
  const s = safeSlug(slug);
  if (!ready || !s) return false;
  try {
    db.prepare(`INSERT INTO brands (slug, config, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(slug) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at`)
      .run(s, JSON.stringify(config), Date.now());
    logEvent("brand.upsert", null, { slug: s });
    return true;
  } catch (err) {
    console.error("[ff-server] upsertBrand failed:", err?.message || err);
    return false;
  }
}

export function deleteBrand(slug) {
  const s = safeSlug(slug);
  if (!ready || !s) return false;
  try {
    db.prepare("DELETE FROM brands WHERE slug = ?").run(s);
    logEvent("brand.delete", null, { slug: s });
    return true;
  } catch {
    return false;
  }
}
