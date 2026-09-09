// What actually happened on a game night.
//
// WHY THIS EXISTS: rooms live in a Map in index.js and vanish on restart. Nothing recorded that a
// night happened — not which game, not how many played, not whether anyone finished. That data is
// unrecoverable by nature: you cannot backfill a game night nobody wrote down. And it answers the
// question that decides what gets built next — which of the fourteen games do people actually play,
// and do they finish them.
//
// RULES:
//   * NO IDENTITY, EVER. Players scan a QR with no account. peak_players is a COUNT; no names, no
//     ids, nothing about a person. There is no business question here that needs them, and a party
//     game should not quietly become a system holding data on people who never signed up.
//   * ONE LIVE SESSION PER ROOM, enforced by a partial unique index rather than by checking first.
//     Sockets reconnect in storms — a host's phone flapping would otherwise open five sessions for
//     one game, and the count of "nights" is the number this table exists to get right.
//   * peak_players IS A HIGH-WATER MARK, not a running total. People drift in and out of a party;
//     summing joins would report twenty players at a six-person night.
//   * COMPLETED IS ONLY TRUE IF THE GAME SAID SO. A room going quiet is not an ending — that is
//     precisely the abandonment this is meant to measure.
//
// Imported DYNAMICALLY like every other store, so an unopenable database degrades instead of
// killing the server (see the fail-safe restored in 2fd538f).

let db = null;
let logEvent = () => {};
let ready = false;

export async function initSessions() {
  try {
    const m = await import("./sqlite.js");
    db = m.db;
    logEvent = m.logEvent;
    ready = true;
    console.log("[ff-server] session tracking ready (sqlite)");
  } catch (err) {
    console.warn("[ff-server] session tracking unavailable:", err.message);
    ready = false;
  }
  return ready;
}

export const sessionsReady = () => ready;

const newId = () => "ses_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

/**
 * Begin a night, or return the one already running for this room.
 *
 * Called on every host/display join, which is deliberately often: there is no single reliable
 * "game started" moment across fourteen games, and a room's FIRST hosting join is the closest
 * honest proxy. The partial unique index is what makes calling it repeatedly safe.
 */
