// Every game slug the CLIENT announces must be one the product actually knows about.
//
// WHY THIS EXISTS: when session tracking was added, the web stores were tagged with slugs taken
// from their own folder names — "murder2", "offlimits", "fullcast". The product's canonical slugs,
// used by brand.ts, howtoplay.tsx and productKnowledge.js, are "murder", "taboo" and "reverse".
// Three of the fourteen games were therefore recording their nights under a name nothing else in
// the codebase recognised.
//
// Nothing failed. The Activity panel had a display map that translated the wrong slugs back into
// the right titles, so the screen looked correct while the stored data was wrong — the worst shape
// a bug can take.
//
// It would have become a real fault the moment game entitlements landed: a backer who picked
// "murder" would be refused entry to a room announcing "murder2" — locked out of a game they paid
// for, by a typo nobody could see.
//
// So this test reads the slugs out of the CLIENT source and checks each one against the canonical
// list. It is a spelling check between two halves of the app that cannot otherwise notice.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const SRC = join(REPO, "apps", "web", "src");

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

// --- the canonical list -------------------------------------------------------------------------
const pk = readFileSync(join(HERE, "productKnowledge.js"), "utf8");
const gamesBlock = pk.slice(pk.indexOf("export const GAMES"));
const canonical = new Set(
  [...gamesBlock.slice(0, gamesBlock.indexOf("];")).matchAll(/^\s*\[\s*"([^"]+)"/gm)].map((m) => m[1]),
);
check("productKnowledge lists 14 games", canonical.size === 14, String(canonical.size));

// --- every slug the client sends ------------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const sent = new Map();   // slug -> file it came from
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  // two shapes: emit("join", { ..., game: "x" }) and joinRoom(room, role, teamId, "x")
  for (const m of text.matchAll(/game:\s*"([a-z0-9-]+)"/g)) sent.set(m[1], file);
  for (const m of text.matchAll(/joinRoom\([^)]*?,\s*"([a-z0-9-]+)"\s*\)/g)) sent.set(m[1], file);
}

check("the client announces some game slugs at all", sent.size > 0, String(sent.size));

const rel = (f) => f.replace(REPO, "").replace(/\\/g, "/");
const unknown = [...sent.entries()].filter(([slug]) => !canonical.has(slug));
check("every slug the client sends is a canonical game",
      unknown.length === 0,
      unknown.map(([s, f]) => `${s} (${rel(f)})`).join(", "));

// The three that were actually wrong, named so a regression is unmistakable rather than generic.
for (const bad of ["murder2", "offlimits", "fullcast"]) {
  check(`"${bad}" is not sent by anything`, !sent.has(bad),
        sent.has(bad) ? rel(sent.get(bad)) : "");
}

// --- the founder's Activity panel must be able to name them ------------------------------------
const card = readFileSync(join(SRC, "routes", "ActivityCard.tsx"), "utf8");
const mapBlock = card.slice(card.indexOf("const GAME_NAMES"), card.indexOf("const gameName"));
const named = new Set([...mapBlock.matchAll(/^\s*([a-z0-9-]+):/gm)].map((m) => m[1]));
const unnamed = [...canonical].filter((g) => !named.has(g));
check("the Activity panel can name every canonical game", unnamed.length === 0, unnamed.join(", "));

console.log(fails ? `\n${fails} FAILED` : "\nall game-slug checks passed");
process.exit(fails ? 1 : 0);
