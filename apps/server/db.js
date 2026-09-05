// Persistence for white-label brands (Phase 2). A tiny JSON-file store on the box: one
// file per brand under data/brands/<slug>.json. Chosen over SQLite for now because it has
// zero native dependencies (works identically in local dev and prod) and is more than
// enough for a handful of brand configs with infrequent writes. The API below is the same
// shape a SQLite store would expose, so swapping to a real DB when accounts/queries arrive
// (the HTTPS phase) is a contained change — callers in index.js don't move.
//
// Fail-safe: if the data dir can't be created, persistence is reported off and the server
// keeps running on the built-in default brand — a storage problem never takes down the games.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, renameSync, unlinkSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data", "brands");

// Filename safety: slugs are already validated in index.js, but never trust a path segment
// that could escape the data dir.
const safeSlug = (s) => (/^[a-z0-9][a-z0-9-]{0,39}$/.test(String(s)) ? String(s) : null);
const fileFor = (slug) => join(DATA_DIR, `${slug}.json`);

let ready = false;
try {
  mkdirSync(DATA_DIR, { recursive: true });
  ready = true;
  console.log(`[ff-server] brand store ready at ${DATA_DIR}`);
} catch (err) {
  console.error("[ff-server] brand store DISABLED (persistence off, default brand only):", err?.message || err);
}

export const dbReady = () => ready;

export function getBrand(slug) {
  const s = safeSlug(slug);
  if (!ready || !s) return null;
  try {
    const f = fileFor(s);
    if (!existsSync(f)) return null;
    return JSON.parse(readFileSync(f, "utf8"));
  } catch {
    return null;
  }
}

export function listBrandSlugs() {
  if (!ready) return [];
  try {
    return readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const slug = f.replace(/\.json$/, "");
        let updated_at = 0;
        try { updated_at = Math.round(statSync(join(DATA_DIR, f)).mtimeMs); } catch { /* ignore */ }
        return { slug, updated_at };
      })
      .sort((a, b) => a.slug.localeCompare(b.slug));
  } catch {
    return [];
  }
}

export function upsertBrand(slug, config) {
  const s = safeSlug(slug);
  if (!ready || !s) return false;
  try {
    // Write to a temp file then rename, so a crash mid-write can't corrupt the brand.
    const tmp = fileFor(s) + ".tmp";
    writeFileSync(tmp, JSON.stringify(config, null, 2), "utf8");
    renameSync(tmp, fileFor(s));
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
    const f = fileFor(s);
    if (existsSync(f)) unlinkSync(f);
    return true;
  } catch {
    return false;
  }
}
