// A venue as a CUSTOMER, not as a colour scheme.
//
// WHY THIS EXISTS: `brands` holds a venue's theming and nothing else — colours, fonts, game labels.
// It has no contact, no contract, no plan, no billing. The campaign sells white-label directly
// ("Bars, weddings, launches, and office parties… a fully branded PlayZoo"), so the product could be
// THEMED for a venue but not SOLD to one.
//
// RULES:
//   * NOTHING DERIVABLE IS STORED. No revenue column, no session count, no usage total. Money is in
//     `payments` carrying brand_slug; nights are in `game_sessions` carrying brand_slug. Both are
//     queries over data that already exists, and a stored total is a number that drifts.
//   * ONE SLUG. A venue uses the same slug as its brand, so a venue can never end up wearing
//     somebody else's branding through an id pair that came apart.
//   * MONTHLY. The owner's pricing decision (2026-09-09, §7.1 of the design doc), so `renews` is a
//     monthly date and `price_cents` is what they pay each month.
//   * A VENUE IS NEVER DELETED, only churned. Their payments and their game nights still reference
//     the slug; removing the venue would orphan real history.
//
// Imported DYNAMICALLY like every other store, so an unopenable database degrades instead of
// killing the server (see the fail-safe restored in 2fd538f).

let db = null;
let logEvent = () => {};
let ready = false;

export async function initVenues() {
  try {
    const m = await import("./sqlite.js");
    db = m.db;
    logEvent = m.logEvent;
    ready = true;
    console.log("[ff-server] venues ready (sqlite)");
  } catch (err) {
    console.warn("[ff-server] venues unavailable:", err.message);
    ready = false;
  }
  return ready;
}

export const venuesReady = () => ready;

// Ordered as a customer actually moves through them, so the founder list sorts sensibly.
export const STATUSES = ["prospect", "trial", "active", "paused", "churned"];
export const LIVE_STATUSES = ["trial", "active"];      // the ones that should be able to play

const slugOk = (s) => typeof s === "string" && /^[a-z0-9][a-z0-9-]{0,39}$/.test(s);
const clean = (v) => (v == null || v === "" ? null : String(v).trim());

const MONTH_MS = 30 * 86400_000;

