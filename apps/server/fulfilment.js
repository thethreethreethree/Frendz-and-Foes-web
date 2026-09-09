// What we owe people, and how far along it is.
//
// WHY THIS EXISTS: the campaign sells custom characters — Founding Animal ($30) includes one, Head
// Keeper ($50) includes two — and the FAQ promises them within a month of the campaign closing.
// Before this, `PLANS` recorded how many a tier includes and nothing recorded whether any had been
// briefed, drawn or delivered. "Who is still owed a character" was unanswerable, and it becomes the
// most urgent question in the business the day the campaign ends.
//
// RULES:
//   * ROWS ARE DERIVED FROM THE TIER, AND THE DERIVATION IS IDEMPOTENT. syncFulfilmentFor() runs
//     whenever a backer's entitlements are touched. UNIQUE(backer_id, kind, seq) is what stops a
//     Head Keeper accruing two more character slots on every call — the same guard, for the same
//     reason, as payments.stripe_event_id.
//   * A DOWNGRADE NEVER DELETES WORK. If someone drops from two characters to one, the second row
//     is left alone rather than removed: it may already be drawn, and deleting it would erase the
//     record that we owed it. Cancelling is an explicit act with a reason.
//   * `due` IS NEVER GUESSED. The FAQ says "within a month of the campaign closing" and nobody has
//     told this codebase when the campaign closes. A default computed from an invented date would
//     silently become the answer, so due stays null until it is set.
//
// Imported DYNAMICALLY like every other store, so an unopenable database degrades instead of
// killing the server (see the fail-safe restored in 2fd538f).

let db = null;
let logEvent = () => {};
let ready = false;

export async function initFulfilment() {
  try {
    const m = await import("./sqlite.js");
    db = m.db;
    logEvent = m.logEvent;
    ready = true;
    console.log("[ff-server] fulfilment queue ready (sqlite)");
  } catch (err) {
    console.warn("[ff-server] fulfilment queue unavailable:", err.message);
    ready = false;
  }
  return ready;
}

export const fulfilmentReady = () => ready;

// Ordered: the queue screen sorts by this, and "further along" should sort later.
export const STATUSES = ["owed", "briefed", "in-progress", "review", "delivered", "cancelled"];
export const KINDS = ["custom-character", "physical", "other"];

// Work that still needs doing. `delivered` and `cancelled` are finished; everything else is open.
export const OPEN_STATUSES = ["owed", "briefed", "in-progress", "review"];

const newId = () => "ful_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

/**
 * Make sure a backer has one row per custom character their tier includes.
 *
 * Idempotent by construction: INSERT OR IGNORE against UNIQUE(backer_id, kind, seq). Safe to call
 * on every entitlement read, which is what makes it correct — there is no "on purchase" hook that
 * can be missed, so the rows appear the first time anyone looks at that backer.
 *
 * Returns { created } — how many rows this call actually added.
 */
export function syncFulfilmentFor(backerId, customCharacters = 0) {
  if (!ready || !backerId) return { created: 0 };
  const n = Number(customCharacters);
  if (!Number.isInteger(n) || n <= 0) return { created: 0 };

  const now = Date.now();
  let created = 0;
  for (let seq = 1; seq <= n; seq++) {
    try {
      const r = db.prepare(
        `INSERT OR IGNORE INTO fulfilment
           (id, backer_id, kind, seq, title, status, due, notes, asset_path, created, updated)
         VALUES (?,?,?,?,?,'owed',NULL,NULL,NULL,?,?)`
      ).run(newId(), backerId, "custom-character", seq,
            n === 1 ? "Custom character" : `Custom character ${seq} of ${n}`, now, now);
      if (r.changes) created++;
    } catch (err) {
      console.error("[ff-server] fulfilment sync failed:", err?.message || err);
    }
  }
  if (created) logEvent("fulfilment.created", backerId, { kind: "custom-character", count: created });
  return { created };
}

