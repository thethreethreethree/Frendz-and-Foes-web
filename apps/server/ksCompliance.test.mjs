// Does the campaign copy still say the thing Kickstarter rejects?
//
// WHY THIS EXISTS: the owner's other project, Zwaptz, was pulled before launch. The reviewer's words:
// "you mention that 'Zwaptz is running now'... This currently frames the campaign as support for your
// ongoing operational costs... reframe the project so it's clearly funding a specific, new, finite
// piece of work or deliverable."
//
// PlayZoo's page had the identical framing in TWELVE places, plus a line inviting the reviewer to go
// and play the games -- which are locked behind GAMES_OPEN, so that link shows a lock screen. Copy
// gets rewritten often and by hand; the phrase that sank the sister project is a natural thing to
// type. This makes it fail here instead of at review.
//
// WHAT IT DOES NOT DO: flag the honest negations. "None of it covers running costs" is the FIX, not
// the bug, and a test that cannot tell those apart would fire on correct copy until someone disabled
// it. So cost words are judged per sentence and only fail when the sentence makes no denial.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

// Only the copy that actually reaches Kickstarter is judged.
//
// campaign-fields.md is half paste-ready copy and half my notes ABOUT that copy -- and the notes
// necessarily quote the banned phrases to explain why they are banned. Scanning the whole file would
// make the explanation trip the guard. The fenced blocks are the part that gets pasted.
const fenced = (md) => (md.match(/```[\s\S]*?```/g) || []).join("\n");
const visible = (html) =>
  html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const SURFACES = [
  ["campaign-fields.md (paste-ready blocks)", fenced(read("kickstarter/campaign-fields.md"))],
  ["body.html (visible text)", visible(read("kickstarter/body.html"))],
  // Rex and John answer backers live from this file. If it still says the campaign funds an
  // operating business, the page complies and the two characters contradict it in chat.
  ["productKnowledge.js", read("apps/server/productKnowledge.js")],
];

// --- claim 1: PlayZoo is already an operating, public product -------------------------------------
// These have no legitimate affirmative use in campaign copy. The product is locked: /api/status
// reports gamesOpen:false until the campaign closes.
const OPERATING = [
  /already works/i,
  /already runs/i,
  /already running/i,
  /\bis running now\b/i,
  /\bit's running software\b/i,
  /\bplay it (today|right now)\b/i,
  /\bgo play it right now\b/i,
  /\ball working today\b/i,
  /\bworks today\b/i,
  /\bruns today\b/i,
  /prod the whole thing/i,
];

for (const [name, text] of SURFACES) {
  for (const re of OPERATING) {
    const m = text.match(re);
    check(`${name}: no "${re.source.replace(/\\b|\\/g, "")}"`, !m,
          m ? `found "${m[0]}" -- this is the framing that got Zwaptz pulled` : "");
  }
}

// --- claim 2: the money pays continuous business costs --------------------------------------------
// "hosting" and "running costs" are allowed, but only in a sentence that DENIES they are funded.
// That is the difference between the violation and its correction, and a guard that cannot see the
// difference is worse than no guard.
const COSTY = /(running costs|ongoing costs?|hosting|server costs|operational costs?|business expenses)/i;
const DENIED = /\b(not|never|no[nt]?e|doesn't|does not|don't|do not|isn't|rather than|instead of|after launch|subscriptions)\b/i;

for (const [name, text] of SURFACES) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => COSTY.test(s));
  const bare = sentences.filter((s) => !DENIED.test(s));
  check(`${name}: every mention of ongoing costs denies the campaign pays them`,
        bare.length === 0,
        bare.length ? `undenied: "${bare[0].trim().slice(0, 150)}"` : "");
}

// --- claim 3: the four spend buckets are finite deliverables ---------------------------------------
// The reviewer asked for "a specific, new, finite piece of work or deliverable". Hosting was one of
// the four buckets on the page; it is now system development -- building the thing, not running it.
const spend = read("kickstarter/body.html");
check("no spend bucket is servers or hosting",
      !/<b>Keep the zoo standing\.<\/b>/.test(spend),
      "that bucket was literally 'Servers and hosting'");
check("a spend bucket is development work, not a cost centre",
      /<b>System development\.<\/b>/.test(spend),
      "owner's call 2026-09-10: the funds BUILD the thing, they do not keep it running");

// The reviewer did not just ask Zwaptz to delete a claim -- they asked for the opposite claim to be
// made: "reframe the project so it's clearly funding a specific, new, finite piece of work". Saying
// nothing about the stage is how the page ended up implying it was live. So the stage must be STATED.
check("the page states outright that PlayZoo is in development",
      /PlayZoo is in development/i.test(spend),
      "block 01 must name the stage, not leave it to be inferred");
check("and says the money is not keeping anything running",
      /nothing is running yet|isn't one running yet/i.test(spend));

// --- claim 4: the page does not promise a reviewer something the lock screen contradicts ------------
// The campaign told people to go and try the games. GAMES_OPEN is false, so the invitation resolves
// to "the games unlock when our Kickstarter wraps". A reviewer clicking that reads it as a live
// product that is closed to them -- the worst of both readings.
const fields = read("kickstarter/campaign-fields.md");
check("the campaign states the games are not open to the public yet",
      /not open to the public/i.test(fields),
      "the reframe rests on saying this plainly at least once");
check("and that backers get in first when it closes",
      /backers get in first|open to backers first/i.test(fields));

// --- the refund policy exists and is the compliant kind --------------------------------------------
// The reviewer named TWO fields on Zwaptz: Risks, and the refund policy. PlayZoo had no refund
// policy at all, which is not a safe way to have no violation in one.
check("a refund policy exists", /## 6\. Refund policy/.test(fields));
check("it says a pledge buys named things, not general support",
      /not a donation and it is not general support for a business/i.test(fields));
// Owner's call 2026-09-10: promise nothing the platform does not already provide.
check("it promises no refund the platform cannot deliver",
      /pledges are not refundable/i.test(fields) && !/refund arranged directly/i.test(fields),
      "an informal 'we'll sort you out' is the same liability with none of the clarity");
check("the risks field leads with the development stage",
      /PlayZoo is in development/i.test(fields),
      "this is the field the reviewer quoted on the sister project");

console.log(fails ? `\n${fails} FAILED` : "\nall Kickstarter compliance checks passed");
process.exit(fails ? 1 : 0);