export function startSession(roomCode, { game = null, brandSlug = null } = {}) {
  if (!ready || !roomCode) return null;
  const room = String(roomCode).toUpperCase();
  try {
    const live = db.prepare("SELECT * FROM game_sessions WHERE room_code = ? AND ended IS NULL").get(room);
    if (live) {
      // A game identity can arrive after the session opened — the display joins before the host has
      // picked a game in some flows. Fill it in rather than leaving the night unattributed.
      if (game && !live.game) {
        db.prepare("UPDATE game_sessions SET game = ? WHERE id = ?").run(String(game), live.id);
        live.game = String(game);
      }
      return live;
    }
    const row = {
      id: newId(), room_code: room, game: game ? String(game) : null,
      brand_slug: brandSlug || null, started: Date.now(), ended: null,
      peak_players: 0, completed: 0,
    };
    db.prepare(`INSERT INTO game_sessions
      (id, room_code, game, brand_slug, started, ended, peak_players, completed)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      row.id, row.room_code, row.game, row.brand_slug, row.started, row.ended,
      row.peak_players, row.completed);
    logEvent("session.started", null, { room, game: row.game, brand: row.brand_slug });
    return row;
  } catch (err) {
    // A UNIQUE violation here means a concurrent join won the race — return their session, not an
    // error. Losing that race is normal and must not cost the caller anything.
    if (String(err.message || "").includes("UNIQUE")) {
      return db.prepare("SELECT * FROM game_sessions WHERE room_code = ? AND ended IS NULL").get(room) || null;
    }
    console.error("[ff-server] startSession failed:", err?.message || err);
    return null;
  }
}

/** Raise the high-water mark if this headcount beats it. Never lowers it. */
export function notePlayers(roomCode, count) {
  if (!ready || !roomCode) return;
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return;
  try {
    db.prepare(`UPDATE game_sessions SET peak_players = ?
                WHERE room_code = ? AND ended IS NULL AND peak_players < ?`)
      .run(Math.trunc(n), String(roomCode).toUpperCase(), Math.trunc(n));
  } catch { /* a headcount is not worth an exception */ }
}

/** Record that the game reached a real ending. Separate from ending the session: a finished game
 *  usually sits on its results screen for a while before everyone leaves. */
export function noteCompleted(roomCode) {
  if (!ready || !roomCode) return;
  try {
    db.prepare("UPDATE game_sessions SET completed = 1 WHERE room_code = ? AND ended IS NULL")
      .run(String(roomCode).toUpperCase());
  } catch { /* ignore */ }
}

/** Close the night. Idempotent: a second call finds no live row and does nothing. */
export function endSession(roomCode) {
  if (!ready || !roomCode) return;
  const room = String(roomCode).toUpperCase();
  try {
    const live = db.prepare("SELECT * FROM game_sessions WHERE room_code = ? AND ended IS NULL").get(room);
    if (!live) return;
    db.prepare("UPDATE game_sessions SET ended = ? WHERE id = ?").run(Date.now(), live.id);
    logEvent("session.ended", null, {
      room, game: live.game, minutes: Math.round((Date.now() - live.started) / 60000),
      peak: live.peak_players, completed: !!live.completed,
    });
  } catch (err) {
    console.error("[ff-server] endSession failed:", err?.message || err);
  }
}

/**
 * Any session left open when the process died. A crash or a deploy restart leaves rows with
 * ended = NULL forever, which would (a) block the next night in that room via the unique index and
 * (b) count a dead night as live in every figure. Called once at boot.
 *
 * They are closed at their last known moment rather than "now": a server that was down for two days
 * did not host a two-day game, and writing Date.now() would invent one.
 */
export function closeStaleSessions(maxHours = 12) {
  if (!ready) return { closed: 0 };
  const cutoff = Date.now() - maxHours * 3600_000;
  try {
    const stale = db.prepare("SELECT id, started FROM game_sessions WHERE ended IS NULL").all();
    let closed = 0;
    for (const s of stale) {
      const at = Math.min(Date.now(), s.started + maxHours * 3600_000);
      db.prepare("UPDATE game_sessions SET ended = ? WHERE id = ?").run(at, s.id);
      closed++;
    }
    if (closed) {
      console.log(`[ff-server] closed ${closed} session(s) left open by a restart`);
      logEvent("session.stale_closed", null, { closed, cutoff });
    }
    return { closed };
  } catch (err) {
    console.error("[ff-server] closeStaleSessions failed:", err?.message || err);
    return { closed: 0 };
  }
}

/** Most recent nights first. */
export function listSessions({ limit = 100, game = null, brandSlug = null } = {}) {
  if (!ready) return { ready: false, sessions: [] };
  const where = [];
  const args = [];
  if (game) { where.push("game = ?"); args.push(game); }
  if (brandSlug) { where.push("brand_slug = ?"); args.push(brandSlug); }
  const lim = Math.max(1, Math.min(500, Number(limit) || 100));
  return {
    ready: true,
    sessions: db.prepare(`SELECT * FROM game_sessions
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY started DESC LIMIT ?`).all(...args, lim),
  };
}

/**
 * Per-game totals, DERIVED on every call. `since` is epoch ms.
 *
 * Completion rate counts only ENDED sessions: a night still in progress has not failed to finish,
 * and including it would drag every rate down in real time while people are playing.
 */
export function sessionSummary({ since = null } = {}) {
  if (!ready) return { ready: false };
  const where = [];
  const args = [];
  if (since) { where.push("started >= ?"); args.push(Number(since)); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";

  const byGame = db.prepare(`
    SELECT COALESCE(game, 'unknown') game,
           COUNT(*) nights,
           COALESCE(SUM(CASE WHEN ended IS NOT NULL THEN 1 ELSE 0 END), 0) finished_nights,
           COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) completed,
           COALESCE(MAX(peak_players), 0) biggest,
           COALESCE(CAST(AVG(peak_players) AS INTEGER), 0) avg_players,
           CAST(AVG(CASE WHEN ended IS NOT NULL THEN (ended - started) / 60000.0 END) AS INTEGER) avg_minutes
    FROM game_sessions ${w} GROUP BY COALESCE(game, 'unknown') ORDER BY nights DESC`).all(...args);

  // COALESCE on every aggregate: SUM() and MAX() over ZERO rows return NULL in SQLite, not 0. An
  // empty database was handing the panel {"live":null,"completed":null,"biggest":null} where it had
  // promised counts. The frontend's ?? 0 happened to cover it, but an API that answers "null nights"
  // to "how many nights" is wrong at the source, and the next consumer will not be so lucky.
  const totals = db.prepare(`
    SELECT COUNT(*) nights,
           COALESCE(SUM(CASE WHEN ended IS NULL THEN 1 ELSE 0 END), 0) live,
           COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) completed,
           COALESCE(MAX(peak_players), 0) biggest
    FROM game_sessions ${w}`).get(...args);

  return { ready: true, byGame, totals };
}

/** Rows for CSV export. The caller formats. */
export function allSessionsForExport() {
  if (!ready) return { ready: false, sessions: [] };
  return {
    ready: true,
    sessions: db.prepare("SELECT * FROM game_sessions ORDER BY started ASC").all(),
  };
}
