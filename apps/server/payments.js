// The money ledger.
//
// WHY THIS EXISTS: before it, `subscriptions` stored a plan and a status and nothing else. There
// was no amount anywhere in the database, so "how much have we taken this month" was unanswerable —
// and unanswerable retroactively, because a status column overwrites itself. A backer who paid,
// refunded and resubscribed left exactly one row that looked like one clean subscription.
//
// RULES, all of which the schema enforces or this module upholds:
//   * APPEND-ONLY. A refund is a NEW ROW with a negative amount, never an edit. Revenue is a query.
//   * MINOR UNITS as integers. Floats cannot represent money; 0.1 + 0.2 is not 0.3.
//   * IDEMPOTENT on stripe_event_id. Stripe retries webhooks, and a retry that books the charge
//     again silently inflates every number the founder sees.
//   * `occurred` is the SOURCE time, separate from `created`. A webhook delayed past midnight on
//     the last of the month must not land in the wrong month's revenue.
//
// Imported DYNAMICALLY like every other store, so an unopenable database degrades instead of
// killing the server (see the fail-safe restored in 2fd538f).

let db = null;
let logEvent = () => {};
let ready = false;

export async function initPayments() {
  try {
    const m = await import("./sqlite.js");
    db = m.db;
    logEvent = m.logEvent;
    ready = true;
    console.log("[ff-server] payments ledger ready (sqlite)");
  } catch (err) {
    console.warn("[ff-server] payments ledger unavailable:", err.message);
    ready = false;
  }
  return ready;
}

export const paymentsReady = () => ready;

const KINDS = ["charge", "refund", "chargeback", "payout", "manual"];
const SOURCES = ["stripe", "kickstarter", "bank", "comp"];
const STATUSES = ["succeeded", "pending", "failed"];

const newId = () => "pay_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

/**
 * Record one money movement. Returns { payment } or { error }.
 *
 * Refunds and chargebacks are STORED NEGATIVE whichever sign the caller passes, so a caller that
 * hands us a positive refund amount (Stripe does) cannot accidentally add to revenue.
 */
