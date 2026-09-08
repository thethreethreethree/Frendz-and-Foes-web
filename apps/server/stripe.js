// Stripe webhook verification.
//
// NO STRIPE SDK. Verifying a webhook is a plain HMAC over the raw body, which is precisely what the
// SDK's constructEvent does, so implementing it here avoids a dependency (and a supply-chain surface)
// for roughly thirty lines. If the owner later installs the SDK, this can be swapped for
// stripe.webhooks.constructEvent with no change to the caller.
//
// THE RAW BODY IS THE WHOLE POINT. The signature covers the exact bytes Stripe sent; once
// express.json() has parsed and re-serialised them, key order and whitespace can differ and the
// signature will never match again. That is why the webhook route is registered BEFORE the global
// JSON parser in index.js, with express.raw().
//
// Scheme (Stripe's own): header `stripe-signature: t=<unix>,v1=<hex>[,v1=<hex>...]`
//   signed payload = `${t}.${rawBody}` ; signature = HMAC-SHA256(payload, webhook secret)

import { createHmac, timingSafeEqual } from "node:crypto";

export const stripeConfigured = () => !!process.env.STRIPE_WEBHOOK_SECRET;

// Five minutes, matching Stripe's own default. Rejecting old timestamps is what stops a captured
// webhook being replayed later; the signature alone would still be valid forever.
const TOLERANCE_SEC = 300;

export function verifyStripeSignature(rawBody, header, secret = process.env.STRIPE_WEBHOOK_SECRET) {
  if (!secret) return { ok: false, error: "Stripe webhook secret is not configured." };
  if (!header || typeof header !== "string") return { ok: false, error: "Missing stripe-signature header." };
  if (!rawBody) return { ok: false, error: "Missing body." };

  let timestamp = null;
  const signatures = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") timestamp = v;
    else if (k === "v1" && v) signatures.push(v);      // several can be sent during a secret rotation
  }
  if (!timestamp || signatures.length === 0) return { ok: false, error: "Malformed stripe-signature header." };

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SEC) {
    return { ok: false, error: "Signature timestamp is outside the tolerance window." };
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), "utf8");
  const expected = createHmac("sha256", secret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`, "utf8"), body]))
    .digest("hex");

  // Constant-time compare against every offered signature: a plain === leaks, through timing, how
  // much of a forged signature was correct.
  const exp = Buffer.from(expected, "utf8");
  const matched = signatures.some((sig) => {
    const got = Buffer.from(sig, "utf8");
    return got.length === exp.length && timingSafeEqual(got, exp);
  });
  if (!matched) return { ok: false, error: "Signature does not match." };

  try {
    return { ok: true, event: JSON.parse(body.toString("utf8")) };
  } catch {
    return { ok: false, error: "Body is not valid JSON." };
  }
}
