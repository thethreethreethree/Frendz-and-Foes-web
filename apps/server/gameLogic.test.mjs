// Game rule logic that had real bugs.  Run:  node apps/server/gameLogic.test.mjs
//
// Both were found by tracing the rules rather than by running the games, and neither would have
// thrown an error - they just quietly produced the wrong outcome, which is the kind of bug a party
// game hides best.
//
// The logic is re-implemented here exactly as the engines run it. The engines' own copies are only
// reachable through a live socket game; asserting the rules directly is what makes the edge cases
// testable at all.

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

// --- Solo Clue: identical clues cancel ------------------------------------------------------------
// Keys are words PLAYERS chose. With a plain object, counts["constructor"] reads Object's own
// constructor (truthy) rather than undefined, so the count never reaches 2 and the clue never
// cancels - a guaranteed way to beat the rule, using an ordinary English word.
const norm = (w) => String(w || "").trim().toLowerCase();
function cancelClues(clueList) {
  const clues = new Map(clueList.map(([p, w]) => [p, w]));
  const counts = new Map();
  for (const w of clues.values()) counts.set(norm(w), (counts.get(norm(w)) || 0) + 1);
  const cancelled = [], survivors = [];
  for (const [pid, w] of clues) {
    if ((counts.get(norm(w)) || 0) >= 2) cancelled.push(w);
    else survivors.push({ by: pid, word: w });
  }
  return { cancelled, survivors };
}

console.log("\n--- Solo Clue: identical clues cancel ---");
{
  const r = cancelClues([["p1", "banana"], ["p2", "banana"], ["p3", "kiwi"]]);
  check("the duplicate pair cancels", r.cancelled, ["banana", "banana"]);
  check("the unique clue survives", r.survivors.map((s) => s.word), ["kiwi"]);
}
{
  const r = cancelClues([["p1", "Banana"], ["p2", " banana "], ["p3", "BANANA"]]);
  check("case and spacing do not dodge it", r.cancelled.length, 3);
  check("nothing survives", r.survivors.length, 0);
}
{
  // THE BUG: these two words beat cancellation entirely before the fix.
  for (const word of ["constructor", "__proto__"]) {
    const r = cancelClues([["p1", word], ["p2", word]]);
    check(`"${word}" cancels like any other word`, r.cancelled.length, 2);
  }
}
{
  const r = cancelClues([["p1", "toString"], ["p2", "valueOf"], ["p3", "hasOwnProperty"]]);
  check("distinct object-ish words all survive", r.survivors.length, 3);
}
{
  const r = cancelClues([["p1", "sun"], ["p2", "sun"], ["p3", "sun"]]);
  check("three of a kind all cancel", r.cancelled.length, 3);
}

// --- Ballpark: closest WITHOUT going over ---------------------------------------------------------
function winningValue(guesses, answer) {
  const values = [...guesses];
  if (!values.length) return null;                       // no guesses: nobody can win
  const notOver = values.filter((v) => v <= answer);
  return notOver.length ? Math.max(...notOver) : Math.min(...values);
}

console.log("\n--- Ballpark: closest without going over ---");
check("the highest guess not over wins", winningValue([10, 40, 55], 50), 40);
check("an exact hit wins", winningValue([10, 50, 55], 50), 50);
check("if everyone overshoots, the lowest wins", winningValue([60, 70, 80], 50), 60);
check("a single guess wins by default", winningValue([99], 50), 99);
// THE BUG: Math.min() of nothing is Infinity, which JSON turns into null in the snapshot and leaves
// a round nobody can win. Reachable when the host advances manually with no guesses in.
check("no guesses at all yields no winner, not Infinity", winningValue([], 50), null);
check("and it is not Infinity", winningValue([], 50) === Infinity, false);

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
