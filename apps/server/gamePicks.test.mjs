// Game picks. This enforces a promise printed on a reward card — "any five games you choose" — so
// the failures that matter are the ones that either give away more than was sold, or refuse a
// backer a game they paid for. The second is worse: it is indistinguishable from the product being
// broken, and it happens to someone who has already paid.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "pz-picks-"));
process.env.DB_PATH = join(TMP, "picks.db");
process.env.AUTH_DIR = join(TMP, "auth");

const P = await import("./gamePicks.js");
await P.initGamePicks();

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

// Entitlements as entitlementsFor() would return them.
const zooPass   = { active: true, games: 5,     allGames: false };
const founding  = { active: true, games: 10,    allGames: false };
const headKeep  = { active: true, games: "all", allGames: true };
const noPlan    = { active: false, games: 0,    allGames: false };

check("picks are ready", P.gamePicksReady());
check("the canonical game list has 14 entries", P.VALID_GAMES.size === 14, String(P.VALID_GAMES.size));
check("a real slug is recognised", P.isGame("murder"));
check("the OLD wrong slug is not", !P.isGame("murder2"),
      "murder2 was recorded for weeks by the session tracker; it must never satisfy a pick");

// --- choosing ------------------------------------------------------------------------------------
const A = "backer-a";
check("a backer starts with nothing chosen", P.picksFor(A).length === 0);
check("picking works", !!P.pickGame(A, "murder", zooPass).picks);
check("the pick is remembered", P.picksFor(A).includes("murder"));

const dup = P.pickGame(A, "murder", zooPass);
check("picking the same game twice does NOT burn a second slot",
      dup.already === true && P.picksFor(A).length === 1, JSON.stringify(dup));

check("an invented game is refused", !!P.pickGame(A, "quidditch", zooPass).error);
check("someone with no plan cannot pick", !!P.pickGame("nobody", "trivia", noPlan).error);

// --- the allowance is a real limit -----------------------------------------------------------------
for (const g of ["trivia", "bingo", "feud", "codenames"]) P.pickGame(A, g, zooPass);
check("five picks fit a Zoo Pass", P.picksFor(A).length === 5, String(P.picksFor(A).length));

const sixth = P.pickGame(A, "ballpark", zooPass);
check("a sixth is REFUSED, not silently dropped", !!sixth.error, JSON.stringify(sixth));
check("and the refusal says how to fix it", /remove one/i.test(sixth.error || ""), sixth.error);
check("the sixth game was not stored anyway", !P.picksFor(A).includes("ballpark"));

// --- the allowance comes from the PLAN, not from storage ---------------------------------------------
const upgraded = P.pickStateFor(A, founding);
check("upgrading to ten immediately allows five more",
      upgraded.allowance === 10 && upgraded.remaining === 5, JSON.stringify(upgraded));
check("and the sixth pick now succeeds", !!P.pickGame(A, "ballpark", founding).picks);

const downgraded = P.pickStateFor(A, zooPass);
check("downgrading is visible as over-allowance",
      downgraded.overAllowance === true && downgraded.remaining === 0, JSON.stringify(downgraded));

// --- unpicking -------------------------------------------------------------------------------------
P.unpickGame(A, "ballpark");
check("a pick can be given back", !P.picksFor(A).includes("ballpark"));
check("and the freed slot is reusable", !!P.pickGame(A, "headsup", founding).picks);

// --- canPlay: the question the game gate actually asks -----------------------------------------------
check("a chosen game is allowed", P.canPlay(A, "murder", founding).ok === true);

const B = "backer-b";
P.pickGame(B, "murder", zooPass);
P.pickGame(B, "trivia", zooPass);
P.pickGame(B, "bingo", zooPass);
P.pickGame(B, "feud", zooPass);
P.pickGame(B, "codenames", zooPass);
const refused = P.canPlay(B, "afterdark", zooPass);
check("an unchosen game, with the allowance full, is refused",
      refused.ok === false && refused.reason === "not-picked", JSON.stringify(refused));
check("and the refusal explains itself in plain words",
      /covers 5 games/.test(refused.error || ""), refused.error);

// THE ONE THAT PROTECTS A PAYING BACKER FROM A SETTINGS SCREEN.
const C = "backer-c";
const first = P.canPlay(C, "trivia", zooPass);
check("a backer who has picked NOTHING can just start playing",
      first.ok === true && first.reason === "auto-picked", JSON.stringify(first));
check("and that first game is claimed as one of their picks", P.picksFor(C).includes("trivia"),
      "otherwise every night would silently spend a new slot");
check("playing it again does not spend a second slot",
      P.canPlay(C, "trivia", zooPass).ok === true && P.picksFor(C).length === 1);

// --- Head Keeper never picks anything ---------------------------------------------------------------
const D = "backer-d";
check("every game is allowed on the top tier", P.canPlay(D, "afterdark", headKeep).ok === true);
check("and nothing was stored for them", P.picksFor(D).length === 0,
      "the top tier must not accumulate rows it never needs");
check("the top tier is told there is nothing to choose", !!P.pickGame(D, "trivia", headKeep).error);

// --- refusing safely ---------------------------------------------------------------------------------
check("no plan cannot play", P.canPlay("nobody", "trivia", noPlan).ok === false);
check("an UNKNOWN game is allowed rather than breaking a new release",
      P.canPlay(A, "some-future-game", founding).reason === "unknown-game");

console.log(fails ? `\n${fails} FAILED` : "\nall game-pick checks passed");
process.exit(fails ? 1 : 0);
