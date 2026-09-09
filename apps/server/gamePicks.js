// Which games a backer chose, and whether they may play a given one.
//
// WHY THIS EXISTS: the reward tiers sell a COUNT, not a list — Zoo Pass is "any five games you
// choose", Founding Animal "any ten" (owner decision 2026-09-09, on the reward card). Until now
// nothing recorded a choice and nothing checked one: hostEntitled() asked only whether a plan was
// ACTIVE, so every paying backer could host all fourteen. The promise on the card was real; the
// enforcement behind it was not.
//
// RULES:
//   * THE ALLOWANCE COMES FROM THE PLAN, NEVER FROM THIS TABLE. How many picks a backer gets is
//     read from PLANS at the moment of asking. Storing it here would let it drift: upgrade someone
//     from five to ten and a stored allowance would quietly keep saying five.
//   * "all" IS NOT A NUMBER. Head Keeper has every game, so it never picks anything and canPlay()
//     short-circuits before any of this is consulted.
//   * PICKS ARE NOT SPENT ON A GAME THAT DOES NOT EXIST. Only canonical slugs from
//     productKnowledge.js GAMES are accepted — see gameSlugs.test.mjs for why that matters.
//   * UNPICKING IS ALLOWED, and deliberately so. A backer who picks badly in the first week and is
//     then locked in for six months has been sold a worse product than the card describes. The
//     churn is visible in `events` if it ever needs a limit.
//
// Imported DYNAMICALLY like every other store, so an unopenable database degrades instead of
// killing the server (see the fail-safe restored in 2fd538f).

import { GAMES } from "./productKnowledge.js";

let db = null;
let logEvent = () => {};
let ready = false;

export async function initGamePicks() {
  try {
    const m = await import("./sqlite.js");
    db = m.db;
    logEvent = m.logEvent;
    ready = true;
    console.log("[ff-server] game picks ready (sqlite)");
  } catch (err) {
    console.warn("[ff-server] game picks unavailable:", err.message);
    ready = false;
  }
  return ready;
}

export const gamePicksReady = () => ready;

/** The canonical slugs, straight from the product definition. One source, no second list. */
export const VALID_GAMES = new Set(GAMES.map((g) => g[0]));

export const isGame = (slug) => VALID_GAMES.has(String(slug || ""));

/** The games this backer has chosen. Always an array, even with no database. */
export function picksFor(backerId) {
  if (!ready || !backerId) return [];
  try {
    return db.prepare("SELECT game FROM game_picks WHERE backer_id = ? ORDER BY picked ASC")
      .all(String(backerId)).map((r) => r.game);
  } catch { return []; }
}

/**
 * The whole picture for one backer: how many they may choose, what they chose, what is left.
 *
 * `allowance` is derived from the entitlement passed in, never stored, so it always reflects the
 * plan they hold RIGHT NOW rather than the one they held when they first picked.
 */
export function pickStateFor(backerId, entitlement) {
  const allGames = !!(entitlement && entitlement.allGames);
  const active = !!(entitlement && entitlement.active);
  const allowance = allGames ? "all" : (active ? Number(entitlement.games) || 0 : 0);
  const chosen = picksFor(backerId);
  return {
    ready,
    active,
    allGames,
    allowance,                                       // a number, or "all"
    chosen,
    remaining: allGames ? "all" : Math.max(0, allowance - chosen.length),
    // Over-allowance is possible WITHOUT anyone cheating: a backer on ten who is downgraded to five
    // keeps their ten rows. Surfaced rather than silently trimmed — see canPlay().
    overAllowance: !allGames && chosen.length > allowance,
  };
}

/**
 * Choose a game. Returns { picks } or { error }.
 *
 * Refuses rather than silently trimming when the allowance is full: a backer who thinks they picked
 * a sixth game and finds it missing later has been lied to by the interface.
 */