export function recordPayment(p = {}) {
  if (!ready) return { error: "The database is unavailable right now." };

  const kind = String(p.kind || "").trim();
  if (!KINDS.includes(kind)) return { error: `kind must be one of ${KINDS.join(", ")}.` };

  const source = String(p.source || "").trim();
  if (!SOURCES.includes(source)) return { error: `source must be one of ${SOURCES.join(", ")}.` };

  const status = STATUSES.includes(p.status) ? p.status : "succeeded";

  // typeof, NOT Number(): Number("30") is a perfectly good integer, so a JSON body sending
  // amountCents as a STRING was silently coerced and booked. Caught by a test that fed it "30" and
  // watched gross revenue become 3030. Money must never be guessed at.
  const raw = p.amountCents;
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return { error: "amountCents must be a whole number of minor units (an integer, not a string)." };
  }
  if (raw === 0) return { error: "A zero-amount payment is not a movement." };
  // Money out is always negative in the ledger, so SUM() is the answer with no special-casing.
  const outward = kind === "refund" || kind === "chargeback" || kind === "payout";
  const amount = outward ? -Math.abs(raw) : Math.abs(raw);

  const occurred = Number.isFinite(p.occurred) ? Math.trunc(p.occurred) : Date.now();
  const now = Date.now();
  const row = {
    id: newId(),
    backer_id: p.backerId || null,
    brand_slug: p.brandSlug || null,
    kind,
    source,
    amount_cents: amount,
    currency: (p.currency || "usd").toLowerCase(),
    status,
    stripe_event_id: p.stripeEventId || null,
    stripe_object_id: p.stripeObjectId || null,
    description: p.description || null,
    occurred,
    created: now,
  };

  try {
    db.prepare(`INSERT INTO payments
      (id, backer_id, brand_slug, kind, source, amount_cents, currency, status,
       stripe_event_id, stripe_object_id, description, occurred, created)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      row.id, row.backer_id, row.brand_slug, row.kind, row.source, row.amount_cents,
      row.currency, row.status, row.stripe_event_id, row.stripe_object_id,
      row.description, row.occurred, row.created);
  } catch (err) {
    // UNIQUE on stripe_event_id is the idempotency guard, and hitting it is NORMAL: Stripe retries
    // until it gets a 2xx. Report it as an already-recorded success, not a failure, or the webhook
    // returns non-2xx and Stripe retries forever.
    if (String(err.message || "").includes("UNIQUE")) {
      const existing = db.prepare("SELECT * FROM payments WHERE stripe_event_id = ?")
        .get(row.stripe_event_id);
      return { payment: existing || null, duplicate: true };
    }
    return { error: err.message };
  }

  logEvent("payment.recorded", row.backer_id, {
    kind, source, amount_cents: amount, currency: row.currency, brand: row.brand_slug,
  });
  return { payment: row };
}

/** Most recent movements first. */
export function listPayments({ limit = 100, before = null, backerId = null, brandSlug = null } = {}) {
  if (!ready) return { ready: false, payments: [] };
  const lim = Math.max(1, Math.min(500, Number(limit) || 100));
  const where = [];
  const args = [];
  if (before) { where.push("occurred < ?"); args.push(Number(before)); }
  if (backerId) { where.push("backer_id = ?"); args.push(backerId); }
  if (brandSlug) { where.push("brand_slug = ?"); args.push(brandSlug); }
  const sql = `SELECT * FROM payments ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY occurred DESC, created DESC LIMIT ?`;
  return { ready: true, payments: db.prepare(sql).all(...args, lim) };
}

/**
 * Totals, DERIVED every time. Nothing here is stored, so it cannot drift.
 * `since`/`until` are epoch ms on `occurred` — the source time, so months are honest.
 */
export function paymentSummary({ since = null, until = null } = {}) {
  if (!ready) return { ready: false };
  const where = ["status = 'succeeded'"];
  const args = [];
  if (since) { where.push("occurred >= ?"); args.push(Number(since)); }
  if (until) { where.push("occurred < ?"); args.push(Number(until)); }
  const w = "WHERE " + where.join(" AND ");

  const gross = db.prepare(`SELECT COALESCE(SUM(amount_cents),0) n FROM payments ${w} AND amount_cents > 0`).get(...args).n;
  const out   = db.prepare(`SELECT COALESCE(SUM(amount_cents),0) n FROM payments ${w} AND amount_cents < 0`).get(...args).n;
  const count = db.prepare(`SELECT COUNT(*) n FROM payments ${w}`).get(...args).n;
  const byKind = db.prepare(`SELECT kind, COUNT(*) n, COALESCE(SUM(amount_cents),0) cents
                             FROM payments ${w} GROUP BY kind ORDER BY kind`).all(...args);
  const bySource = db.prepare(`SELECT source, COUNT(*) n, COALESCE(SUM(amount_cents),0) cents
                               FROM payments ${w} GROUP BY source ORDER BY source`).all(...args);
  return {
    ready: true,
    grossCents: gross,          // money in
    refundedCents: out,         // negative
    netCents: gross + out,      // what you actually kept
    count,
    byKind,
    bySource,
  };
}

/** Rows for a CSV export. Amounts stay in minor units; the caller formats. */
export function allPaymentsForExport() {
  if (!ready) return { ready: false, payments: [] };
  return {
    ready: true,
    payments: db.prepare("SELECT * FROM payments ORDER BY occurred ASC, created ASC").all(),
  };
}

/**
 * Turn a verified Stripe event into ledger rows. Called by the webhook AFTER signature
 * verification, alongside applyStripeEvent, which owns entitlements. This owns the money —
 * deliberately separate, so a Stripe event we cannot map to a backer still gets its money recorded.
 */
export function recordStripeEvent(event) {
  if (!ready) return { error: "The database is unavailable right now." };
  const type = event?.type || "";
  const obj = event?.data?.object || {};
  const eventId = event?.id || null;
  const backerId = (obj.metadata && obj.metadata.backerId) || null;
  // Stripe timestamps are SECONDS.
  const occurred = Number.isFinite(event?.created) ? event.created * 1000 : Date.now();

  const common = { source: "stripe", stripeEventId: eventId, backerId, occurred };

  if (type === "payment_intent.succeeded" || type === "charge.succeeded") {
    return recordPayment({ ...common, kind: "charge", amountCents: obj.amount_received ?? obj.amount,
      currency: obj.currency, stripeObjectId: obj.id, description: obj.description || type });
  }
  if (type === "invoice.payment_succeeded") {
    return recordPayment({ ...common, kind: "charge", amountCents: obj.amount_paid,
      currency: obj.currency, stripeObjectId: obj.id, description: "invoice " + (obj.number || obj.id) });
  }
  if (type === "charge.refunded") {
    return recordPayment({ ...common, kind: "refund", amountCents: obj.amount_refunded,
      currency: obj.currency, stripeObjectId: obj.id, description: "refund of " + obj.id });
  }
  if (type === "charge.dispute.created") {
    return recordPayment({ ...common, kind: "chargeback", amountCents: obj.amount,
      currency: obj.currency, stripeObjectId: obj.id, description: "dispute " + obj.id });
  }
  if (type === "invoice.payment_failed") {
    return recordPayment({ ...common, kind: "charge", status: "failed",
      amountCents: obj.amount_due, currency: obj.currency, stripeObjectId: obj.id,
      description: "FAILED invoice " + (obj.number || obj.id) });
  }
  return { ignored: true, type };
}
