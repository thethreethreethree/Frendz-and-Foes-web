// Subscriptions and entitlements — Phase 2 of the business backend.
//
// SCOPE, deliberately: this is the MODEL and the wiring points, not a Stripe integration. The owner
// is dropping in their existing Stripe setup later, so everything here is built to receive it:
// applyStripeEvent() is the single door a webhook comes through, and the columns Stripe needs
// (stripe_customer_id, stripe_sub_id, current_period_end) already exist on the table.
//
// WHAT ENTITLEMENTS ARE FOR: what a backer is actually allowed to do. Right now nothing enforces
// them, because the games are locked behind GAMES_OPEN for everyone until the Kickstarter finishes.
// When that opens, `entitlementsFor()` is the one place that answers "can this person play this?".
//
// TIER FACTS mirror kickstarter/build.py + productKnowledge.js. If those change, change these -
// subscriptions.test.mjs fails if the prices drift apart.

import { db, logEvent } from "./sqlite.js";

// The three Kickstarter tiers. `games` is a COUNT, not a list: which five games a Zoo Pass unlocks
// is an owner decision that has not been made, and inventing a list here would quietly become the
// answer. "all" means every game.
export const PLANS = {
  "zoo-pass": {
    id: "zoo-pass", price: "$15", name: "Zoo Pass",
    months: 6, games: 5, customCharacters: 0,
    blurb: "Six months of PlayZoo and five games.",
  },
  "founding-animal": {
    id: "founding-animal", price: "$30", name: "Founding Animal",
    months: 12, games: 10, customCharacters: 1,
    blurb: "A full year, ten games, and one custom animal character drawn just for you.",
  },
  "head-keeper": {
    id: "head-keeper", price: "$50", name: "Head Keeper",
    months: 12, games: "all", customCharacters: 2,
    blurb: "A full year with EVERY game unlocked, plus TWO custom characters made for you.",
  },
};
export const PLAN_IDS = Object.keys(PLANS);

// Statuses mirror Stripe's own vocabulary so a webhook maps across with no translation table.
export const STATUSES = ["none", "active", "trialing", "past_due", "canceled"];
// Only these grant access. past_due does NOT - a failed payment cuts access immediately rather
// than granting a grace period. That is a business decision, not a technical one, and it is the
// stricter of the two: add "past_due" here to give a retry window instead.
const ENTITLED = new Set(["active", "trialing"]);

const rowToSub = (r) => (r ? {
  id: r.id, backerId: r.backer_id, plan: r.plan, status: r.status,
  stripeCustomerId: r.stripe_customer_id, stripeSubId: r.stripe_sub_id,
  currentPeriodEnd: r.current_period_end, created: r.created, updated: r.updated,
} : null);

export function getSubscription(backerId) {
  return rowToSub(
    db.prepare("SELECT * FROM subscriptions WHERE backer_id = ? ORDER BY updated DESC LIMIT 1")
      .get(String(backerId || "")),
  );
}

export function listSubscriptions() {
  return db.prepare("SELECT * FROM subscriptions ORDER BY updated DESC").all().map(rowToSub);
}

