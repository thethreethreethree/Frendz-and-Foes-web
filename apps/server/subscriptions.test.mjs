// Subscriptions + entitlements test.  Run:  node apps/server/subscriptions.test.mjs
//
// Covers the parts that will be load-bearing the moment the games open: that entitlements are
// derived rather than trusted (an expired period must NOT keep granting access just because a
// webhook was missed), that plan facts match the campaign, and that a Stripe event maps in.
//
// Self-contained: its own throwaway database under the OS temp directory.
import { rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEP = String.fromCharCode(92);
const SRV = "file:///" + HERE.split(SEP).join("/").split(" ").join("%20") + "/";
const TMP = join(tmpdir(), "playzoo-subs-test");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, "auth"), { recursive: true });
process.env.AUTH_DIR = join(TMP, "auth");
process.env.DB_PATH = join(TMP, "playzoo.db");

const subs = await import(SRV + "subscriptions.js");
const { PRODUCT_KNOWLEDGE } = await import(SRV + "productKnowledge.js");

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

const DAY = 86400_000;

console.log("\n--- the plans match the campaign ---");
check("three plans", subs.PLAN_IDS, ["zoo-pass", "founding-animal", "head-keeper"]);
for (const id of subs.PLAN_IDS) {
  const p = subs.PLANS[id];
  // The characters quote these prices to backers; if they drift apart, one of them is lying.
  check(`${id} price ${p.price} matches the briefing`, PRODUCT_KNOWLEDGE.includes(p.price), true);
  check(`${id} name matches the briefing`, PRODUCT_KNOWLEDGE.includes(p.name), true);
}
check("head-keeper unlocks everything", subs.PLANS["head-keeper"].games, "all");
check("zoo-pass is 6 months", subs.PLANS["zoo-pass"].months, 6);

console.log("\n--- no subscription means no entitlements ---");
const none = subs.entitlementsFor("bNOBODY");
check("inactive", none.active, false);
check("no games", none.games, 0);
check("status none", none.status, "none");
check("no custom characters", none.customCharacters, 0);

console.log("\n--- an active subscription grants its plan ---");
subs.setSubscription("b1", { plan: "head-keeper", status: "active", currentPeriodEnd: Date.now() + 30 * DAY });
const hk = subs.entitlementsFor("b1");
check("active", hk.active, true);
check("all games", hk.allGames, true);
check("two custom characters", hk.customCharacters, 2);
check("plan name", hk.planName, "Head Keeper");

subs.setSubscription("b2", { plan: "zoo-pass", status: "active", currentPeriodEnd: Date.now() + 30 * DAY });
check("zoo-pass grants five games", subs.entitlementsFor("b2").games, 5);
check("zoo-pass is not all-games", subs.entitlementsFor("b2").allGames, false);

console.log("\n--- EXPIRY IS DERIVED, not trusted from the status column ---");
// The important one: a missed or late webhook must not leave someone entitled forever.
subs.setSubscription("b3", { plan: "head-keeper", status: "active", currentPeriodEnd: Date.now() - DAY });
const stale = subs.entitlementsFor("b3");
check("status still says active", subs.getSubscription("b3").status, "active");
check("but entitlements are NOT active", stale.active, false);
check("and it is flagged expired", stale.expired, true);
check("no games granted", stale.games, 0);

console.log("\n--- status handling ---");
subs.setSubscription("b4", { plan: "zoo-pass", status: "trialing", currentPeriodEnd: Date.now() + DAY });
check("trialing is entitled", subs.entitlementsFor("b4").active, true);
subs.setSubscription("b5", { plan: "zoo-pass", status: "past_due", currentPeriodEnd: Date.now() + DAY });
// Owner's call: a card that simply expired keeps playing while Stripe retries.
check("past_due keeps access (grace period)", subs.entitlementsFor("b5").active, true);
// But the grace cannot outlive the PERIOD - otherwise a failed payment would grant access forever.
subs.setSubscription("b5b", { plan: "zoo-pass", status: "past_due", currentPeriodEnd: Date.now() - DAY });
check("past_due past its period end is cut off", subs.entitlementsFor("b5b").active, false);
subs.setSubscription("b6", { plan: "zoo-pass", status: "canceled", currentPeriodEnd: Date.now() + DAY });
check("canceled is not entitled", subs.entitlementsFor("b6").active, false);

console.log("\n--- one row per backer ---");
subs.setSubscription("b1", { plan: "zoo-pass", status: "active", currentPeriodEnd: Date.now() + DAY });
check("updating does not create a second row",
  subs.listSubscriptions().filter((s) => s.backerId === "b1").length, 1);
check("the plan actually changed", subs.getSubscription("b1").plan, "zoo-pass");

