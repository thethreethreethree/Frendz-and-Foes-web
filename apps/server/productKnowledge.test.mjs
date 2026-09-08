// Guards the shared character knowledge against drift.
// Run:  node apps/server/productKnowledge.test.mjs
//
// The characters' game rules are MIRRORED from apps/web/src/net/howtoplay.tsx, because that is a
// .tsx file the Node server cannot import. A mirror with no guard is how banter.js ended up calling
// Rex an "AI zookeeper" while his own persona called him a human one - the copy drifts silently and
// the character starts saying things that are not true of the product.
//
// This test parses the real .tsx as text and asserts the mirror still matches it, so changing a
// game's rules in the app fails loudly here instead of quietly leaving Rex and John a version
// behind. The enclosures need no test: they are imported live from enclosures.js.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GAMES, CHARACTERS, PRODUCT_KNOWLEDGE, TIERS, GOAL } from "./productKnowledge.js";
import { ENCLOSURES } from "./enclosures.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const src = readFileSync(join(REPO, "apps", "web", "src", "net", "howtoplay.tsx"), "utf8");

// Pull `key: { summary: "...", steps: [ "...", ... ] }` straight out of the source text.
const parsed = new Map();
const blockRe = /(\w+):\s*\{\s*summary:\s*"((?:[^"\\]|\\.)*)",\s*steps:\s*\[([\s\S]*?)\],\s*\},/g;
let m;
while ((m = blockRe.exec(src))) {
  const steps = [...m[3].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((s) => s[1].replace(/\\"/g, '"'));
  parsed.set(m[1], { summary: m[2].replace(/\\"/g, '"'), steps });
}

let failed = 0;
const fail = (msg) => { failed++; console.log("FAIL  " + msg); };
const pass = (msg) => console.log("PASS  " + msg);

if (parsed.size === 0) fail("could not parse howtoplay.tsx at all — the test's regex needs updating");
else pass(`parsed ${parsed.size} games out of howtoplay.tsx`);

// Every game in the app must be known to the characters, with identical rules.
for (const [key, rules] of parsed) {
  const mirror = GAMES.find((g) => g[0] === key);
  if (!mirror) { fail(`game "${key}" exists in the app but the characters do not know it`); continue; }
  if (mirror[2] !== rules.summary) {
    fail(`game "${key}" summary drifted\n        app:    ${JSON.stringify(rules.summary)}\n        chars:  ${JSON.stringify(mirror[2])}`);
    continue;
  }
  if (JSON.stringify(mirror[3]) !== JSON.stringify(rules.steps)) {
    fail(`game "${key}" steps drifted\n        app:    ${JSON.stringify(rules.steps)}\n        chars:  ${JSON.stringify(mirror[3])}`);
    continue;
  }
  pass(`game "${key}" matches the app`);
}

// And nothing invented in the other direction.
for (const [key] of GAMES) {
  if (!parsed.has(key)) fail(`characters know a game "${key}" that does not exist in the app`);
}

// Sanity on the rest of the briefing.
if (GAMES.length !== 14) fail(`expected 14 games, found ${GAMES.length}`); else pass("14 games");
if (CHARACTERS.length !== 20) fail(`expected 20 characters, found ${CHARACTERS.length}`); else pass("20 characters");
if (ENCLOSURES.length !== 4) fail(`expected 4 enclosures, found ${ENCLOSURES.length}`); else pass("4 enclosures");

for (const e of ENCLOSURES) {
  if (!PRODUCT_KNOWLEDGE.includes(e.name)) fail(`enclosure "${e.name}" missing from the briefing`);
}
if (ENCLOSURES.every((e) => PRODUCT_KNOWLEDGE.includes(e.name))) pass("every enclosure appears in the briefing");

for (const [price, name] of TIERS) {
  if (!PRODUCT_KNOWLEDGE.includes(price) || !PRODUCT_KNOWLEDGE.includes(name)) fail(`tier "${name}" missing from the briefing`);
}
if (TIERS.every(([p, n]) => PRODUCT_KNOWLEDGE.includes(p) && PRODUCT_KNOWLEDGE.includes(n))) pass("all reward tiers appear");
if (!PRODUCT_KNOWLEDGE.includes(GOAL)) fail("funding goal missing"); else pass(`funding goal ${GOAL} appears`);
if (!/never invent/i.test(PRODUCT_KNOWLEDGE)) fail("the never-invent money rule is missing"); else pass("money rule present");

console.log(`\n${failed === 0 ? "ALL PASS — the characters' knowledge matches the product" : `${failed} FAILURE(S)`}`);
process.exit(failed === 0 ? 0 : 1);
