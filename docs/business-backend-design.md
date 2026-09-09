# PlayZoo business backend — target design

The owner's brief: *"a backend system that can handle a full operation for our brand/business
structure."* This is the target shape, written before any code, because the money and activity
tables are the ones you cannot fix later — **you cannot backfill a payment you never recorded or a
game night that was never written down.**

Nothing here is invented. Every business fact is cited to the file that already states it. The
things I genuinely do not know are collected in §7 as decisions for the owner, not guesses.

---

## 1. What exists today — verified, not assumed

**Nine tables** (`apps/server/sqlite.js`): `backers`, `backer_codes`, `subscriptions`, `users`,
`brand_owners`, `brands`, `messages`, `events`, `meta`.

**`/founder`** — seven cards: codes list, mint, backers list, backer detail, subscriptions (manual
grant), audit log, game pass.

**`/admin`** — brand theming only: colours, fonts, product name, game labels.

**What already works and should not be rebuilt:** the append-only `events` table and `logEvent()`
(§3.1 of the constitution, honoured); the SQLite layer with real migrations and `ensureColumn()`;
the entitlement model that DERIVES expiry rather than trusting a status column; Stripe signature
verification; the constant-time admin guard.

---

## 2. The gaps, with evidence

### 2.1 No money is recorded anywhere — CRITICAL

`subscriptions` (sqlite.js:56) stores `plan`, `status`, `stripe_sub_id`, `current_period_end`. There
is **no amount, no currency, no invoice, no refund, no payment date**. The question *"how much have
we taken this month"* cannot be answered from this database at all.

Worse, it is not recoverable: a status column overwrites itself. A backer who paid, refunded, and
resubscribed leaves exactly one row that looks like a single active subscription.

### 2.2 No game session is ever written down — CRITICAL

Rooms live in a `Map` in memory (`apps/server/index.js`) and vanish on restart. Nothing records that
a game night happened, which game, how many players, or how long.

Consequences: no engagement data, no way to show a venue what their night produced, no usage to
price white-label on, and no way to answer "which of the fourteen games do people actually play" —
which is the single most valuable thing to know when deciding what to build next.

### 2.3 Custom characters are promised but not tracked — CRITICAL BEFORE FULFILMENT

`productKnowledge.js:97-99` — Founding Animal ($30) includes **one** custom animal character,
Head Keeper ($50) includes **two**. `entitlementsFor()` computes a `customCharacters` NUMBER, but
nothing records whether a character has been briefed, drawn, approved or delivered.

The campaign FAQ now says these arrive within one month of the campaign closing. There is currently
no list of who is owed what.

### 2.4 `brands` is a theme, not a customer

