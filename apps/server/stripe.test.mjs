// Stripe webhook signature verification.  Run:  node apps/server/stripe.test.mjs
//
// This is a SECURITY boundary, not a formality: whatever gets past it can grant itself a paid
// subscription. It is also the one part of the Stripe work that is fully testable without a Stripe
// account, so it gets tested properly rather than being taken on trust until launch.
//
// The cases that matter are the refusals — a test that only proves a valid signature passes would
// also pass if verification were `return true`.

import { createHmac } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEP = String.fromCharCode(92);
const SRV = "file:///" + HERE.split(SEP).join("/").split(" ").join("%20") + "/";

const SECRET = "whsec_test_secret";
const { verifyStripeSignature, stripeConfigured } = await import(SRV + "stripe.js");

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

const sign = (body, secret = SECRET, t = Math.floor(Date.now() / 1000)) => ({
  header: `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`,
  body,
});

const payload = JSON.stringify({ type: "customer.subscription.updated", data: { object: { id: "sub_1" } } });

console.log("\n--- a genuine signature is accepted ---");
{
  const { header, body } = sign(payload);
  const r = verifyStripeSignature(body, header, SECRET);
  check("verified", r.ok, true);
  check("event parsed", r.event?.type, "customer.subscription.updated");
}

console.log("\n--- forgeries and mistakes are refused ---");
{
  const { header, body } = sign(payload);

  check("wrong secret refused", verifyStripeSignature(body, header, "whsec_other").ok, false);

  // The attack this actually stops: a real signed event, with the body swapped for a better one.
  const tampered = JSON.stringify({ type: "customer.subscription.updated", data: { object: { id: "sub_EVIL" } } });
  check("tampered body refused", verifyStripeSignature(tampered, header, SECRET).ok, false);

  check("missing header refused", verifyStripeSignature(body, null, SECRET).ok, false);
  check("malformed header refused", verifyStripeSignature(body, "not-a-signature", SECRET).ok, false);
  check("header with no v1 refused", verifyStripeSignature(body, "t=123", SECRET).ok, false);
  check("empty body refused", verifyStripeSignature("", header, SECRET).ok, false);
  check("no secret configured refused", verifyStripeSignature(body, header, "").ok, false);

  // A signature stays mathematically valid forever, so replay is stopped by the timestamp alone.
  const old = sign(payload, SECRET, Math.floor(Date.now() / 1000) - 3600);
  check("replayed old event refused", verifyStripeSignature(old.body, old.header, SECRET).ok, false);

  const future = sign(payload, SECRET, Math.floor(Date.now() / 1000) + 3600);
  check("far-future timestamp refused", verifyStripeSignature(future.body, future.header, SECRET).ok, false);

  // A signature of the right shape but wrong value must not squeak through on a length check.
  const bogus = `t=${Math.floor(Date.now() / 1000)},v1=${"a".repeat(64)}`;
  check("well-formed but wrong signature refused", verifyStripeSignature(body, bogus, SECRET).ok, false);
}

console.log("\n--- details ---");
{
  const t = Math.floor(Date.now() / 1000);
  const good = createHmac("sha256", SECRET).update(`${t}.${payload}`).digest("hex");
  // Stripe sends several v1 values while a secret is being rotated; any one matching is enough.
  check("accepts one good signature among several",
    verifyStripeSignature(payload, `t=${t},v1=${"b".repeat(64)},v1=${good}`, SECRET).ok, true);

  const { header } = sign("{not json");
  check("valid signature over non-JSON refused",
    verifyStripeSignature("{not json", header, SECRET).ok, false);

  check("a Buffer body works too", verifyStripeSignature(Buffer.from(payload), sign(payload).header, SECRET).ok, true);
}

console.log("\n--- configuration ---");
delete process.env.STRIPE_WEBHOOK_SECRET;
check("not configured when the secret is unset", stripeConfigured(), false);
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
check("configured once it is set", stripeConfigured(), true);

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