console.log("\n--- refusals ---");
check("unknown plan refused", !!subs.setSubscription("b7", { plan: "gold", status: "active" }).error, true);
check("unknown status refused", !!subs.setSubscription("b7", { plan: "zoo-pass", status: "vibing" }).error, true);
check("no backer refused", !!subs.setSubscription("", {}).error, true);

console.log("\n--- Stripe wiring point ---");
const ev = {
  type: "customer.subscription.updated",
  data: { object: {
    id: "sub_123", customer: "cus_123", status: "active",
    current_period_end: Math.floor((Date.now() + 60 * DAY) / 1000),
    metadata: { backerId: "b8" },
  } },
};
const applied = subs.applyStripeEvent(ev);
check("event applied", !!applied.subscription, true);
check("stripe sub id stored", subs.getSubscription("b8").stripeSubId, "sub_123");
check("period end converted from seconds to ms",
  subs.getSubscription("b8").currentPeriodEnd > Date.now() + 59 * DAY, true);
check("unrelated event ignored", subs.applyStripeEvent({ type: "invoice.paid", data: { object: {} } }).ignored, true);
check("unmappable event reports an error",
  !!subs.applyStripeEvent({ type: "customer.subscription.updated", data: { object: {} } }).error, true);
// No price map is configured yet, so a real Stripe price cannot resolve to a plan - which must mean
// "no plan", never a guessed one.
check("unmapped price yields no plan", subs.getSubscription("b8").plan, null);

console.log("");
console.log("--- the Stripe price map comes from the ENVIRONMENT ---");
{
  // Connecting Stripe must not require a code edit, so the map is parsed from STRIPE_PRICE_MAP.
  // A fresh module instance is needed because it is read once at import.
  process.env.STRIPE_PRICE_MAP = "price_a:zoo-pass, price_c:head-keeper , price_b:not-a-real-plan";
  const fresh = await import(SRV + "subscriptions.js?pricemap");
  check("valid entries mapped", fresh.STRIPE_PRICE_TO_PLAN, { price_a: "zoo-pass", price_c: "head-keeper" });
  // A typo naming a plan that does not exist must be DROPPED, not accepted: otherwise a real paid
  // subscription would arrive with plan: null and grant nothing.
  check("a bad plan name is dropped", Object.keys(fresh.STRIPE_PRICE_TO_PLAN).includes("price_b"), false);
  const st = fresh.stripeStatus();
  check("status reports the unmapped plan", st.unmappedPlans, ["founding-animal"]);
  check("status never leaks the secret", Object.keys(st).includes("webhookSecret"), false);
  check("not ready without a webhook secret", st.ready, false);
  delete process.env.STRIPE_PRICE_MAP;
}


// --- refunds end access IMMEDIATELY (owner's decision, 2026-09-09, §7.5) -------------------------
// Before this, charge.refunded was not a customer.subscription.* event, so applyStripeEvent dropped
// it on the floor: the money went back and the backer kept playing.
console.log("");
console.log("--- a refund ends access at once ---");
{
  const who = "refund-me";
  subs.setSubscription(who, {
    plan: "head-keeper", status: "active",
    currentPeriodEnd: Date.now() + 60 * 86400000,      // two months of access left
  });
  check("entitled before the refund", subs.entitlementsFor(who).active, true);
  check("with two custom characters", subs.entitlementsFor(who).customCharacters, 2);

  const out = subs.applyStripeEvent({
    type: "charge.refunded",
    data: { object: { metadata: { backerId: who }, amount_refunded: 5000 } },
  });
  check("a refund is acted on, not ignored", out.revoked, true);

  const ent = subs.entitlementsFor(who);
  check("access ends AT ONCE, not at period end", ent.active, false);
  check("the entitlement count drops to zero too", ent.customCharacters, 0);

  // TWO independent paths kill access, so one missed write cannot leave it open.
  check("status is canceled", ent.status, "canceled");
  check("period expired independently of the status", ent.expired, true);

  // A chargeback is money leaving under protest - same outcome.
  const who2 = "disputed";
  subs.setSubscription(who2, { plan: "zoo-pass", status: "active", currentPeriodEnd: Date.now() + 86400000 });
  subs.applyStripeEvent({ type: "charge.dispute.created", data: { object: { metadata: { backerId: who2 } } } });
  check("a chargeback revokes the same way", subs.entitlementsFor(who2).active, false);

  // An unmappable refund must not throw, and must not quietly report success.
  const orphan = subs.applyStripeEvent({ type: "charge.refunded", data: { object: {} } });
  check("a refund with no backer errors rather than pretending", !!orphan.error, true);
  check("and does not claim to have revoked anything", !!orphan.revoked, false);
}

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