// Create or update a backer's subscription. One row per backer: a person has one PlayZoo
// subscription at a time, and keeping history in `events` rather than in extra rows means the
// current state is never ambiguous.
export function setSubscription(backerId, { plan = null, status = "none", stripeCustomerId = null,
                                            stripeSubId = null, currentPeriodEnd = null } = {}) {
  if (!backerId) return { error: "No backer." };
  if (plan && !PLANS[plan]) return { error: "Unknown plan." };
  if (!STATUSES.includes(status)) return { error: "Unknown status." };

  const now = Date.now();
  const existing = getSubscription(backerId);
  if (existing) {
    db.prepare(`UPDATE subscriptions
                SET plan = ?, status = ?, stripe_customer_id = ?, stripe_sub_id = ?,
                    current_period_end = ?, updated = ?
                WHERE id = ?`)
      .run(plan, status, stripeCustomerId, stripeSubId, currentPeriodEnd, now, existing.id);
  } else {
    db.prepare(`INSERT INTO subscriptions
                  (id, backer_id, plan, status, stripe_customer_id, stripe_sub_id,
                   current_period_end, created, updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("s" + now.toString(36) + Math.random().toString(36).slice(2, 8),
           backerId, plan, status, stripeCustomerId, stripeSubId, currentPeriodEnd, now, now);
  }
  logEvent("subscription.set", backerId, { plan, status, from: existing ? existing.status : "none" });
  return { subscription: getSubscription(backerId) };
}

// What is this backer actually allowed to do?
//
// The single place that question is answered. Nothing enforces it yet - the games are locked behind
// GAMES_OPEN for everyone until the Kickstarter completes - so this is the hook the game gate calls
// on launch day rather than a check scattered through the routes.
export function entitlementsFor(backerId) {
  const sub = getSubscription(backerId);
  const plan = sub && sub.plan ? PLANS[sub.plan] : null;

  // Expiry is decided HERE, not trusted from the status column: a webhook can be missed or arrive
  // late, and an expired period must not keep granting access just because nobody told us.
  const expired = !!(sub && sub.currentPeriodEnd && sub.currentPeriodEnd < Date.now());
  const active = !!(sub && ENTITLED.has(sub.status) && !expired);

  return {
    backerId,
    active,
    plan: plan ? plan.id : null,
    planName: plan ? plan.name : null,
    status: sub ? sub.status : "none",
    expired,
    currentPeriodEnd: sub ? sub.currentPeriodEnd : null,
    games: active && plan ? plan.games : 0,          // a count, or "all"
    allGames: !!(active && plan && plan.games === "all"),
    customCharacters: active && plan ? plan.customCharacters : 0,
  };
}

// --- Stripe wiring points ------------------------------------------------------------------------
// The owner drops their existing Stripe integration in around these. Nothing here calls Stripe; each
// function is the seam where it will.

// Map a Stripe price/product id to one of our plans. Left EMPTY on purpose: these ids come from the
// owner's Stripe account and inventing placeholders would look configured while silently matching
// nothing. Fill it in when the account is connected.
export const STRIPE_PRICE_TO_PLAN = {
  // "price_xxx": "zoo-pass",
};

// The single door a Stripe webhook comes through. Call it from the webhook route once signature
// verification is in place - verification belongs in the route, because it needs the raw body.
//
// Deliberately tolerant about the shape: it reads only the fields we store, so a Stripe API version
// bump that adds fields cannot break it.
export function applyStripeEvent(event, resolveBackerId) {
  const type = event?.type || "";
  const obj = event?.data?.object || {};
  if (!type.startsWith("customer.subscription.") && type !== "checkout.session.completed") {
    return { ignored: true, type };
  }

  const backerId = typeof resolveBackerId === "function"
    ? resolveBackerId(obj)
    : (obj.metadata && obj.metadata.backerId) || null;
  if (!backerId) return { error: "Could not map that Stripe event to a backer." };

  const priceId = obj?.items?.data?.[0]?.price?.id || obj?.price?.id || null;
  const plan = (priceId && STRIPE_PRICE_TO_PLAN[priceId]) || null;
  const status = type === "customer.subscription.deleted"
    ? "canceled"
    : (STATUSES.includes(obj.status) ? obj.status : "active");

  const r = setSubscription(backerId, {
    plan,
    status,
    stripeCustomerId: obj.customer || null,
    stripeSubId: obj.id || null,
    // Stripe sends seconds; we store milliseconds everywhere else.
    currentPeriodEnd: obj.current_period_end ? obj.current_period_end * 1000 : null,
  });
  logEvent("stripe.event", backerId, { type, plan, status });
  return r;
}