`brands` holds colours, fonts and labels. A venue as a BUSINESS has none of it: no contact, no
contract dates, no plan, no billing, no per-venue game access, no usage. The campaign sells this
directly (`kickstarter/body.html`, block 10: *"Bars, weddings, launches, and office parties… a fully
branded PlayZoo"*), so today the product can be themed for a venue but not sold to one.

### 2.5 One shared passcode, so the audit log cannot attribute

Recorded in `docs/handover/2026-09-09-admin-audit.md` §5: an admin renaming a backer writes the same
`backer.update` event as the backer renaming themselves. With a shared passcode there is no admin
identity to record even if we wanted to.

### 2.6 No exports

Nothing produces a CSV. Accounting, tax and any conversation with a bookkeeper currently means
reading the screen.

---

## 3. Design principles (from the constitution, not invented here)

1. **Money and activity are append-only facts.** §3.1: events are immutable; state is derived by
   replaying them. A payment is a fact that happened; "revenue this month" is a QUERY, never a
   stored number that can drift.
2. **Never store what can be derived.** Already honoured by `entitlementsFor()` deriving expiry;
   the same rule applies to balances, MRR and usage counts.
3. **Every table earns its migration.** `ensureColumn()` exists because `CREATE TABLE IF NOT EXISTS`
   will not add a column to a live database.
4. **Fail safe, degrade honestly.** The founder page now says "Database unavailable" rather than
   "No backers yet". Every new surface inherits that rule.
5. **Understanding precedes solving.** This document exists because §0 requires it.

---

## 4. Target data model

New tables. Existing ones are extended, never replaced.

### 4.1 `payments` — the money ledger (append-only)

Every charge, refund and payout line as an immutable row. Written by the Stripe webhook, which is
already the single door (`applyStripeEvent()`), plus manual rows for Kickstarter money that never
touches Stripe.

```
id                TEXT PRIMARY KEY     -- our id
backer_id         TEXT                 -- nullable: venue payments have no backer
brand_slug        TEXT                 -- nullable: consumer payments have no venue
kind              TEXT NOT NULL        -- charge | refund | chargeback | payout | manual
source            TEXT NOT NULL        -- stripe | kickstarter | bank | comp
amount_cents      INTEGER NOT NULL     -- ALWAYS minor units, NEVER a float
currency          TEXT NOT NULL        -- 'usd'
status            TEXT NOT NULL        -- succeeded | pending | failed | refunded
stripe_event_id   TEXT UNIQUE          -- idempotency: a replayed webhook cannot double-count
stripe_object_id  TEXT                 -- pi_… / ch_… / in_…
description       TEXT
occurred          INTEGER NOT NULL     -- when it happened at the SOURCE, not when we saw it
created           INTEGER NOT NULL
```

Why `amount_cents` as an integer: floats cannot represent money. Why `stripe_event_id UNIQUE`:
Stripe retries webhooks, and without this a retry books the same charge twice.
Why `occurred` separate from `created`: a webhook that arrives late must not land in the wrong month.

**Refunds are new rows with a negative amount, never an edit.** Revenue = `SUM(amount_cents)`.

### 4.2 `game_sessions` and `game_players` — what actually happened

```
game_sessions
  id             TEXT PRIMARY KEY
  room_code      TEXT NOT NULL
  game           TEXT NOT NULL      -- codenames | murder | trivia | …
  brand_slug     TEXT               -- which venue's branding was live, if any
  host_backer_id TEXT               -- nullable: hosts may be anonymous
  started        INTEGER NOT NULL
  ended          INTEGER            -- null while live
  player_count   INTEGER NOT NULL DEFAULT 0
  completed      INTEGER NOT NULL DEFAULT 0   -- reached an ending vs abandoned

game_players
  session_id     TEXT NOT NULL
  player_name    TEXT
  backer_id      TEXT               -- nullable: players scan a QR with no account
  joined         INTEGER NOT NULL
```

Deliberately thin. Players join by QR with **no account** — that is a product decision recorded in
the entitlement work — so this must never require identity. It answers: which games get played, how
big are the rooms, do people finish, and which venue produced the night.

### 4.3 `fulfilment` — what we owe people

```
id           TEXT PRIMARY KEY
backer_id    TEXT NOT NULL
kind         TEXT NOT NULL     -- custom-character | physical | other
title        TEXT              -- e.g. "Custom character 1 of 2"
status       TEXT NOT NULL     -- owed | briefed | in-progress | review | delivered | cancelled
due          INTEGER           -- the one-month promise, per the FAQ
notes        TEXT
asset_path   TEXT              -- where the finished art landed
created      INTEGER NOT NULL
updated      INTEGER NOT NULL
```

Rows are created from the tier at purchase: Founding Animal → 1, Head Keeper → 2. This is the list
that answers "who is still owed a character", which today does not exist.

### 4.4 `venues` — a brand as a customer

`brands` keeps the theming. `venues` carries the business, keyed by the same slug.

```
slug            TEXT PRIMARY KEY   -- FK to brands.slug
legal_name      TEXT
contact_name    TEXT
contact_email   TEXT
plan            TEXT               -- see §7, the pricing is the owner's to set
status          TEXT NOT NULL      -- prospect | trial | active | paused | churned
started         INTEGER
renews          INTEGER
notes           TEXT
created         INTEGER NOT NULL
updated         INTEGER NOT NULL
```

### 4.5 `staff` — named access

```
id            TEXT PRIMARY KEY
email         TEXT UNIQUE NOT NULL
name          TEXT
role          TEXT NOT NULL      -- owner | admin | support | readonly
pw_salt       TEXT
pw_hash       TEXT
active        INTEGER NOT NULL DEFAULT 1
created       INTEGER NOT NULL
last_seen     INTEGER
```

`events` gains `actor_staff_id`, so the audit log can finally name who acted. The shared passcode
survives as an owner-only override so you can never lock yourself out.

---

## 5. Admin surfaces

`/founder` becomes tabbed rather than one long scroll:

| Tab | Contents |
|---|---|
| **Money** | Taken / refunded / net, this month vs last, active plans by tier, MRR, recent payments, CSV export |
| **People** | Backers (existing), codes (existing), subscriptions (existing), plus what each is owed |
| **Fulfilment** | The queue of owed custom characters by status and due date — the one-month promise, tracked |
| **Venues** | Venue list and detail, contract dates, their branding, their sessions |
| **Activity** | Game sessions: which games, how many players, completion rate, by day and by venue |
| **Audit** | Existing event log, now with a named actor |
| **Settings** | Staff accounts, game gate, founder pass, Stripe config, legacy report |

Every list gets CSV export. Every panel honours the `ready` flag and says "Database unavailable"
rather than showing a confident zero.

---

## 6. Phases, in this order and for this reason

**Phase 1 — the money ledger.** `payments`, the webhook writing into it, the Money tab, CSV export.
*First because it is the only gap actively losing data: every day without it is a day of payment
history that cannot be reconstructed, and the Kickstarter is imminent.*

**Phase 2 — fulfilment.** `fulfilment`, rows created from tiers, the queue screen.
*Second because it is a promise already made in public with a one-month deadline, and it becomes
urgent the moment the campaign closes.*

**Phase 3 — activity.** `game_sessions`, `game_players`, the Activity tab.
*Third because it is also unrecoverable, but no game nights are being lost while the gate is shut.*

**Phase 4 — venues.** `venues`, venue detail, per-venue access and sessions.
*Fourth because it needs Phase 1 (billing) and Phase 3 (usage) to be worth anything.*

**Phase 5 — staff and roles.** `staff`, named login, `actor_staff_id` on events.
*Last because it adds no business capability while the owner is the only user — unless someone else
is getting access sooner, in which case it moves to first.*

---

## 7. Decisions for the owner — I will not guess these

1. **White-label pricing.** Per event, monthly, or annual licence? This sets `venues.plan` and how
   billing works. It is a fact about the business, not a technical choice.
2. **Post-Kickstarter consumer pricing.** The three tiers are Kickstarter REWARDS. Whether they
   become recurring subscriptions at the same prices, or a different retail price, decides whether
   `subscriptions` needs a price history.
3. **Kickstarter money.** It arrives via Kickstarter/Stripe Connect, not our own Stripe. Should it
   be imported into `payments` as `source='kickstarter'` so one number covers all revenue?
4. **Staff.** Is anyone else getting access in the next few months? If yes, Phase 5 moves first.
5. **Refund policy.** Whether a refund revokes entitlements immediately or at period end changes
   `applyStripeEvent()`.

---

## 8. What this does NOT include, deliberately

Email/marketing automation, a support ticket system, an affiliate scheme, and multi-currency. Each
is a real product in its own right, none is needed to run the business at its current size, and each
would slow the five phases above. Worth revisiting once venues are actually selling.
