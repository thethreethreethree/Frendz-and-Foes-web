// Regression test for the stage-direction stripper.  Run:  node apps/server/speech.test.mjs
//
// This exists because the stripper has now broken the characters' voices twice, in opposite
// directions, and both times it looked fine on the one example it was tuned against:
//
//   1. Deleting everything between asterisks ate emphasis: "I have a *business* degree" -> "a degree".
//   2. Judging narration by LENGTH ate every emphasis of 3+ words, mid-sentence, leaving broken
//      fragments: "This is the *best deal in town*, pal." -> "This is the, pal."
//
// The rule that actually separates the two is POSITION: a stage direction stands alone between
// sentences; emphasis sits inside one. A bare action verb ("*shrugs*") is narration anywhere.
// Both halves need cases here - a test with only narration cases passes while emphasis is destroyed.

import { stripStageDirections as strip } from "./speech.js";

const CASES = [
  // --- narration must be REMOVED ---
  ["narration, line opener", "*straightens non-existent bow tie* Right, what do you need?", "Right, what do you need?"],
  ["narration between sentences", "Sure thing. *leans back in chair* What else?", "Sure thing. What else?"],
  ["narration is the whole line", "*shrugs*", ""],
  ["bare action verb mid-sentence", "I will do it *shrugs* later.", "I will do it later."],
  ["narration at line end", "Right, what do you need? *sighs*", "Right, what do you need?"],

  // --- emphasis must KEEP its words ---
  ["one word", "I have a *business* degree, pal.", "I have a business degree, pal."],
  ["two words", "This is *genuinely rare*, my friend.", "This is genuinely rare, my friend."],
  ["three words", "This is the *best deal in town*, pal.", "This is the best deal in town, pal."],
  ["four words", "You are *missing out on this*, believe me.", "You are missing out on this, believe me."],
  ["contains a comma", "It is *rare, pristine* stock.", "It is rare, pristine stock."],
  ["bold, long", "Do **NOT** buy it. It is **the finest left sock available**.", "Do NOT buy it. It is the finest left sock available."],
  ["underscore, short", "That is _absolutely_ authentic.", "That is absolutely authentic."],
  ["underscore, long", "That is _the real deal here_, pal.", "That is the real deal here, pal."],
  ["opens with an action verb but is emphasis", "Pal, *check this out*, 97% authentic.", "Pal, check this out, 97% authentic."],

  // --- delivery that must survive untouched ---
  ["ellipses are load-bearing", "Well... I mean... maybe.", "Well... I mean... maybe."],
  ["plain line", "Do NOT buy it.", "Do NOT buy it."],
];

let failed = 0;
for (const [label, input, want] of CASES) {
  const got = strip(input);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    console.log(`        in:   ${JSON.stringify(input)}`);
    console.log(`        got:  ${JSON.stringify(got)}`);
    console.log(`        want: ${JSON.stringify(want)}`);
  }
}
console.log(`\n${failed === 0 ? `ALL ${CASES.length} PASS` : `${failed} FAILURE(S)`}`);
process.exit(failed === 0 ? 0 : 1);