export function pickGame(backerId, game, entitlement) {
  if (!ready) return { error: "The database is unavailable right now." };
  if (!backerId) return { error: "No backer." };
  const slug = String(game || "").trim();
  if (!isGame(slug)) return { error: "That is not one of the games." };

  const st = pickStateFor(backerId, entitlement);
  if (!st.active) return { error: "You need an active PlayZoo plan to choose games." };
  if (st.allGames) return { error: "Your plan already includes every game — there is nothing to choose." };
  if (st.chosen.includes(slug)) return { picks: st.chosen, already: true };
  if (st.remaining <= 0) {
    return { error: `Your plan covers ${st.allowance} games and you have chosen ${st.chosen.length}. Remove one first.` };
  }

  try {
    db.prepare("INSERT OR IGNORE INTO game_picks (backer_id, game, picked) VALUES (?,?,?)")
      .run(String(backerId), slug, Date.now());
  } catch (err) {
    return { error: err.message };
  }
  logEvent("game.picked", backerId, { game: slug });
  return { picks: picksFor(backerId) };
}

/** Give a pick back. See the note at the top on why this is allowed. */
export function unpickGame(backerId, game) {
  if (!ready) return { error: "The database is unavailable right now." };
  const slug = String(game || "").trim();
  if (!isGame(slug)) return { error: "That is not one of the games." };
  try {
    db.prepare("DELETE FROM game_picks WHERE backer_id = ? AND game = ?").run(String(backerId), slug);
  } catch (err) {
    return { error: err.message };
  }
  logEvent("game.unpicked", backerId, { game: slug });
  return { picks: picksFor(backerId) };
}

/**
 * May this backer host this game? The question hostEntitled() actually needs answered.
 *
 * Returns { ok } or { ok:false, reason, error }.
 *
 * NOTE the over-allowance case: a backer downgraded from ten games to five keeps ten rows, and this
 * lets them play all ten until they trim. That is deliberate. The alternative is silently choosing
 * five of their ten to revoke, and there is no honest way to pick which — better that they keep
 * what they chose and the founder can see the state.
 */
export function canPlay(backerId, game, entitlement) {
  if (!entitlement || !entitlement.active) {
    return { ok: false, reason: "no-plan", error: "Hosting needs an active PlayZoo plan." };
  }
  if (entitlement.allGames) return { ok: true, reason: "all-games" };

  // An unknown game cannot be checked against a pick list, and refusing here would break a new
  // game the moment it shipped. Allowed, and logged, so it surfaces rather than silently passing.
  if (!isGame(game)) return { ok: true, reason: "unknown-game" };

  // No database means no pick list to check. Fail OPEN, for the same reason hostEntitled() does:
  // a storage blip must not become "the game you paid for is gone".
  if (!ready) return { ok: true, reason: "picks-unavailable" };

  const chosen = picksFor(backerId);
  if (chosen.includes(game)) return { ok: true, reason: "picked" };

  // Nothing chosen yet is NOT a refusal. A backer who has just paid and gone straight to a game
  // should be able to play it — this claims the game as one of their picks rather than turning
  // their first night into a settings screen.
  const allowance = Number(entitlement.games) || 0;
  if (chosen.length < allowance) {
    const r = pickGame(backerId, game, entitlement);
    if (r.error) return { ok: false, reason: "pick-failed", error: r.error };
    logEvent("game.auto_picked", backerId, { game });
    return { ok: true, reason: "auto-picked" };
  }

  return {
    ok: false,
    reason: "not-picked",
    error: `Your plan covers ${allowance} games and this is not one of the ones you chose.`,
  };
}

/** Every backer's picks, for the founder page. */
export function allPicks() {
  if (!ready) return { ready: false, picks: [] };
  return {
    ready: true,
    picks: db.prepare(`SELECT p.backer_id, p.game, p.picked, b.username AS backer_name
                       FROM game_picks p LEFT JOIN backers b ON b.id = p.backer_id
                       ORDER BY p.picked DESC`).all(),
  };
}
