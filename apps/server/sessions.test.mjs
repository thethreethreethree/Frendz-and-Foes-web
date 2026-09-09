// Game session tracking. Weighted to the two failures that would silently produce wrong business
// numbers: duplicate sessions from reconnect storms, and sessions left open by a restart. Both
// corrupt the count of "how many nights happened", which is the only thing this table exists for.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "pz-ses-"));
process.env.DB_PATH = join(TMP, "ses.db");
process.env.AUTH_DIR = join(TMP, "auth");

const S = await import("./sessions.js");
await S.initSessions();

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

check("session tracking is ready", S.sessionsReady());

// --- starting -------------------------------------------------------------------------------
const a = S.startSession("abcd", { game: "trivia" });
check("a session starts", !!a && a.game === "trivia");
check("room codes are normalised to upper case", a.room_code === "ABCD", a?.room_code);

// --- THE ONE THAT MATTERS: reconnect storms ----------------------------------------------------
// Sockets flap. startSession is called on EVERY hosting join, so without the partial unique index
// a host whose phone wobbles opens a new "night" each time and the headline number is fiction.
const again = [];
for (let i = 0; i < 8; i++) again.push(S.startSession("ABCD", { game: "trivia" }));
check("eight more joins return the SAME session", again.every((r) => r && r.id === a.id));
check("and only one session exists for that room",
      S.listSessions({}).sessions.filter((s) => s.room_code === "ABCD").length === 1,
      String(S.listSessions({}).sessions.length));

// A game identity arriving late must be filled in, not dropped.
const noGame = S.startSession("LATE", {});
check("a session can start before the game is known", !!noGame && noGame.game === null);
const named = S.startSession("LATE", { game: "codenames" });
check("a later join names the game on the SAME session",
      named.id === noGame.id && named.game === "codenames", JSON.stringify(named));

// --- players are a high-water mark, not a sum ----------------------------------------------------
S.notePlayers("ABCD", 4);
S.notePlayers("ABCD", 9);
S.notePlayers("ABCD", 6);          // people drift out; the peak must not drop
let live = S.listSessions({}).sessions.find((s) => s.id === a.id);
check("peak_players keeps the high-water mark", live.peak_players === 9, String(live.peak_players));
S.notePlayers("ABCD", -3);
S.notePlayers("ABCD", NaN);
live = S.listSessions({}).sessions.find((s) => s.id === a.id);
check("junk headcounts are ignored, not stored", live.peak_players === 9, String(live.peak_players));

// --- completion is explicit ------------------------------------------------------------------
check("a session does not start completed", live.completed === 0);
S.noteCompleted("ABCD");
live = S.listSessions({}).sessions.find((s) => s.id === a.id);
check("completion is recorded when the game says so", live.completed === 1);

// --- ending ------------------------------------------------------------------------------------
S.endSession("ABCD");
live = S.listSessions({}).sessions.find((s) => s.id === a.id);
check("ending stamps a time", live.ended !== null);
const endedAt = live.ended;
S.endSession("ABCD");
live = S.listSessions({}).sessions.find((s) => s.id === a.id);
check("ending twice does not move the timestamp", live.ended === endedAt);

// A room reopened after the night ended is a NEW night, not a resurrection of the old one.
const b = S.startSession("ABCD", { game: "bingo" });
check("reopening a closed room starts a NEW session", b.id !== a.id && b.game === "bingo");
check("so the room now has two nights on record",
      S.listSessions({}).sessions.filter((s) => s.room_code === "ABCD").length === 2);

// --- stale sessions from a crash or deploy -------------------------------------------------------
// A restart leaves ended = NULL forever: it blocks the next night via the unique index AND counts a
// dead night as live in every figure.
const openBefore = S.listSessions({}).sessions.filter((s) => s.ended === null).length;
check("there are open sessions to clean up", openBefore > 0, String(openBefore));
const { closed } = S.closeStaleSessions(12);
check("stale sessions are closed at boot", closed === openBefore, `${closed} vs ${openBefore}`);
check("nothing is left open afterwards",
      S.listSessions({}).sessions.every((s) => s.ended !== null));
check("a closed room can host again immediately", !!S.startSession("ABCD", { game: "trivia" }));

// --- summary is derived ---------------------------------------------------------------------------
const sum = S.sessionSummary();
check("summary reports per-game nights", sum.ready && sum.byGame.length >= 2, JSON.stringify(sum.byGame));
const triviaRow = sum.byGame.find((g) => g.game === "trivia");
check("trivia's nights are counted", triviaRow && triviaRow.nights === 2, JSON.stringify(triviaRow));
check("a session with no game is labelled, not dropped",
      sum.byGame.some((g) => g.game === "codenames"), JSON.stringify(sum.byGame.map((g) => g.game)));
check("totals count the live one", sum.totals.live === 1, JSON.stringify(sum.totals));

console.log(fails ? `\n${fails} FAILED` : "\nall session checks passed");
process.exit(fails ? 1 : 0);