/** Add a one-off item that no tier implies — a poster, a replacement, a goodwill extra. */
export function addFulfilment(p = {}) {
  if (!ready) return { error: "The database is unavailable right now." };
  const backerId = String(p.backerId || "").trim();
  if (!backerId) return { error: "A fulfilment item needs a backer." };
  const kind = KINDS.includes(p.kind) ? p.kind : "other";
  const title = String(p.title || "").trim();
  if (!title) return { error: "Give the item a title so the queue is readable." };

  // Next free seq for this backer+kind, so a manual add cannot collide with a tier-derived row.
  const row = db.prepare("SELECT COALESCE(MAX(seq),0) n FROM fulfilment WHERE backer_id=? AND kind=?")
    .get(backerId, kind);
  const now = Date.now();
  const item = {
    id: newId(), backer_id: backerId, kind, seq: row.n + 1, title,
    status: STATUSES.includes(p.status) ? p.status : "owed",
    due: Number.isFinite(p.due) ? Math.trunc(p.due) : null,
    notes: p.notes || null, asset_path: p.assetPath || null, created: now, updated: now,
  };
  try {
    db.prepare(`INSERT INTO fulfilment
      (id, backer_id, kind, seq, title, status, due, notes, asset_path, created, updated)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      item.id, item.backer_id, item.kind, item.seq, item.title, item.status,
      item.due, item.notes, item.asset_path, item.created, item.updated);
  } catch (err) {
    return { error: err.message };
  }
  logEvent("fulfilment.added", backerId, { kind, title, status: item.status });
  return { item };
}

/**
 * Move an item along, or annotate it. Only the fields supplied are touched.
 *
 * The previous status is logged alongside the new one: "moved to delivered" is not a useful audit
 * line on its own, because it cannot tell you whether the item skipped review.
 */
export function updateFulfilment(id, patch = {}) {
  if (!ready) return { error: "The database is unavailable right now." };
  const before = db.prepare("SELECT * FROM fulfilment WHERE id = ?").get(String(id || ""));
  if (!before) return { error: "No such fulfilment item." };

  const sets = [];
  const args = [];
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) {
      return { error: `status must be one of ${STATUSES.join(", ")}.` };
    }
    sets.push("status = ?"); args.push(patch.status);
  }
  if (patch.due !== undefined) {
    // null clears it; anything else must be a real timestamp, never a coerced string.
    if (patch.due === null) { sets.push("due = NULL"); }
    else if (Number.isFinite(patch.due)) { sets.push("due = ?"); args.push(Math.trunc(patch.due)); }
    else return { error: "due must be a timestamp in milliseconds, or null." };
  }
  if (patch.notes !== undefined) { sets.push("notes = ?"); args.push(patch.notes || null); }
  if (patch.title !== undefined) {
    const t = String(patch.title || "").trim();
    if (!t) return { error: "Title cannot be empty." };
    sets.push("title = ?"); args.push(t);
  }
  if (patch.assetPath !== undefined) { sets.push("asset_path = ?"); args.push(patch.assetPath || null); }
  if (!sets.length) return { error: "Nothing to change." };

  sets.push("updated = ?"); args.push(Date.now());
  try {
    db.prepare(`UPDATE fulfilment SET ${sets.join(", ")} WHERE id = ?`).run(...args, before.id);
  } catch (err) {
    return { error: err.message };
  }
  const after = db.prepare("SELECT * FROM fulfilment WHERE id = ?").get(before.id);
  logEvent("fulfilment.updated", before.backer_id, {
    id: before.id, from: before.status, to: after.status, title: after.title,
  });
  return { item: after };
}

/** The queue. Open work first, then by due date, then oldest first. */
export function listFulfilment({ status = null, backerId = null, openOnly = false, limit = 500 } = {}) {
  if (!ready) return { ready: false, items: [] };
  const where = [];
  const args = [];
  if (status) { where.push("status = ?"); args.push(status); }
  if (backerId) { where.push("backer_id = ?"); args.push(backerId); }
  if (openOnly) { where.push(`status IN (${OPEN_STATUSES.map(() => "?").join(",")})`); args.push(...OPEN_STATUSES); }
  const lim = Math.max(1, Math.min(1000, Number(limit) || 500));

  // Join the backer so the queue shows a name, not an opaque id. The columns are `username` and
  // `full_name` — there is no `name` and no `email` on backers, which I assumed and the test caught
  // immediately. LEFT JOIN: a deleted backer must not make their outstanding promise vanish, since
  // the promise is exactly what still needs resolving.
  const sql = `SELECT f.*, b.username AS backer_name, b.full_name AS backer_full_name
               FROM fulfilment f LEFT JOIN backers b ON b.id = f.backer_id
               ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY CASE WHEN f.status IN ('delivered','cancelled') THEN 1 ELSE 0 END,
                        f.due IS NULL, f.due ASC, f.created ASC
               LIMIT ?`;
  return { ready: true, items: db.prepare(sql).all(...args, lim) };
}

/** Counts by status, plus how many open items are past their due date. Derived, never stored. */
export function fulfilmentSummary() {
  if (!ready) return { ready: false };
  const rows = db.prepare("SELECT status, COUNT(*) n FROM fulfilment GROUP BY status").all();
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of rows) byStatus[r.status] = r.n;

  const open = OPEN_STATUSES.reduce((a, s) => a + (byStatus[s] || 0), 0);
  const overdue = db.prepare(
    `SELECT COUNT(*) n FROM fulfilment
     WHERE due IS NOT NULL AND due < ? AND status IN (${OPEN_STATUSES.map(() => "?").join(",")})`
  ).get(Date.now(), ...OPEN_STATUSES).n;

  return { ready: true, byStatus, open, overdue, total: rows.reduce((a, r) => a + r.n, 0) };
}

/** Rows for CSV export. The caller formats. */
export function allFulfilmentForExport() {
  if (!ready) return { ready: false, items: [] };
  return {
    ready: true,
    items: db.prepare(
      `SELECT f.*, b.username AS backer_name, b.full_name AS backer_full_name
       FROM fulfilment f LEFT JOIN backers b ON b.id = f.backer_id
       ORDER BY f.created ASC`).all(),
  };
}
