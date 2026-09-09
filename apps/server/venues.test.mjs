// Venues as customers. The failures that matter here are billing-shaped: a renewal date that
// drifts, an MRR figure counting money nobody has paid, or a venue whose history detaches from it.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "pz-venues-"));
process.env.DB_PATH = join(TMP, "venues.db");
process.env.AUTH_DIR = join(TMP, "auth");

const V = await import("./venues.js");
const S = await import("./sqlite.js");
await V.initVenues();

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};
const DAY = 86400_000, MONTH = 30 * DAY;

check("venues are ready", V.venuesReady());

// --- creating ------------------------------------------------------------------------------------
const made = V.saveVenue("the-crown", { legalName: "The Crown Ltd", contactEmail: "hi@crown.test" });
check("a venue can be created", !!made.venue, JSON.stringify(made));
check("it starts as a prospect", made.venue.status === "prospect");
check("a prospect has no billing clock running", made.venue.started === null && made.venue.renews === null,
      "a venue that has not bought anything must not look like it is due to pay");

check("a bad slug is refused", !!V.saveVenue("The Crown!", {}).error);
check("an invented status is refused", !!V.saveVenue("x-bar", { status: "vip" }).error);

// Money must be an integer of minor units, never a coerced string.
check("a string price is refused, not silently billed",
      !!V.saveVenue("the-crown", { priceCents: "4900" }).error,
      'Number("4900") is a valid integer — typeof is what stops this');
check("a float price is refused", !!V.saveVenue("the-crown", { priceCents: 49.5 }).error);
check("a real price is accepted", V.saveVenue("the-crown", { priceCents: 4900 }).venue.price_cents === 4900);

// --- going live starts the clock ONCE --------------------------------------------------------------
const live = V.saveVenue("the-crown", { status: "active" });
check("going active starts the clock", !!live.venue.started && !!live.venue.renews);
check("and sets renewal about a month out",
      Math.abs(live.venue.renews - (Date.now() + MONTH)) < DAY, String(live.venue.renews));

const startedAt = live.venue.started, renewsAt = live.venue.renews;
V.saveVenue("the-crown", { contactName: "Sam" });
const after = V.getVenue("the-crown");
check("EDITING an active venue does not restart the clock",
      after.started === startedAt && after.renews === renewsAt,
      "otherwise changing a phone number pushes their billing date forward a month");

// --- renewal advances from the DUE date, not from today ---------------------------------------------
// A payment three days late must not move billing three days later, every month, forever.
V.saveVenue("late-bar", { status: "active" });
const lb = V.getVenue("late-bar");
S.db.prepare("UPDATE venues SET renews=? WHERE slug='late-bar'").run(Date.now() - 3 * DAY);
const renewed = V.renewVenue("late-bar", Date.now());
const drift = Math.abs(renewed.venue.renews - (Date.now() - 3 * DAY + MONTH));
check("a late payment renews from the DUE date, not from today", drift < DAY,
      `drifted ${Math.round(drift / DAY)} days`);
check("renewing an unknown venue errors", !!V.renewVenue("nope").error);

// A trial that pays becomes active.
V.saveVenue("trial-pub", { status: "trial", priceCents: 3900 });
V.renewVenue("trial-pub");
check("paying converts a trial to active", V.getVenue("trial-pub").status === "active");

// Very overdue: catch up, do not stack a backlog of missed months.
V.saveVenue("ghost-inn", { status: "active" });
S.db.prepare("UPDATE venues SET renews=? WHERE slug='ghost-inn'").run(Date.now() - 5 * MONTH);
const caught = V.renewVenue("ghost-inn");
check("a very overdue venue catches up to the future, not to five months ago",
      caught.venue.renews > Date.now(), String(caught.venue.renews));

// --- MRR counts money that is ACTUALLY BEING PAID ----------------------------------------------------
V.saveVenue("maybe-cafe", { status: "trial", priceCents: 9900 });
V.saveVenue("gone-club", { status: "churned", priceCents: 9900 });
const sum = V.venueSummary();
check("summary is derived", sum.ready === true);
const activeCents = V.listVenues({ status: "active" }).venues.reduce((a, v) => a + (v.price_cents || 0), 0);
check("MRR counts ACTIVE venues only", sum.mrrCents === activeCents, `${sum.mrrCents} vs ${activeCents}`);
check("a trial is NOT in MRR", sum.mrrCents < activeCents + 9900,
      "a trial in MRR is revenue that has not happened");
check("a churned venue is NOT in MRR", !String(sum.mrrCents).includes("NaN") && sum.byStatus.churned === 1);

// --- revenue and usage are QUERIES, not stored columns -------------------------------------------------
S.db.prepare(`INSERT INTO payments (id,brand_slug,kind,source,amount_cents,currency,status,occurred,created)
              VALUES ('p1','the-crown','charge','stripe',4900,'usd','succeeded',?,?)`).run(Date.now(), Date.now());
S.db.prepare(`INSERT INTO game_sessions (id,room_code,game,brand_slug,started,peak_players,completed)
              VALUES ('s1','AAAA','trivia','the-crown',?,12,1)`).run(Date.now());
const crown = V.listVenues({}).venues.find((v) => v.slug === "the-crown");
check("venue revenue comes from the payments ledger", crown.revenue_cents === 4900, String(crown.revenue_cents));
check("venue nights come from the session table", crown.nights === 1, String(crown.nights));
check("and their biggest room too", crown.biggest === 12, String(crown.biggest));
check("a venue with no activity reports zero, not null",
      V.listVenues({}).venues.find((v) => v.slug === "gone-club").revenue_cents === 0);

// --- a venue is never deleted ---------------------------------------------------------------------------
check("churning keeps the row, so its payments and nights still resolve",
      !!V.getVenue("gone-club"), "deleting it would orphan real history");

// --- overdue is visible --------------------------------------------------------------------------------
S.db.prepare("UPDATE venues SET renews=? WHERE slug='maybe-cafe'").run(Date.now() - DAY);
check("an overdue venue is counted", V.venueSummary().overdue >= 1);

console.log(fails ? `\n${fails} FAILED` : "\nall venue checks passed");
process.exit(fails ? 1 : 0);
