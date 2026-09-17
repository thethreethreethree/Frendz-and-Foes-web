// Regenerate a Bingo dare deck from the owner's party-dares markdown.
//
//   node tools/bank/generate-dares.mjs docs/party-dares.md <out.ts> [EXPORT_NAME]
//
// Escaping is done by JSON.stringify, never by hand: a hand-escaped heredoc is what silently
// turned \b into a 0x08 byte earlier in this project, and what mangled this very file once.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];
const OUT = process.argv[3];
const EXPORT = process.argv[4] || "DARES";

const LETTERS = ["B", "I", "N", "G", "O"];
const lines = readFileSync(SRC, "utf8").split(/\r?\n/);

const entries = [];
for (const line of lines) {
  const m = /^- \*\*([BINGO])(\d+)\.\*\*\s+(.+?)\s*$/.exec(line);
  if (!m) continue;
  entries.push({ letter: m[1], num: Number(m[2]), text: m[3] });
}

// Validate BEFORE writing. A generator that emits on bad input is not a guard.
const problems = [];
if (entries.length !== 75) problems.push(`expected 75 dares, parsed ${entries.length}`);
entries.forEach((e, i) => {
  const n = i + 1;
  if (e.num !== n) problems.push(`entry ${i}: numbered ${e.letter}${e.num}, expected ${n}`);
  const expectedLetter = LETTERS[Math.floor((n - 1) / 15)];
  if (e.letter !== expectedLetter)
    problems.push(`${e.letter}${e.num}: ball ${n} belongs to column ${expectedLetter}`);
  if (!e.text) problems.push(`${e.letter}${e.num}: empty text`);
});
if (problems.length) {
  console.error("REFUSING TO GENERATE:\n" + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}

const body = entries.map((e) => "  " + JSON.stringify(e.text) + ",").join("\n");

const header = [
  "// Frendz Bingo dares, one per ball in order (index 0 = B1 ... index 74 = O75).",
  "//",
  "// GENERATED from docs/party-dares.md (the owner's written deck) by tools/bank/generate-dares.mjs.",
  "// Do not hand-edit: edit the markdown and re-run the generator.",
  "//",
  "// The markdown numbers its dares B1-B15, I16-I30, N31-N45, G46-G60, O61-O75 -- which is exactly",
  "// BINGO_BALLS order, so the array index IS the ball. The generator refuses to emit unless all 75",
  "// are present, contiguously numbered, and each in the column its number belongs to, because",
  "// dareForBall() looks the dare up POSITIONALLY: one missing line would silently shift every dare",
  "// after it onto the wrong ball, and nothing in the app would report an error.",
  "//",
  "// WHICH DECK SHIPS WHERE is decided at BUILD time, not here -- see apps/web/src/bingo/dares.ts.",
  "",
  `export const ${EXPORT}: string[] = [`,
  "",
].join("\n");

writeFileSync(OUT, header + body + "\n];\n", "utf8");
console.log(`wrote ${OUT}: ${entries.length} dares as ${EXPORT}`);
console.log(`first: ${entries[0].letter}${entries[0].num} ${entries[0].text}`);
console.log(`last:  ${entries[74].letter}${entries[74].num} ${entries[74].text}`);
