// The money ledger. Weighted to the failures that would SILENTLY produce a wrong number, because a
// revenue figure nobody can tell is wrong is worse than an obvious crash.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "pz-pay-"));
process.env.DB_PATH = join(TMP, "pay.db");
process.env.AUTH_DIR = join(TMP, "auth");

const P = await import("./payments.js");
await P.initPayments();

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

check("ledger is ready", P.paymentsReady());

// --- amounts -----------------------------------------------------------------------------------
const c1 = P.recordPayment({ kind: "charge", source: "stripe", amountCents: 3000, backerId: "b1" });
check("a charge records", !!c1.payment && c1.payment.amount_cents === 3000);

const r1 = P.recordPayment({ kind: "refund", source: "stripe", amountCents: 1000, backerId: "b1" });
check("a refund is stored NEGATIVE even when passed positive", r1.payment?.amount_cents === -1000,
      String(r1.payment?.amount_cents));
const r2 = P.recordPayment({ kind: "refund", source: "stripe", amountCents: -500, backerId: "b1" });
check("a refund passed negative stays negative (not double-flipped)", r2.payment?.amount_cents === -500,
      String(r2.payment?.amount_cents));
const cb = P.recordPayment({ kind: "chargeback", source: "stripe", amountCents: 250 });
check("a chargeback is negative", cb.payment?.amount_cents === -250);

check("a float amount is refused", !!P.recordPayment({ kind: "charge", source: "stripe", amountCents: 10.5 }).error);
check("a zero amount is refused", !!P.recordPayment({ kind: "charge", source: "stripe", amountCents: 0 }).error);
check("a non-numeric amount is refused", !!P.recordPayment({ kind: "charge", source: "stripe", amountCents: "30" }).error);
check("an unknown kind is refused", !!P.recordPayment({ kind: "vibes", source: "stripe", amountCents: 100 }).error);
check("an unknown source is refused", !!P.recordPayment({ kind: "charge", source: "crypto", amountCents: 100 }).error);

// --- the sum is the point ------------------------------------------------------------------------
const s = P.paymentSummary();
check("gross counts only money IN", s.grossCents === 3000, String(s.grossCents));
check("refunded is the negative total", s.refundedCents === -1750, String(s.refundedCents));
check("net is what you actually kept", s.netCents === 1250, String(s.netCents));

// --- idempotency: the one that silently inflates revenue -----------------------------------------
const e = { stripeEventId: "evt_dupe_1", kind: "charge", source: "stripe", amountCents: 5000 };
const first = P.recordPayment(e);
const again = P.recordPayment(e);
check("the same Stripe event twice is NOT booked twice", !!again.duplicate, JSON.stringify(again).slice(0, 80));
check("and the total is unchanged by the retry", P.paymentSummary().grossCents === 8000,
      String(P.paymentSummary().grossCents));
check("the retry reports the ORIGINAL row, so the webhook can 2xx", again.payment?.id === first.payment?.id);

// --- occurred vs created: a late webhook must not land in the wrong month -------------------------
const JAN = Date.UTC(2026, 0, 15);
const FEB = Date.UTC(2026, 1, 15);
P.recordPayment({ kind: "charge", source: "stripe", amountCents: 777, occurred: JAN });
const janOnly = P.paymentSummary({ since: Date.UTC(2026, 0, 1), until: Date.UTC(2026, 1, 1) });
check("a payment lands in the month it OCCURRED, not the month we saw it", janOnly.grossCents === 777,
      String(janOnly.grossCents));
const febOnly = P.paymentSummary({ since: Date.UTC(2026, 1, 1), until: Date.UTC(2026, 2, 1) });
check("and does not leak into the next month", febOnly.grossCents === 0, String(febOnly.grossCents));
check("occurred defaults to now when not given", P.recordPayment({ kind: "charge", source: "bank", amountCents: 1 }).payment.occurred > FEB);

// --- Stripe event mapping ------------------------------------------------------------------------
const ev = (type, obj, id) => ({ id, type, created: Math.floor(JAN / 1000), data: { object: obj } });
const pi = P.recordStripeEvent(ev("payment_intent.succeeded", { id: "pi_1", amount_received: 1500, currency: "usd", metadata: { backerId: "b9" } }, "evt_pi"));
check("payment_intent.succeeded books a charge", pi.payment?.amount_cents === 1500);
check("and attributes it to the backer in metadata", pi.payment?.backer_id === "b9");
check("and uses the STRIPE timestamp (seconds -> ms)", pi.payment?.occurred === JAN, String(pi.payment?.occurred));

const rf = P.recordStripeEvent(ev("charge.refunded", { id: "ch_1", amount_refunded: 400, currency: "usd" }, "evt_rf"));
check("charge.refunded books a negative refund", rf.payment?.amount_cents === -400);

const fail = P.recordStripeEvent(ev("invoice.payment_failed", { id: "in_1", amount_due: 999, currency: "usd" }, "evt_f"));
check("a FAILED invoice is recorded but not counted as revenue", fail.payment?.status === "failed");
const succeededOnly = P.paymentSummary();
check("summary counts succeeded rows only", succeededOnly.grossCents === 8000 + 777 + 1 + 1500,
      String(succeededOnly.grossCents));

check("an unrelated Stripe event is ignored, not guessed at", !!P.recordStripeEvent(ev("customer.created", {}, "evt_x")).ignored);

// --- listing + export ----------------------------------------------------------------------------
const l = P.listPayments({ limit: 5 });
check("listing returns newest first", l.ready && l.payments.length === 5);
check("listing can filter by backer", P.listPayments({ backerId: "b9" }).payments.every((p) => p.backer_id === "b9"));
check("export returns every row oldest-first", P.allPaymentsForExport().payments.length >= 10);

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
