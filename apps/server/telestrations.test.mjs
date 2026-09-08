// Drawing-input sanitising for Sketch Relay.  Run:  node apps/server/telestrations.test.mjs
//
// A submitted drawing is the only STRUCTURED input a player sends. Text was capped at 40 characters
// from the start; `strokes` accepted ANY array, kept it in memory for the whole game, and
// rebroadcast it to every player at the reveal. A phone makes a lot of points; a hand-rolled client
// makes far more.
//
// These strokes are drawn onto other people's screens, so the shape is checked rather than trusted.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEP = String.fromCharCode(92);
const SRV = "file:///" + HERE.split(SEP).join("/").split(" ").join("%20") + "/";
const { __test_sanitizeStrokes: sanitize } = await import(SRV + "telestrations.js");

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

const stroke = (points, color = "#fff", width = 4) => ({ points, color, width });

console.log("\n--- a normal drawing passes through unharmed ---");
{
  const drawing = [stroke([10, 10, 20, 20], "#ff0000", 6), stroke([5, 5, 6, 6])];
  const out = sanitize(drawing);
  check("both strokes kept", out.length, 2);
  check("points preserved", out[0].points, [10, 10, 20, 20]);
  check("colour preserved", out[0].color, "#ff0000");
  check("width preserved", out[0].width, 6);
}

console.log("\n--- the size limits actually bound it ---");
{
  // The case that motivated this: a client sending far more than a human could draw.
  const huge = Array.from({ length: 5000 }, () => stroke(Array.from({ length: 10000 }, (_, i) => i)));
  const out = sanitize(huge);
  check("stroke count capped", out.length, 400);
  check("points per stroke capped", out[0].points.length, 1200);
  // Bounded memory is the whole point: 5000x10000 numbers in, 400x1200 out.
  const total = out.reduce((n, s) => n + s.points.length, 0);
  check("total points bounded", total <= 400 * 1200, true);
}

console.log("\n--- junk is dropped, not stored ---");
{
  check("non-stroke entries dropped", sanitize([null, undefined, 42, "nope", {}]).length, 0);
  check("missing points dropped", sanitize([{ color: "#fff", width: 4 }]).length, 0);
  check("points that are not numbers dropped",
    sanitize([stroke(["a", "b", "c", "d"])]).length, 0);
  check("NaN and Infinity filtered out",
    sanitize([stroke([1, 2, NaN, Infinity, 3, 4])])[0].points, [1, 2, 3, 4]);
  check("a stroke with a single coordinate is dropped", sanitize([stroke([5])]).length, 0);
}

console.log("\n--- values that reach a canvas are constrained ---");
{
  // color goes into fillStyle/strokeStyle on every other player's screen.
  const long = "x".repeat(500);
  check("colour length capped", sanitize([stroke([1, 2], long)])[0].color.length, 24);
  check("absurd width clamped", sanitize([stroke([1, 2], "#fff", 99999)])[0].width, 64);
  check("negative width clamped", sanitize([stroke([1, 2], "#fff", -10)])[0].width, 1);
  check("non-numeric width falls back", sanitize([stroke([1, 2], "#fff", "wide")])[0].width, 4);
  check("missing colour falls back", sanitize([{ points: [1, 2] }])[0].color, "#fff");
}

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