/** Create or update a venue. Slug is the identity, so this is an upsert on it. */
export function saveVenue(slug, p = {}) {
  if (!ready) return { error: "The database is unavailable right now." };
  if (!slugOk(slug)) {
    return { error: "A venue slug is lowercase letters, numbers and dashes — the same one as its branding." };
  }
  if (p.status !== undefined && !STATUSES.includes(p.status)) {
    return { error: `status must be one of ${STATUSES.join(", ")}.` };
  }
  // Money is minor units, and typeof — not Number() — for the same reason payments.js uses typeof:
  // Number("4900") is a perfectly good integer, so a JSON body sending a STRING would be silently
  // coerced and billed.
  if (p.priceCents !== undefined && p.priceCents !== null) {
    if (typeof p.priceCents !== "number" || !Number.isInteger(p.priceCents) || p.priceCents < 0) {
      return { error: "priceCents must be a whole number of minor units (an integer, not a string)." };
    }
  }

  const now = Date.now();
  const existing = getVenue(slug);
  const row = {
    slug,
    legal_name: p.legalName !== undefined ? clean(p.legalName) : existing?.legal_name ?? null,
    contact_name: p.contactName !== undefined ? clean(p.contactName) : existing?.contact_name ?? null,
    contact_email: p.contactEmail !== undefined ? clean(p.contactEmail) : existing?.contact_email ?? null,
    plan: p.plan !== undefined ? clean(p.plan) : existing?.plan ?? null,
    price_cents: p.priceCents !== undefined ? p.priceCents : existing?.price_cents ?? null,
    status: p.status !== undefined ? p.status : existing?.status ?? "prospect",
    started: p.started !== undefined ? p.started : existing?.started ?? null,
    renews: p.renews !== undefined ? p.renews : existing?.renews ?? null,
    notes: p.notes !== undefined ? clean(p.notes) : existing?.notes ?? null,
  };

  // Going live starts the clock, once. Re-saving an already-active venue must not push their
  // renewal date forward a month every time somebody edits a phone number.
  if (LIVE_STATUSES.includes(row.status) && !row.started) {
    row.started = now;
    if (!row.renews) row.renews = now + MONTH_MS;
  }

  try {
    if (existing) {
      db.prepare(`UPDATE venues SET legal_name=?, contact_name=?, contact_email=?, plan=?,
                    price_cents=?, status=?, started=?, renews=?, notes=?, updated=?
                  WHERE slug=?`)
        .run(row.legal_name, row.contact_name, row.contact_email, row.plan, row.price_cents,
             row.status, row.started, row.renews, row.notes, now, slug);
    } else {
      db.prepare(`INSERT INTO venues (slug, legal_name, contact_name, contact_email, plan,
                    price_cents, status, started, renews, notes, created, updated)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(slug, row.legal_name, row.contact_name, row.contact_email, row.plan, row.price_cents,
             row.status, row.started, row.renews, row.notes, now, now);
    }
  } catch (err) {
    return { error: err.message };
  }
  logEvent(existing ? "venue.updated" : "venue.created", null,
           { slug, status: row.status, from: existing?.status ?? null });
  return { venue: getVenue(slug) };
}

export function getVenue(slug) {
  if (!ready || !slug) return null;
  try { return db.prepare("SELECT * FROM venues WHERE slug = ?").get(String(slug)) || null; }
  catch { return null; }
}

/**
 * Roll a venue on by one month. Called when their monthly payment lands.
 *
 * Advances from the EXISTING renewal date, not from today, so a payment that arrives three days
 * late does not silently move the billing date three days later every month until it has drifted
 * into a different part of the month entirely. If they are already overdue past a full cycle, it
 * catches up rather than stacking a backlog of missed months.
 */
export function renewVenue(slug, at = Date.now()) {
  if (!ready) return { error: "The database is unavailable right now." };
  const v = getVenue(slug);
  if (!v) return { error: "No such venue." };
  let next = (v.renews || at) + MONTH_MS;
  while (next < at) next += MONTH_MS;
  try {
    db.prepare("UPDATE venues SET renews=?, status=CASE WHEN status='trial' THEN 'active' ELSE status END, updated=? WHERE slug=?")
      .run(next, Date.now(), slug);
  } catch (err) { return { error: err.message }; }
  logEvent("venue.renewed", null, { slug, renews: next });
  return { venue: getVenue(slug) };
}

/** Venues with everything DERIVED joined on: their money and their nights, both queried live. */
export function listVenues({ status = null } = {}) {
  if (!ready) return { ready: false, venues: [] };
  const where = [];
  const args = [];
  if (status) { where.push("v.status = ?"); args.push(status); }
  const sql = `
    SELECT v.*,
           (SELECT COALESCE(SUM(amount_cents),0) FROM payments p
             WHERE p.brand_slug = v.slug AND p.status='succeeded')            AS revenue_cents,
           (SELECT COUNT(*) FROM game_sessions s WHERE s.brand_slug = v.slug) AS nights,
           (SELECT MAX(started) FROM game_sessions s WHERE s.brand_slug = v.slug) AS last_night,
           (SELECT COALESCE(MAX(peak_players),0) FROM game_sessions s WHERE s.brand_slug = v.slug) AS biggest
    FROM venues v
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY CASE v.status WHEN 'active' THEN 0 WHEN 'trial' THEN 1 WHEN 'prospect' THEN 2
                           WHEN 'paused' THEN 3 ELSE 4 END, v.created ASC`;
  try { return { ready: true, venues: db.prepare(sql).all(...args) }; }
  catch (err) {
    console.error("[ff-server] listVenues failed:", err?.message || err);
    return { ready: false, venues: [] };
  }
}

/**
 * The headline numbers, all derived.
 *
 * MRR counts only venues that are ACTUALLY PAYING — active, not trial. A trial in the MRR figure is
 * revenue that has not happened, and a forecast built from it is a forecast of wishes.
 */
export function venueSummary() {
  if (!ready) return { ready: false };
  try {
    const rows = db.prepare("SELECT status, COUNT(*) n, COALESCE(SUM(price_cents),0) cents FROM venues GROUP BY status").all();
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const r of rows) byStatus[r.status] = r.n;
    const mrr = rows.filter((r) => r.status === "active").reduce((a, r) => a + r.cents, 0);
    const dueSoon = db.prepare(
      `SELECT COUNT(*) n FROM venues WHERE renews IS NOT NULL AND renews < ? AND status IN ('active','trial')`
    ).get(Date.now() + 7 * 86400_000).n;
    const overdue = db.prepare(
      `SELECT COUNT(*) n FROM venues WHERE renews IS NOT NULL AND renews < ? AND status IN ('active','trial')`
    ).get(Date.now()).n;
    return {
      ready: true, byStatus, mrrCents: mrr,
      total: rows.reduce((a, r) => a + r.n, 0),
      dueSoon, overdue,
    };
  } catch (err) {
    console.error("[ff-server] venueSummary failed:", err?.message || err);
    return { ready: false };
  }
}

/** Rows for CSV. The caller formats. */
export function allVenuesForExport() {
  if (!ready) return { ready: false, venues: [] };
  return listVenues({});
}
