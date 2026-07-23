// A31/A30 gate for the Murder Mystery art seam (audit F-2). The character/weapon art already has an
// existence gate in villagers2.test.mjs; this covers the categories the recent build wired
// (backgrounds, roles, events, icons, logo) plus the location plates.
//
// A33-precise: it asserts ONLY paths the code actually references, so it can't cry wolf on assets
// that were deliberately not wired. Location plates are looked up dynamically, so those are checked
// against the roster minus a DOCUMENTED known-gap allowlist — which the test also keeps honest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WEAPONS } from "../apps/server/villagers2.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "apps/web/public");
const WEB = join(ROOT, "apps/web");

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) { if (!/node_modules|dist/.test(f)) walk(f, out); }
    else if (/\.(tsx?|css|html)$/.test(e)) out.push(f);
  }
  return out;
}
const text = walk(join(WEB, "src")).concat([join(WEB, "index.html")]).map((f) => readFileSync(f, "utf8")).join("\n");
const refs = [...new Set([...text.matchAll(/\/(roles|events|icons|brand|locations)\/[a-z0-9-]+\.(webp|png|jpe?g)/g)].map((m) => m[0]))];

// Intentionally-optional references (legacy, with a fallback in code) — not part of the murder-art
// wiring this gate guards. Documented so the exception is on the record, not a silent hole.
//   /brand/brain.png — the Feud/home Logo tries it and falls back; the real asset is brain.jpg.
const OPTIONAL = new Set(["/brand/brain.png"]);

test("every art path the CODE REFERENCES exists on disk (the wired seam is gated, not watched)", () => {
  const missing = refs.filter((p) => !OPTIONAL.has(p) && !existsSync(join(PUBLIC, p)));
  assert.deepEqual(missing, [], `wired art files that 404:\n${missing.join("\n")}`);
});

// Locations are resolved dynamically (locationPlate(location)); assert all 97 have a plate except the
// documented gaps. F-3 will fill these; until then they degrade cleanly (onError hides the plate).
const KNOWN_MISSING = ["Bakery", "Chimney Sweep", "Precinct", "Chicken Coop", "The Heights", "The Wilds", "Study", "Music Master", "Judicial Accoutrement"];
const slug = (s) => s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/^the-/, "");

test("every location has a plate except the documented known-gaps", () => {
  const locs = [...new Set(Object.values(WEAPONS).map((w) => w.location))];
  const unexpected = locs.filter((l) => !KNOWN_MISSING.includes(l) && !existsSync(join(PUBLIC, `locations/loc-${slug(l)}.webp`)));
  assert.deepEqual(unexpected, [], `location plates missing that are NOT in the known-gap list:\n${unexpected.join("\n")}`);
});

test("the known-gap allowlist stays honest — a filled gap must be removed from it", () => {
  const nowPresent = KNOWN_MISSING.filter((l) => existsSync(join(PUBLIC, `locations/loc-${slug(l)}.webp`)));
  assert.deepEqual(nowPresent, [], `these were allowlisted as missing but now exist — delete them from KNOWN_MISSING:\n${nowPresent.join("\n")}`);
});
